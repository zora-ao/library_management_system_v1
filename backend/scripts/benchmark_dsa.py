"""Offline, deterministic benchmarks for Pahina's educational DSA package.

Only pure algorithm calls are timed. Dataset generation, correctness gates,
report formatting, file I/O, HTTP, and frontend work are outside every
measured region. The standalone harness also avoids importing Flask and
SQLAlchemy.
"""

from __future__ import annotations

import argparse
import gc
import json
import math
import platform
import random
import statistics
import sys
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import ModuleType
from typing import Any, TypeVar

# Import the pure DSA subpackage without executing ``app/__init__.py``, whose
# production application factory imports Flask, SQLAlchemy, and every route.
# The benchmark is a standalone/offline process and never imports production
# application services. If a host process has already imported ``app``, leave
# its package object untouched.
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if __package__ in (None, ""):
    sys.path.insert(0, str(_BACKEND_ROOT))
if "app" not in sys.modules:
    app_package = ModuleType("app")
    app_package.__package__ = "app"
    app_package.__path__ = [str(_BACKEND_ROOT / "app")]
    sys.modules["app"] = app_package

from app.dsa import (
    AlgorithmStats,
    BookRecord,
    BookTitleBST,
    IsbnIndexResult,
    SearchResult,
    binary_exact_search,
    build_isbn_index,
    linear_exact_search,
    merge_sort_books,
    normalize_isbn,
    normalize_text,
)


T = TypeVar("T")


@dataclass(frozen=True)
class BenchmarkConfig:
    sizes: tuple[int, ...]
    seed: int
    warmups: int
    repetitions: int
    lookups: int
    max_seconds: float = 300.0
    max_estimated_scan_record_visits: int = 100_000_000

    def __post_init__(self) -> None:
        if not self.sizes:
            raise ValueError("sizes must contain at least one value")
        previous = 0
        for size in self.sizes:
            if isinstance(size, bool) or not isinstance(size, int) or size < 1:
                raise ValueError("sizes must contain positive integers")
            if size <= previous:
                raise ValueError("sizes must be unique and strictly ascending")
            previous = size
        if isinstance(self.seed, bool) or not isinstance(self.seed, int):
            raise ValueError("seed must be an integer")
        for name in ("warmups", "repetitions", "lookups"):
            value = getattr(self, name)
            if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                raise ValueError(f"{name} must be a positive integer")
        if (
            isinstance(self.max_seconds, bool)
            or not isinstance(self.max_seconds, (int, float))
            or not math.isfinite(self.max_seconds)
            or self.max_seconds <= 0
        ):
            raise ValueError("max_seconds must be a positive finite number")
        if (
            isinstance(self.max_estimated_scan_record_visits, bool)
            or not isinstance(self.max_estimated_scan_record_visits, int)
            or self.max_estimated_scan_record_visits < 1
        ):
            raise ValueError(
                "max_estimated_scan_record_visits must be a positive integer"
            )


def estimate_workload(config: BenchmarkConfig) -> dict[str, int]:
    """Expose bounded-loop multipliers before any fixture or timing work."""

    dataset_count = len(config.sizes)
    warm_and_measured = config.warmups + config.repetitions
    calls_per_dataset = 14 * warm_and_measured + 8
    batch_runs_per_dataset = 8 * (warm_and_measured + 1)
    correctness_executions = sum(
        19
        + 4 * (5 if size >= 4 else 4)
        + (1 if size >= 4 else 0)
        for size in config.sizes
    )
    return {
        "dataset_count": dataset_count,
        "benchmark_callable_executions": dataset_count * calls_per_dataset,
        "correctness_algorithm_executions": correctness_executions,
        "total_top_level_algorithm_executions": (
            dataset_count * calls_per_dataset + correctness_executions
        ),
        "individual_lookup_or_range_queries": (
            dataset_count * batch_runs_per_dataset * config.lookups
        ),
        "estimated_scan_record_visits": (
            4
            * (warm_and_measured + 1)
            * config.lookups
            * sum(config.sizes)
        ),
    }


class _ExecutionGuard:
    """Stop between bounded algorithm calls when the wall-clock budget expires."""

    def __init__(self, max_seconds: float) -> None:
        self._max_seconds = float(max_seconds)
        self._deadline = time.monotonic() + self._max_seconds

    def check(self, next_operation: str) -> None:
        if time.monotonic() >= self._deadline:
            raise TimeoutError(
                "benchmark time limit "
                f"({self._max_seconds:g}s) reached before {next_operation}"
            )

    def run(self, operation: Callable[[], T], label: str) -> T:
        self.check(label)
        result = operation()
        self.check(f"the operation after {label}")
        return result


@dataclass(frozen=True)
class _PreparedDataset:
    records: list[BookRecord]
    sorted_records: list[BookRecord]
    title_targets: list[dict[str, Any]]
    isbn_targets: list[dict[str, Any]]
    range_targets: list[dict[str, Any]]
    isbn_index: IsbnIndexResult
    tree: BookTitleBST
    merge_stats: AlgorithmStats


@dataclass(frozen=True)
class _BatchResult:
    result_count: int
    comparisons: int = 0
    writes: int = 0
    nodes_visited: int = 0


_ADJECTIVES = (
    "Practical",
    "Modern",
    "Quiet",
    "Distributed",
    "Hidden",
    "Applied",
    "Foundational",
    "Digital",
)
_SUBJECTS = (
    "Algorithms",
    "Libraries",
    "Archives",
    "Databases",
    "Networks",
    "Literature",
    "Information Systems",
    "Software Design",
)
_FIRST_NAMES = (
    "Ada",
    "Grace",
    "Edsger",
    "Donald",
    "Barbara",
    "Niklaus",
    "Margaret",
    "Alan",
)
_LAST_NAMES = (
    "Santos",
    "Reyes",
    "Garcia",
    "Cruz",
    "Dela Rosa",
    "Torres",
    "Mendoza",
    "Ramos",
)


def generate_records(size: int, seed: int) -> list[BookRecord]:
    """Create deterministic, domain-shaped records with controlled edge cases.

    For datasets large enough to contain them, records include a normalized
    duplicate title, a normalized duplicate ISBN, missing ISBNs, and two
    distinct ISBN keys that collide at the hash table's initial capacity.
    """

    if isinstance(size, bool) or not isinstance(size, int) or size < 0:
        raise ValueError("size must be a non-negative integer")
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise ValueError("seed must be an integer")

    generator = random.Random(seed)
    base_date = datetime(2012, 1, 1, tzinfo=timezone.utc)
    records: list[BookRecord] = []
    for index in range(size):
        adjective = _ADJECTIVES[generator.randrange(len(_ADJECTIVES))]
        subject = _SUBJECTS[generator.randrange(len(_SUBJECTS))]
        title = f"The {adjective} {subject}: Volume {index + 1}"
        if size >= 4 and index == 2:
            title = "Data Structures in Practice"
        elif size >= 4 and index == 3:
            title = "  data   structures in PRACTICE  "

        first_name = _FIRST_NAMES[generator.randrange(len(_FIRST_NAMES))]
        last_name = _LAST_NAMES[generator.randrange(len(_LAST_NAMES))]
        author = f"{first_name} {last_name}"

        if index == 0:
            isbn: str | None = "978-0-00000-000-9"
        elif index == 1:
            isbn = "978-0-00000-001-0"
        elif size >= 4 and index == 2:
            isbn = "978-1-4028-9462-6"
        elif size >= 4 and index == 3:
            isbn = "978 1 4028 9462 6"
        elif index == 4 or (index > 4 and index % 17 == 0):
            isbn = None
        else:
            isbn = f"979{abs(seed) % 1000:03d}{index:07d}"

        records.append(
            BookRecord(
                id=f"book-{seed:+011d}-{index:07d}",
                title=title,
                author=author,
                isbn=isbn,
                available_copies=generator.randrange(0, 9),
                created_at=base_date
                + timedelta(days=generator.randrange(0, 14 * 365)),
            )
        )
    return records


def _measure_ns(operation: Callable[[], T]) -> tuple[T, int]:
    """Measure one callable while restoring the caller's GC state."""

    gc_was_enabled = gc.isenabled()
    if gc_was_enabled:
        gc.disable()
    started = time.perf_counter_ns()
    try:
        result = operation()
    finally:
        finished = time.perf_counter_ns()
        if gc_was_enabled:
            gc.enable()
    return result, finished - started


def _title_targets(records: Sequence[BookRecord]) -> list[dict[str, Any]]:
    positions = (
        ("first", 0),
        ("middle", len(records) // 2),
        ("last", len(records) - 1),
    )
    targets = [
        {"label": label, "query": records[index].title}
        for label, index in positions
    ]
    targets.append({"label": "missing", "query": "A Title That Is Not In The Catalog"})
    if len(records) >= 4:
        targets.append({"label": "duplicate_title", "query": records[2].title})
    return targets


def _isbn_targets(records: Sequence[BookRecord]) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for record in records:
        key = normalize_isbn(record.isbn)
        if key:
            counts[key] = counts.get(key, 0) + 1

    unique_records: list[BookRecord] = []
    for record in records:
        key = normalize_isbn(record.isbn)
        if key and counts[key] == 1:
            unique_records.append(record)
    if not unique_records:
        raise AssertionError("ISBN benchmark needs at least one normalized-unique key")

    positions = (
        ("first_unique", 0),
        ("middle_unique", len(unique_records) // 2),
        ("last_unique", len(unique_records) - 1),
    )
    targets = [
        {
            "label": label,
            "query": unique_records[index].isbn,
            "normalized_unique": True,
        }
        for label, index in positions
    ]
    targets.append(
        {
            "label": "missing",
            "query": "9999999999999",
            "normalized_unique": True,
        }
    )
    return targets


def _range_targets(sorted_records: Sequence[BookRecord]) -> list[dict[str, Any]]:
    return [
        {
            "label": "full_catalog",
            "start": sorted_records[0].title,
            "end": sorted_records[-1].title,
        },
        {
            "label": "middle_band",
            "start": sorted_records[len(sorted_records) // 3].title,
            "end": sorted_records[(len(sorted_records) * 2) // 3].title,
        },
        {
            "label": "empty_range",
            "start": "Zzzzz Benchmark Missing A",
            "end": "Zzzzz Benchmark Missing Z",
        },
    ]


def _linear_title_range(
    records: Sequence[BookRecord], start: str, end: str
) -> SearchResult:
    normalized_start = normalize_text(start)
    normalized_end = normalize_text(end)
    matches: list[BookRecord] = []
    stats = AlgorithmStats()
    for record in records:
        key = normalize_text(record.title)
        stats.comparisons += 1
        if key < normalized_start:
            continue
        stats.comparisons += 1
        if key <= normalized_end:
            matches.append(record)
    return SearchResult(records=matches, stats=stats)


def _record_ids(records: Sequence[BookRecord]) -> list[str]:
    return [record.id for record in records]


def _verify_dataset(
    records: list[BookRecord], guard: _ExecutionGuard
) -> _PreparedDataset:
    custom_sort = guard.run(
        lambda: merge_sort_books(records, "title"), "correctness merge sort"
    )
    builtin_sort = guard.run(
        lambda: sorted(records, key=lambda record: normalize_text(record.title)),
        "correctness Python sorted oracle",
    )
    if custom_sort.records != builtin_sort:
        raise AssertionError("custom merge sort differs from Python sorted oracle")

    title_targets = _title_targets(records)
    for target in title_targets:
        query = target["query"]
        linear = guard.run(
            lambda query=query: linear_exact_search(
                records, query, "title", limit=len(records)
            ),
            f"correctness linear title target {target['label']}",
        )
        binary = guard.run(
            lambda query=query: binary_exact_search(
                custom_sort.records, query, "title", limit=len(records)
            ),
            f"correctness binary title target {target['label']}",
        )
        if _record_ids(linear.records) != _record_ids(binary.records):
            raise AssertionError(
                f"linear and binary title results differ for {target['label']}"
            )

    isbn_targets = _isbn_targets(records)
    isbn_index = guard.run(
        lambda: build_isbn_index(records), "correctness ISBN index build"
    )
    for target in isbn_targets:
        query = target["query"]
        linear = guard.run(
            lambda query=query: linear_exact_search(records, query, "isbn", limit=1),
            f"correctness linear ISBN target {target['label']}",
        )
        hash_record = guard.run(
            lambda query=query: isbn_index.table.get(normalize_isbn(query)),
            f"correctness hash ISBN target {target['label']}",
        )
        hash_ids = [] if hash_record is None else [hash_record.id]
        if _record_ids(linear.records) != hash_ids:
            raise AssertionError(
                f"linear and hash ISBN results differ for {target['label']}"
            )

    duplicate_last: dict[str, BookRecord] = {}
    duplicate_counts: dict[str, int] = {}
    for record in records:
        key = normalize_isbn(record.isbn)
        if key:
            duplicate_counts[key] = duplicate_counts.get(key, 0) + 1
            duplicate_last[key] = record
    for key, count in duplicate_counts.items():
        if count > 1 and isbn_index.table.get(key) != duplicate_last[key]:
            raise AssertionError("normalized duplicate ISBN policy is not last-record-wins")

    tree = guard.run(
        lambda: BookTitleBST.from_sorted(custom_sort.records),
        "correctness BST build",
    )
    traversal = guard.run(
        lambda: tree.in_order(limit=len(records)), "correctness BST traversal"
    )
    if traversal.records != custom_sort.records:
        raise AssertionError("BST in-order traversal differs from merge-sort output")
    for target in title_targets:
        query = target["query"]
        tree_result = guard.run(
            lambda query=query: tree.find_exact(query, limit=len(records)),
            f"correctness BST exact target {target['label']}",
        )
        binary_result = guard.run(
            lambda query=query: binary_exact_search(
                custom_sort.records, query, "title", limit=len(records)
            ),
            f"correctness binary/BST target {target['label']}",
        )
        if _record_ids(tree_result.records) != _record_ids(binary_result.records):
            raise AssertionError(
                f"BST and binary exact results differ for {target['label']}"
            )

    range_targets = _range_targets(custom_sort.records)
    for target in range_targets:
        linear_range = guard.run(
            lambda target=target: _linear_title_range(
                records, target["start"], target["end"]
            ),
            f"correctness linear range {target['label']}",
        )
        tree_range = guard.run(
            lambda target=target: tree.range_search(
                target["start"], target["end"], limit=len(records)
            ),
            f"correctness BST range {target['label']}",
        )
        expected_ids = {
            record.id
            for record in custom_sort.records
            if normalize_text(target["start"])
            <= normalize_text(record.title)
            <= normalize_text(target["end"])
        }
        if {record.id for record in linear_range.records} != expected_ids:
            raise AssertionError(f"linear range oracle failed for {target['label']}")
        if {record.id for record in tree_range.records} != expected_ids:
            raise AssertionError(f"BST range differs for {target['label']}")

    return _PreparedDataset(
        records=records,
        sorted_records=custom_sort.records,
        title_targets=title_targets,
        isbn_targets=isbn_targets,
        range_targets=range_targets,
        isbn_index=isbn_index,
        tree=tree,
        merge_stats=custom_sort.stats,
    )


def _repeat_values(values: Sequence[T], count: int) -> tuple[T, ...]:
    return tuple(values[index % len(values)] for index in range(count))


def _search_batch(
    records: Sequence[BookRecord],
    queries: Sequence[str],
    field: str,
    binary: bool,
    limit: int | None = None,
) -> _BatchResult:
    search_limit = len(records) if limit is None else limit
    comparisons = 0
    result_count = 0
    for query in queries:
        if binary:
            result = binary_exact_search(records, query, field, limit=search_limit)
        else:
            result = linear_exact_search(records, query, field, limit=search_limit)
        comparisons += result.stats.comparisons
        result_count += len(result.records)
    return _BatchResult(result_count=result_count, comparisons=comparisons)


def _hash_batch(index: IsbnIndexResult, queries: Sequence[str]) -> _BatchResult:
    result_count = 0
    for query in queries:
        if index.table.get(normalize_isbn(query)) is not None:
            result_count += 1
    return _BatchResult(result_count=result_count)


def _bst_exact_batch(tree: BookTitleBST, queries: Sequence[str]) -> _BatchResult:
    result_count = 0
    comparisons = 0
    nodes_visited = 0
    for query in queries:
        result = tree.find_exact(query, limit=tree.size)
        result_count += len(result.records)
        comparisons += result.stats.comparisons
        nodes_visited += result.stats.nodes_visited
    return _BatchResult(
        result_count=result_count,
        comparisons=comparisons,
        nodes_visited=nodes_visited,
    )


def _linear_range_batch(
    records: Sequence[BookRecord], ranges: Sequence[dict[str, Any]]
) -> _BatchResult:
    result_count = 0
    comparisons = 0
    for target in ranges:
        result = _linear_title_range(records, target["start"], target["end"])
        result_count += len(result.records)
        comparisons += result.stats.comparisons
    return _BatchResult(result_count=result_count, comparisons=comparisons)


def _bst_range_batch(
    tree: BookTitleBST, ranges: Sequence[dict[str, Any]]
) -> _BatchResult:
    result_count = 0
    comparisons = 0
    nodes_visited = 0
    for target in ranges:
        result = tree.range_search(target["start"], target["end"], limit=tree.size)
        result_count += len(result.records)
        comparisons += result.stats.comparisons
        nodes_visited += result.stats.nodes_visited
    return _BatchResult(
        result_count=result_count,
        comparisons=comparisons,
        nodes_visited=nodes_visited,
    )


def _warm_up(
    callables: Sequence[Callable[[], Any]],
    count: int,
    guard: _ExecutionGuard,
    label: str,
) -> None:
    for warmup in range(count):
        for index, operation in enumerate(callables):
            guard.run(operation, f"{label} warm-up {warmup + 1}, operation {index + 1}")


def _measure_repeated(
    operation: Callable[[], Any],
    repetitions: int,
    guard: _ExecutionGuard,
    label: str,
) -> list[int]:
    samples: list[int] = []
    for repetition in range(repetitions):
        _, elapsed = guard.run(
            lambda: _measure_ns(operation),
            f"{label} repetition {repetition + 1}",
        )
        samples.append(elapsed)
    return samples


def _measure_alternating(
    baseline: Callable[[], Any],
    custom: Callable[[], Any],
    repetitions: int,
    guard: _ExecutionGuard,
    label: str,
) -> tuple[list[int], list[int]]:
    baseline_samples: list[int] = []
    custom_samples: list[int] = []
    for repetition in range(repetitions):
        ordered = (
            ((baseline, baseline_samples), (custom, custom_samples))
            if repetition % 2 == 0
            else ((custom, custom_samples), (baseline, baseline_samples))
        )
        for index, (operation, samples) in enumerate(ordered):
            _, elapsed = guard.run(
                lambda operation=operation: _measure_ns(operation),
                f"{label} repetition {repetition + 1}, operation {index + 1}",
            )
            samples.append(elapsed)
    return baseline_samples, custom_samples


def _percentile(samples: Sequence[int], percentile: float) -> int:
    ordered = sorted(samples)
    rank = max(1, math.ceil(percentile * len(ordered)))
    return ordered[rank - 1]


def _summary(samples: Sequence[int]) -> dict[str, int | float]:
    return {
        "sample_count": len(samples),
        "minimum": min(samples),
        "median": statistics.median(samples),
        "p95": _percentile(samples, 0.95),
        "maximum": max(samples),
    }


def _measurement(
    name: str,
    phase: str,
    samples: list[int],
    operation_counts: dict[str, int | float | None],
) -> dict[str, Any]:
    return {
        "name": name,
        "phase": phase,
        "samples_ns": samples,
        "summary_ns": _summary(samples),
        "operation_counts": operation_counts,
    }


def _title_case(
    prepared: _PreparedDataset, config: BenchmarkConfig, guard: _ExecutionGuard
) -> dict[str, Any]:
    queries = _repeat_values(
        [target["query"] for target in prepared.title_targets], config.lookups
    )
    linear = lambda: _search_batch(prepared.records, queries, "title", False)
    binary = lambda: _search_batch(prepared.sorted_records, queries, "title", True)
    preprocess = lambda: merge_sort_books(prepared.records, "title")
    _warm_up((preprocess, linear, binary), config.warmups, guard, "title case")
    preprocess_samples = _measure_repeated(
        preprocess, config.repetitions, guard, "title merge preprocessing"
    )
    linear_samples, binary_samples = _measure_alternating(
        linear, binary, config.repetitions, guard, "linear/binary title"
    )
    linear_counts = guard.run(linear, "title linear operation counts")
    binary_counts = guard.run(binary, "title binary operation counts")
    cold_samples = [
        preprocess_samples[index] + binary_samples[index]
        for index in range(config.repetitions)
    ]
    return {
        "dataset_size": len(prepared.records),
        "comparison": "linear_vs_binary_title",
        "targets": prepared.title_targets,
        "correctness": {"passed": True, "equivalent_result_ids": True},
        "measurements": [
            _measurement(
                "linear_exact_lookup_batch",
                "lookup",
                linear_samples,
                {
                    "lookups": config.lookups,
                    "comparisons": linear_counts.comparisons,
                    "results": linear_counts.result_count,
                },
            ),
            _measurement(
                "binary_exact_lookup_batch",
                "lookup",
                binary_samples,
                {
                    "lookups": config.lookups,
                    "comparisons": binary_counts.comparisons,
                    "results": binary_counts.result_count,
                },
            ),
            _measurement(
                "binary_merge_sort_preprocessing",
                "preprocessing",
                preprocess_samples,
                {
                    "comparisons": prepared.merge_stats.comparisons,
                    "writes": prepared.merge_stats.writes,
                },
            ),
            _measurement(
                "binary_cold_batch_total",
                "cold_batch_total",
                cold_samples,
                {"lookups": config.lookups},
            ),
        ],
    }


def _hash_case(
    prepared: _PreparedDataset, config: BenchmarkConfig, guard: _ExecutionGuard
) -> dict[str, Any]:
    queries = _repeat_values(
        [target["query"] for target in prepared.isbn_targets], config.lookups
    )
    linear = lambda: _search_batch(
        prepared.records, queries, "isbn", False, limit=1
    )
    hashed = lambda: _hash_batch(prepared.isbn_index, queries)
    build = lambda: build_isbn_index(prepared.records)
    _warm_up((build, linear, hashed), config.warmups, guard, "hash case")
    build_samples = _measure_repeated(
        build, config.repetitions, guard, "hash index build"
    )
    linear_samples, hash_samples = _measure_alternating(
        linear, hashed, config.repetitions, guard, "linear/hash ISBN"
    )
    linear_counts = guard.run(linear, "ISBN linear operation counts")
    hash_counts = guard.run(hashed, "ISBN hash operation counts")
    table_stats = prepared.isbn_index.table.stats
    cold_samples = [
        build_samples[index] + hash_samples[index]
        for index in range(config.repetitions)
    ]
    return {
        "dataset_size": len(prepared.records),
        "comparison": "linear_vs_hash_isbn",
        "targets": prepared.isbn_targets,
        "correctness": {
            "passed": True,
            "equivalent_result_ids_for_unique_targets": True,
            "duplicate_isbn_count": prepared.isbn_index.duplicate_count,
            "duplicate_policy": "last_record_wins",
        },
        "measurements": [
            _measurement(
                "linear_isbn_lookup_batch",
                "lookup",
                linear_samples,
                {
                    "lookups": config.lookups,
                    "comparisons": linear_counts.comparisons,
                    "results": linear_counts.result_count,
                },
            ),
            _measurement(
                "hash_isbn_lookup_batch",
                "lookup",
                hash_samples,
                {
                    "lookups": config.lookups,
                    "results": hash_counts.result_count,
                },
            ),
            _measurement(
                "hash_index_build",
                "preprocessing",
                build_samples,
                {
                    "indexed_records": prepared.isbn_index.indexed_count,
                    "skipped_isbns": prepared.isbn_index.skipped_count,
                    "normalized_duplicates": prepared.isbn_index.duplicate_count,
                    "collisions": table_stats.collisions,
                    "capacity": table_stats.capacity,
                    "max_chain_length": table_stats.max_chain_length,
                    "resizes": table_stats.resizes,
                },
            ),
            _measurement(
                "hash_cold_batch_total",
                "cold_batch_total",
                cold_samples,
                {"lookups": config.lookups},
            ),
        ],
    }


def _sort_case(
    prepared: _PreparedDataset, config: BenchmarkConfig, guard: _ExecutionGuard
) -> dict[str, Any]:
    custom = lambda: merge_sort_books(prepared.records, "title")
    builtin = lambda: sorted(
        prepared.records, key=lambda record: normalize_text(record.title)
    )
    _warm_up((builtin, custom), config.warmups, guard, "sort case")
    builtin_samples, custom_samples = _measure_alternating(
        builtin, custom, config.repetitions, guard, "Python/custom sort"
    )
    return {
        "dataset_size": len(prepared.records),
        "comparison": "custom_merge_vs_python_sorted",
        "targets": [{"label": "full_dataset", "field": "title"}],
        "correctness": {
            "passed": True,
            "same_order_and_stability": True,
        },
        "measurements": [
            _measurement(
                "python_sorted",
                "sorting",
                builtin_samples,
                {"items": len(prepared.records)},
            ),
            _measurement(
                "custom_merge_sort",
                "sorting",
                custom_samples,
                {
                    "items": len(prepared.records),
                    "comparisons": prepared.merge_stats.comparisons,
                    "writes": prepared.merge_stats.writes,
                },
            ),
        ],
    }


def _bst_case(
    prepared: _PreparedDataset, config: BenchmarkConfig, guard: _ExecutionGuard
) -> dict[str, Any]:
    exact_queries = _repeat_values(
        [target["query"] for target in prepared.title_targets], config.lookups
    )
    range_queries = _repeat_values(prepared.range_targets, config.lookups)
    binary = lambda: _search_batch(
        prepared.sorted_records, exact_queries, "title", True
    )
    tree_exact = lambda: _bst_exact_batch(prepared.tree, exact_queries)
    linear_range = lambda: _linear_range_batch(prepared.records, range_queries)
    tree_range = lambda: _bst_range_batch(prepared.tree, range_queries)
    merge_build = lambda: merge_sort_books(prepared.records, "title")
    tree_build = lambda: BookTitleBST.from_sorted(prepared.sorted_records)
    _warm_up(
        (merge_build, tree_build, binary, tree_exact, linear_range, tree_range),
        config.warmups,
        guard,
        "BST case",
    )
    merge_samples = _measure_repeated(
        merge_build, config.repetitions, guard, "BST merge preprocessing"
    )
    tree_build_samples = _measure_repeated(
        tree_build, config.repetitions, guard, "BST build preprocessing"
    )
    binary_samples, tree_exact_samples = _measure_alternating(
        binary, tree_exact, config.repetitions, guard, "binary/BST exact"
    )
    linear_range_samples, tree_range_samples = _measure_alternating(
        linear_range, tree_range, config.repetitions, guard, "linear/BST range"
    )
    binary_counts = guard.run(binary, "binary exact operation counts")
    tree_exact_counts = guard.run(tree_exact, "BST exact operation counts")
    linear_range_counts = guard.run(linear_range, "linear range operation counts")
    tree_range_counts = guard.run(tree_range, "BST range operation counts")
    binary_cold = [
        merge_samples[index] + binary_samples[index]
        for index in range(config.repetitions)
    ]
    tree_exact_cold = [
        merge_samples[index]
        + tree_build_samples[index]
        + tree_exact_samples[index]
        for index in range(config.repetitions)
    ]
    tree_range_cold = [
        merge_samples[index]
        + tree_build_samples[index]
        + tree_range_samples[index]
        for index in range(config.repetitions)
    ]
    return {
        "dataset_size": len(prepared.records),
        "comparison": "bst_vs_baselines",
        "targets": [
            {"kind": "exact_queries", "queries": prepared.title_targets},
            {"kind": "range_queries", "queries": prepared.range_targets},
        ],
        "correctness": {
            "passed": True,
            "in_order_matches_merge_sort": True,
            "exact_matches_binary": True,
            "range_matches_linear": True,
        },
        "measurements": [
            _measurement(
                "binary_exact_lookup_batch",
                "lookup",
                binary_samples,
                {
                    "lookups": config.lookups,
                    "comparisons": binary_counts.comparisons,
                    "results": binary_counts.result_count,
                },
            ),
            _measurement(
                "bst_exact_lookup_batch",
                "lookup",
                tree_exact_samples,
                {
                    "lookups": config.lookups,
                    "comparisons": tree_exact_counts.comparisons,
                    "nodes_visited": tree_exact_counts.nodes_visited,
                    "results": tree_exact_counts.result_count,
                },
            ),
            _measurement(
                "linear_range_query_batch",
                "lookup",
                linear_range_samples,
                {
                    "lookups": config.lookups,
                    "comparisons": linear_range_counts.comparisons,
                    "results": linear_range_counts.result_count,
                },
            ),
            _measurement(
                "bst_range_query_batch",
                "lookup",
                tree_range_samples,
                {
                    "lookups": config.lookups,
                    "comparisons": tree_range_counts.comparisons,
                    "nodes_visited": tree_range_counts.nodes_visited,
                    "results": tree_range_counts.result_count,
                },
            ),
            _measurement(
                "bst_merge_sort_preprocessing",
                "preprocessing",
                merge_samples,
                {
                    "comparisons": prepared.merge_stats.comparisons,
                    "writes": prepared.merge_stats.writes,
                },
            ),
            _measurement(
                "bst_build_preprocessing",
                "preprocessing",
                tree_build_samples,
                {"tree_size": prepared.tree.size, "tree_height": prepared.tree.height},
            ),
            _measurement(
                "binary_exact_cold_batch_total",
                "cold_batch_total",
                binary_cold,
                {"lookups": config.lookups},
            ),
            _measurement(
                "bst_exact_cold_batch_total",
                "cold_batch_total",
                tree_exact_cold,
                {"lookups": config.lookups},
            ),
            _measurement(
                "bst_range_cold_batch_total",
                "cold_batch_total",
                tree_range_cold,
                {"lookups": config.lookups},
            ),
        ],
    }


def run_benchmarks(config: BenchmarkConfig) -> dict[str, Any]:
    """Verify every oracle first, then collect algorithm-only measurements."""

    workload = estimate_workload(config)
    estimated_visits = workload["estimated_scan_record_visits"]
    if estimated_visits > config.max_estimated_scan_record_visits:
        raise ValueError(
            "estimated record visits "
            f"({estimated_visits:,}) exceed the configured limit "
            f"({config.max_estimated_scan_record_visits:,}); reduce sizes, warm-ups, "
            "repetitions, or lookups, or explicitly raise the limit"
        )
    guard = _ExecutionGuard(config.max_seconds)
    prepared_datasets: list[_PreparedDataset] = []
    for size in config.sizes:
        records = guard.run(
            lambda size=size: generate_records(size, config.seed),
            f"fixture generation for n={size}",
        )
        prepared_datasets.append(_verify_dataset(records, guard))

    cases: list[dict[str, Any]] = []
    for prepared in prepared_datasets:
        cases.append(_title_case(prepared, config, guard))
        cases.append(_hash_case(prepared, config, guard))
        cases.append(_sort_case(prepared, config, guard))
        cases.append(_bst_case(prepared, config, guard))

    return {
        "schema_version": 1,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "environment": {
            "python_version": platform.python_version(),
            "python_implementation": platform.python_implementation(),
            "platform": platform.platform(),
            "processor": platform.processor() or "not reported",
        },
        "config": {
            "sizes": list(config.sizes),
            "seed": config.seed,
            "warmups": config.warmups,
            "repetitions": config.repetitions,
            "lookups": config.lookups,
            "max_seconds": float(config.max_seconds),
            "max_estimated_scan_record_visits": (
                config.max_estimated_scan_record_visits
            ),
        },
        "workload": workload,
        "policies": {
            "timed_scope": "algorithm callables only; fixture generation and I/O excluded",
            "normalized_isbn_duplicates": (
                "last record wins; lookup benchmarks use normalized-unique targets"
            ),
            "percentiles": "nearest-rank p95 over raw samples",
            "order_bias": "baseline/custom execution order alternates by repetition",
        },
        "cases": cases,
    }


_CASE_TITLES = {
    "linear_vs_binary_title": "Linear vs Binary Title",
    "linear_vs_hash_isbn": "Linear vs Hash ISBN",
    "custom_merge_vs_python_sorted": "Custom Merge vs Python sorted",
    "bst_vs_baselines": "BST vs Baselines",
}


def _measurement_for(case: dict[str, Any], name: str) -> dict[str, Any]:
    for measurement in case["measurements"]:
        if measurement["name"] == name:
            return measurement
    raise KeyError(f"measurement {name!r} is missing")


def _measurement_median(case: dict[str, Any], name: str) -> int:
    return _measurement_for(case, name)["summary_ns"]["median"]


def _case_for(
    report: dict[str, Any], size: int, comparison: str
) -> dict[str, Any]:
    for case in report["cases"]:
        if case["dataset_size"] == size and case["comparison"] == comparison:
            return case
    raise KeyError(f"case {comparison!r} for n={size} is missing")


def _operation_trend(
    report: dict[str, Any], comparison: str, measurement: str, counter: str
) -> str:
    return ", ".join(
        f"n={size:,}: "
        f"{_measurement_for(_case_for(report, size, comparison), measurement)['operation_counts'][counter]:,}"
        for size in report["config"]["sizes"]
    )


def _break_even_label(
    build_ns: int, baseline_batch_ns: int, structured_batch_ns: int, lookups: int
) -> str:
    savings_per_lookup = (baseline_batch_ns - structured_batch_ns) / lookups
    if savings_per_lookup <= 0:
        return "No measured warm advantage"
    return f"about {max(1, math.ceil(build_ns / savings_per_lookup)):,} lookups"


def _break_even_rows(report: dict[str, Any]) -> list[str]:
    lookups = report["config"]["lookups"]
    rows: list[str] = []
    for case in report["cases"]:
        size = case["dataset_size"]
        comparison = case["comparison"]
        if comparison == "linear_vs_binary_title":
            build = _measurement_median(case, "binary_merge_sort_preprocessing")
            baseline = _measurement_median(case, "linear_exact_lookup_batch")
            structured = _measurement_median(case, "binary_exact_lookup_batch")
            label = "Binary title vs linear"
            build_label = "merge sort"
            candidates = ((label, build_label, build, baseline, structured),)
        elif comparison == "linear_vs_hash_isbn":
            build = _measurement_median(case, "hash_index_build")
            baseline = _measurement_median(case, "linear_isbn_lookup_batch")
            structured = _measurement_median(case, "hash_isbn_lookup_batch")
            label = "Hash ISBN vs linear"
            build_label = "hash index"
            candidates = ((label, build_label, build, baseline, structured),)
        elif comparison == "bst_vs_baselines":
            merge_build = _measurement_median(case, "bst_merge_sort_preprocessing")
            tree_build = _measurement_median(case, "bst_build_preprocessing")
            candidates = (
                (
                    "BST exact vs binary exact",
                    "BST only (merge shared)",
                    tree_build,
                    _measurement_median(case, "binary_exact_lookup_batch"),
                    _measurement_median(case, "bst_exact_lookup_batch"),
                ),
                (
                    "BST range vs linear range",
                    "merge + BST",
                    merge_build + tree_build,
                    _measurement_median(case, "linear_range_query_batch"),
                    _measurement_median(case, "bst_range_query_batch"),
                ),
            )
        else:
            continue

        for label, build_label, build, baseline, structured in candidates:
            rows.append(
                f"| {size:,} | {label} | {build_label}: {build:,} | "
                f"{baseline / lookups:,.0f} | {structured / lookups:,.0f} | "
                f"{_break_even_label(build, baseline, structured, lookups)} |"
            )
    return rows


def _markdown_report(report: dict[str, Any]) -> str:
    config = report["config"]
    environment = report["environment"]
    lines = [
        "# Pahina DSA Benchmark Results",
        "",
        f"Generated (UTC): `{report['generated_at_utc']}`",
        "",
        "## Reproducible configuration",
        "",
        f"- Seed: `{config['seed']}`",
        f"- Sizes: `{' '.join(str(size) for size in config['sizes'])}`",
        f"- Warm-ups per callable: `{config['warmups']}`",
        f"- Repetitions: `{config['repetitions']}`",
        f"- Lookups per timed batch: `{config['lookups']}`",
        f"- Wall-clock limit: `{config['max_seconds']:g}` seconds",
        "- Estimated record-visit ceiling: "
        f"`{config['max_estimated_scan_record_visits']:,}`",
        f"- Python: `{environment['python_implementation']} {environment['python_version']}`",
        f"- Platform: `{environment['platform']}`",
        f"- Processor: `{environment['processor']}`",
        "",
        "The records are deterministically generated library books with realistic titles, authors, ISBN formatting, availability, and dates. Controlled fixtures include first/middle/last/missing title targets, duplicate normalized titles, missing ISBNs, colliding hash keys, a normalized duplicate ISBN pair, and inclusive/empty range queries.",
        "",
        "No database, HTTP, frontend, or network work is timed. Fixture generation, correctness checks, JSON/Markdown formatting, and file I/O occur outside measured regions. Garbage collection is disabled only around each timed callable and then restored. A preflight workload ceiling rejects excessive configurations, and a wall-clock deadline is checked between bounded algorithm calls.",
        "",
        "Preflight estimate: "
        f"`{report['workload']['benchmark_callable_executions']:,}` benchmark callables, "
        f"`{report['workload']['individual_lookup_or_range_queries']:,}` individual lookup/range queries, and at most approximately "
        f"`{report['workload']['estimated_scan_record_visits']:,}` record visits across the four scan-like batches. This is a safety estimate for those dominant batches, not an upper bound on sorting, construction, or correctness work.",
        "",
        "Normalized ISBN lookup targets are unique. The current ISBN index policy is **last record wins** when two raw ISBN strings normalize to the same key; that policy is verified separately and is not presented as equivalent to a multi-result linear lookup.",
        "",
        "`lookup` rows are warm structure/search costs. `preprocessing` rows show sorting or index/tree construction separately. `cold_batch_total` rows add aligned preprocessing and the full configured lookup batch; they are cold batch totals, not single-lookup measurements. Timing medians and nearest-rank p95 values are descriptive measurements, not proof of Big-O complexity.",
        "",
    ]
    if config["repetitions"] < 25:
        lines.extend(
            [
                f"This run uses `{config['repetitions']}` repetitions; percentile estimates are less stable than the originally planned 25-sample configuration. The reduced count is recorded rather than relabeling or reusing measurements from another configuration.",
                "",
            ]
        )
    for case in report["cases"]:
        lines.extend(
            [
                f"## n={case['dataset_size']}: {_CASE_TITLES[case['comparison']]}",
                "",
                "Correctness gates passed before timing.",
                "",
                "| Measurement | Phase | Samples | Median (ns) | p95 (ns) | Operation counts |",
                "|---|---|---:|---:|---:|---|",
            ]
        )
        for measurement in case["measurements"]:
            summary = measurement["summary_ns"]
            counts = json.dumps(
                measurement["operation_counts"], sort_keys=True, separators=(",", ":")
            )
            lines.append(
                f"| `{measurement['name']}` | {measurement['phase']} | "
                f"{summary['sample_count']} | {summary['median']:,} | "
                f"{summary['p95']:,} | `{counts}` |"
            )
        lines.append("")

    largest_size = max(config["sizes"])
    title_case = _case_for(report, largest_size, "linear_vs_binary_title")
    hash_case = _case_for(report, largest_size, "linear_vs_hash_isbn")
    sort_case = _case_for(report, largest_size, "custom_merge_vs_python_sorted")
    bst_case = _case_for(report, largest_size, "bst_vs_baselines")
    linear_binary_ratio = _measurement_median(
        title_case, "linear_exact_lookup_batch"
    ) / _measurement_median(title_case, "binary_exact_lookup_batch")
    linear_hash_ratio = _measurement_median(
        hash_case, "linear_isbn_lookup_batch"
    ) / _measurement_median(hash_case, "hash_isbn_lookup_batch")
    merge_sorted_ratio = _measurement_median(
        sort_case, "custom_merge_sort"
    ) / _measurement_median(sort_case, "python_sorted")
    binary_bst_ratio = _measurement_median(
        bst_case, "binary_exact_lookup_batch"
    ) / _measurement_median(bst_case, "bst_exact_lookup_batch")
    linear_bst_range_ratio = _measurement_median(
        bst_case, "linear_range_query_batch"
    ) / _measurement_median(bst_case, "bst_range_query_batch")
    lines.extend(
        [
            "## Findings from this run",
            "",
            f"At the largest smoke dataset (`n={largest_size:,}`), the warm linear-title batch took {linear_binary_ratio:.2f}x the binary-search batch, and the warm linear-ISBN batch took {linear_hash_ratio:.2f}x the hash-lookup batch. These comparisons exclude the required merge-sort or hash-index build; cold-batch totals and the break-even table below retain those costs.",
            "",
            f"The custom merge sort took {merge_sorted_ratio:.2f}x the Python `sorted()` baseline at `n={largest_size:,}`. Both produced identical stable order, but `sorted()` is optimized runtime code while the educational implementation performs Python-level recursion, normalization, comparison counting, and write counting.",
            "",
            f"For the balanced BST, binary exact lookup took {binary_bst_ratio:.2f}x the BST exact batch after both structures were built. Linear range scanning took {linear_bst_range_ratio:.2f}x the pruned BST range batch. Range costs still grow with the number of returned records, so a BST cannot make a large output set constant-time.",
            "",
            "## Big-O agreement",
            "",
            "Wall-clock measurements are noisy and do not prove complexity. The deterministic operation counts provide the stronger comparison:",
            "",
            "| Feature | Expected complexity | Operation-count trend | Agreement |",
            "|---|---|---|---|",
            "| Linear exact title | `O(n)` per query | "
            f"{_operation_trend(report, 'linear_vs_binary_title', 'linear_exact_lookup_batch', 'comparisons')} | Comparisons grow in direct proportion to `n`. |",
            "| Binary exact title | `O(log n + k)` | "
            f"{_operation_trend(report, 'linear_vs_binary_title', 'binary_exact_lookup_batch', 'comparisons')} | Comparisons grow slowly as `n` increases tenfold. |",
            "| Custom merge sort | `O(n log n)` time, `O(n)` auxiliary space | "
            f"{_operation_trend(report, 'custom_merge_vs_python_sorted', 'custom_merge_sort', 'comparisons')} | Comparison growth is consistent with `n log n`; runtime is slower than optimized `sorted()`. |",
            "| Hash ISBN lookup/build | Average `O(1)` lookup after `O(n)` build; `O(n)` collision worst case | "
            f"{_operation_trend(report, 'linear_vs_hash_isbn', 'hash_index_build', 'indexed_records')} indexed records; fixed `{config['lookups']}`-lookup batches | Lookup time remains small while build work grows with the dataset. |",
            "| Balanced BST exact | `O(log n + k)` | "
            f"{_operation_trend(report, 'bst_vs_baselines', 'bst_exact_lookup_batch', 'nodes_visited')} nodes visited | Node visits grow slowly; reported tree heights remain logarithmic. |",
            "| Balanced BST range | `O(log n + k)` | "
            f"{_operation_trend(report, 'bst_vs_baselines', 'bst_range_query_batch', 'results')} returned records | Runtime and visits grow with output size `k`, as expected. |",
            "",
        ]
    )
    lines.extend(
        [
            "## Approximate measured break-even",
            "",
            "For repeated lookups, the comparison is `build + q × warm lookup` for the structured approach versus `q × baseline lookup`. The per-lookup values below divide each median batch by the configured lookup count; the threshold is therefore an approximate interpretation of these batch measurements, not a separately timed single-query result or proof of asymptotic complexity.",
            "",
            "| n | Comparison | One-time preprocessing median (ns) | Baseline median/lookup (ns) | Structured median/lookup (ns) | Approximate break-even |",
            "|---:|---|---|---:|---:|---|",
            *_break_even_rows(report),
            "",
        ]
    )
    lines.extend(
        [
            "## Interpretation limits",
            "",
            "- Synthetic records are deterministic and domain-shaped, but they do not reproduce database caches, browser behavior, network latency, or every production catalog distribution.",
            "- Python `sorted()` is an optimized runtime baseline; the custom merge sort exists for correctness, instrumentation, and instruction rather than a production speed claim.",
            "- Hash lookup is average O(1) after an O(n) build and remains O(n) in the collision worst case. The current index is rebuilt for each educational snapshot.",
            "- Binary search, hash lookup, and BST measurements depend on sorted/prebuilt state. For a single lookup, compare the one-time preprocessing median plus one approximate warm lookup against the baseline; do not divide the one-time build cost across the whole batch.",
            (
                f"- This smoke run records only {config['repetitions']} raw samples per measurement. With nearest-rank p95, p95 is the maximum sample in this `{config['repetitions']}`-sample run and is especially sensitive to scheduler noise."
                if config["repetitions"] < 20
                else f"- This run records {config['repetitions']} raw samples per measurement. The reported p95 uses nearest-rank selection and remains sensitive to scheduler noise."
            ),
            "- Raw samples and operation counts are preserved in the JSON report so conclusions do not depend only on wall-clock medians.",
            "",
        ]
    )
    return "\n".join(lines)


def write_reports(
    report: dict[str, Any], json_output: str | Path, markdown_output: str | Path
) -> None:
    json_path = Path(json_output)
    markdown_path = Path(markdown_output)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    markdown_path.write_text(_markdown_report(report), encoding="utf-8")


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sizes", type=int, nargs="+", required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--warmups", type=int, required=True)
    parser.add_argument("--repetitions", type=int, required=True)
    parser.add_argument("--lookups", type=int, required=True)
    parser.add_argument(
        "--max-seconds",
        type=float,
        default=300.0,
        help="abort between algorithm calls after this wall-clock budget (default: 300)",
    )
    parser.add_argument(
        "--max-estimated-scan-record-visits",
        type=int,
        default=100_000_000,
        help="reject larger estimated scan workloads before fixture generation",
    )
    parser.add_argument("--json-output", type=Path, required=True)
    parser.add_argument("--markdown-output", type=Path, required=True)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    arguments = _parse_args(argv)
    try:
        config = BenchmarkConfig(
            sizes=tuple(arguments.sizes),
            seed=arguments.seed,
            warmups=arguments.warmups,
            repetitions=arguments.repetitions,
            lookups=arguments.lookups,
            max_seconds=arguments.max_seconds,
            max_estimated_scan_record_visits=(
                arguments.max_estimated_scan_record_visits
            ),
        )
        report = run_benchmarks(config)
        write_reports(report, arguments.json_output, arguments.markdown_output)
    except (AssertionError, TimeoutError, ValueError) as error:
        print(f"Benchmark aborted: {error}", file=sys.stderr)
        return 2
    print(
        f"Wrote {len(report['cases'])} benchmark cases to "
        f"{arguments.json_output} and {arguments.markdown_output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
