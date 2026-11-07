"""Orchestrate custom Python DSA demonstrations over one catalog snapshot."""

import time
from collections.abc import Callable
from typing import Any, TypeVar

from sqlalchemy import select

from app.dsa import (
    AlgorithmStats,
    BookRecord,
    BookTitleBST,
    binary_exact_search,
    build_isbn_index,
    linear_contains_search,
    linear_exact_search,
    merge_sort_books,
    normalize_isbn,
)
from app.extensions import db
from app.models import Book


T = TypeVar("T")


class DsaDemoService:
    """Run educational algorithms without changing production catalog paths."""

    NOTES = [
        "Timings are single educational samples, not benchmark results.",
        "Production search, sorting, authentication, and borrowing remain unchanged.",
        "Binary search requires data sorted by the same normalized field.",
        "Hash-table lookup is average O(1) but worst-case O(n) under collisions.",
    ]

    @staticmethod
    def _load_active_book_records() -> list[BookRecord]:
        statement = select(
            Book.id,
            Book.title,
            Book.author,
            Book.isbn,
            Book._available_copies,
            Book.created_at,
        ).where(Book.is_deleted.is_(False))
        rows = db.session.execute(statement).all()
        records: list[BookRecord] = []
        for row in rows:
            records.append(
                BookRecord(
                    id=str(row[0]),
                    title=row[1],
                    author=row[2],
                    isbn=row[3],
                    available_copies=row[4],
                    created_at=row[5],
                )
            )
        return records

    @staticmethod
    def _serialize_record(record: BookRecord) -> dict[str, Any]:
        return {
            "id": record.id,
            "title": record.title,
            "author": record.author,
            "isbn": record.isbn,
            "available_copies": record.available_copies,
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }

    @staticmethod
    def _timed(call: Callable[[], T]) -> tuple[T, int]:
        started_at = time.perf_counter_ns()
        result = call()
        elapsed = time.perf_counter_ns() - started_at
        return result, elapsed

    @staticmethod
    def _record_ids(records: list[BookRecord]) -> list[str]:
        result: list[str] = []
        for record in records:
            result.append(record.id)
        return result

    @staticmethod
    def _metrics(
        stats: AlgorithmStats,
        algorithm_ns: int,
        *,
        preprocessing_ns: int = 0,
        collisions: int | None = None,
        capacity: int | None = None,
        load_factor: float | None = None,
        tree_height: int | None = None,
        tree_size: int | None = None,
    ) -> dict[str, int | float | None]:
        return {
            "comparisons": stats.comparisons,
            "writes": stats.writes,
            "nodes_visited": stats.nodes_visited,
            "collisions": collisions,
            "capacity": capacity,
            "load_factor": load_factor,
            "tree_height": tree_height,
            "tree_size": tree_size,
            "preprocessing_ns": preprocessing_ns,
            "algorithm_ns": algorithm_ns,
        }

    @classmethod
    def _response(
        cls,
        operation: str,
        dataset_size: int,
        result_records: list[BookRecord],
        runs: list[dict[str, Any]],
    ) -> dict[str, Any]:
        results: list[dict[str, Any]] = []
        for record in result_records:
            results.append(cls._serialize_record(record))
        return {
            "operation": operation,
            "dataset": {"source": "active_books", "size": dataset_size},
            "results": results,
            "runs": runs,
            "notes": list(cls.NOTES),
        }

    @classmethod
    def run(cls, operation: str, payload: dict[str, Any]) -> dict[str, Any]:
        records = cls._load_active_book_records()
        dataset_size = len(records)

        if operation == "linear_contains":
            search_result, search_ns = cls._timed(
                lambda: linear_contains_search(
                    records,
                    payload["query"],
                    payload["fields"],
                    payload["limit"],
                )
            )
            runs = [
                {
                    "algorithm": "linear_search",
                    "result_ids": cls._record_ids(search_result.records),
                    "metrics": cls._metrics(search_result.stats, search_ns),
                    "complexity": {"time": "O(n * m)", "space": "O(k)"},
                }
            ]
            return cls._response(operation, dataset_size, search_result.records, runs)

        if operation == "search_compare":
            linear_result, linear_ns = cls._timed(
                lambda: linear_exact_search(
                    records,
                    payload["query"],
                    payload["field"],
                    payload["limit"],
                )
            )
            sorted_result, sort_ns = cls._timed(
                lambda: merge_sort_books(records, payload["field"])
            )
            binary_result, binary_ns = cls._timed(
                lambda: binary_exact_search(
                    sorted_result.records,
                    payload["query"],
                    payload["field"],
                    payload["limit"],
                )
            )
            runs = [
                {
                    "algorithm": "linear_search",
                    "result_ids": cls._record_ids(linear_result.records),
                    "metrics": cls._metrics(linear_result.stats, linear_ns),
                    "complexity": {"time": "O(n)", "space": "O(k)"},
                },
                {
                    "algorithm": "binary_search",
                    "result_ids": cls._record_ids(binary_result.records),
                    "metrics": cls._metrics(
                        binary_result.stats,
                        binary_ns,
                        preprocessing_ns=sort_ns,
                    ),
                    "complexity": {
                        "time": "O(log n + k) after O(n log n) preparation",
                        "space": "O(k), plus O(n) sorted copy",
                    },
                },
            ]
            return cls._response(operation, dataset_size, linear_result.records, runs)

        if operation == "merge_sort":
            sort_result, sort_ns = cls._timed(
                lambda: merge_sort_books(
                    records,
                    payload["field"],
                    descending=payload["direction"] == "desc",
                )
            )
            limited_records = sort_result.records[: payload["limit"]]
            runs = [
                {
                    "algorithm": "merge_sort",
                    "result_ids": cls._record_ids(limited_records),
                    "metrics": cls._metrics(sort_result.stats, sort_ns),
                    "complexity": {"time": "O(n log n)", "space": "O(n)"},
                }
            ]
            return cls._response(operation, dataset_size, limited_records, runs)

        if operation == "hash_compare":
            linear_result, linear_ns = cls._timed(
                lambda: linear_exact_search(
                    records,
                    payload["query"],
                    "isbn",
                    payload["limit"],
                )
            )
            index_result, build_ns = cls._timed(lambda: build_isbn_index(records))
            normalized_query = normalize_isbn(payload["query"])
            hash_record, lookup_ns = cls._timed(
                lambda: index_result.table.get(normalized_query)
            )
            hash_records: list[BookRecord] = []
            if hash_record is not None:
                hash_records.append(hash_record)
            table_stats = index_result.table.stats
            runs = [
                {
                    "algorithm": "linear_search",
                    "result_ids": cls._record_ids(linear_result.records),
                    "metrics": cls._metrics(linear_result.stats, linear_ns),
                    "complexity": {"time": "O(n)", "space": "O(k)"},
                },
                {
                    "algorithm": "separate_chaining_hash_table",
                    "result_ids": cls._record_ids(hash_records),
                    "metrics": cls._metrics(
                        AlgorithmStats(),
                        lookup_ns,
                        preprocessing_ns=build_ns,
                        collisions=table_stats.collisions,
                        capacity=table_stats.capacity,
                        load_factor=table_stats.load_factor,
                    ),
                    "complexity": {
                        "time": "Average O(1), worst O(n), after O(n) build",
                        "space": "O(n + c)",
                    },
                },
            ]
            return cls._response(operation, dataset_size, linear_result.records, runs)

        if operation == "bst_range":
            sorted_result, sort_ns = cls._timed(lambda: merge_sort_books(records, "title"))
            tree, tree_build_ns = cls._timed(
                lambda: BookTitleBST.from_sorted(sorted_result.records)
            )
            range_result, range_ns = cls._timed(
                lambda: tree.range_search(
                    payload["range_start"],
                    payload["range_end"],
                    payload["limit"],
                )
            )
            runs = [
                {
                    "algorithm": "balanced_title_bst",
                    "result_ids": cls._record_ids(range_result.records),
                    "metrics": cls._metrics(
                        AlgorithmStats(
                            comparisons=range_result.stats.comparisons,
                            writes=sorted_result.stats.writes,
                            nodes_visited=range_result.stats.nodes_visited,
                        ),
                        range_ns,
                        preprocessing_ns=sort_ns + tree_build_ns,
                        tree_height=tree.height,
                        tree_size=tree.size,
                    ),
                    "complexity": {
                        "time": "O(log n + k) when balanced, after O(n log n) preparation",
                        "space": "O(n) tree plus O(log n) traversal",
                    },
                }
            ]
            return cls._response(operation, dataset_size, range_result.records, runs)

        raise ValueError(f"Unsupported DSA operation: {operation}")
