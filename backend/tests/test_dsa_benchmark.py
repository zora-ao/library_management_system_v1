import gc
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.dsa import (
    AlgorithmStats,
    SearchResult,
    build_isbn_index,
    normalize_isbn,
    normalize_text,
)
from scripts.benchmark_dsa import (
    BenchmarkConfig,
    _measure_ns,
    _search_batch,
    estimate_workload,
    generate_records,
    main,
    run_benchmarks,
    write_reports,
)


class BenchmarkGeneratorTests(unittest.TestCase):
    def test_generator_is_seeded_deterministic_and_realistically_structured(self):
        first = generate_records(40, 104)
        repeated = generate_records(40, 104)
        changed_seed = generate_records(40, 105)

        self.assertEqual(first, repeated)
        self.assertNotEqual(first, changed_seed)
        self.assertEqual(len(first), 40)
        self.assertTrue(all(record.title and record.author for record in first))
        self.assertTrue(all(record.available_copies >= 0 for record in first))
        self.assertTrue(all(record.created_at is not None for record in first))

        normalized_titles = [normalize_text(record.title) for record in first]
        self.assertLess(len(set(normalized_titles)), len(normalized_titles))
        self.assertTrue(any(record.isbn is None for record in first))

        normalized_isbns = [normalize_isbn(record.isbn) for record in first if record.isbn]
        self.assertLess(len(set(normalized_isbns)), len(normalized_isbns))

        index = build_isbn_index(first, initial_capacity=11)
        self.assertGreaterEqual(index.duplicate_count, 1)
        self.assertGreaterEqual(index.table.stats.collisions, 1)
        self.assertGreaterEqual(index.table.stats.resizes, 1)

    def test_generator_rejects_invalid_size_and_seed(self):
        for size in (-1, True, 1.5):
            with self.subTest(size=size), self.assertRaises(ValueError):
                generate_records(size, 104)
        for seed in (True, 1.5, "104"):
            with self.subTest(seed=seed), self.assertRaises(ValueError):
                generate_records(10, seed)

    def test_normalized_duplicate_isbn_policy_is_last_record_wins(self):
        records = generate_records(20, 104)
        duplicate_key = normalize_isbn(records[2].isbn)
        self.assertEqual(duplicate_key, normalize_isbn(records[3].isbn))

        index = build_isbn_index(records)

        self.assertEqual(index.duplicate_count, 1)
        self.assertEqual(index.table.get(duplicate_key), records[3])


class BenchmarkConfigurationTests(unittest.TestCase):
    def test_configuration_requires_positive_unique_ascending_values(self):
        valid = BenchmarkConfig(
            sizes=(8, 16), seed=104, warmups=1, repetitions=2, lookups=5
        )
        self.assertEqual(valid.sizes, (8, 16))

        invalid_configs = (
            {"sizes": (), "seed": 104, "warmups": 1, "repetitions": 1, "lookups": 1},
            {"sizes": (8, 8), "seed": 104, "warmups": 1, "repetitions": 1, "lookups": 1},
            {"sizes": (16, 8), "seed": 104, "warmups": 1, "repetitions": 1, "lookups": 1},
            {"sizes": (0,), "seed": 104, "warmups": 1, "repetitions": 1, "lookups": 1},
            {"sizes": (8,), "seed": True, "warmups": 1, "repetitions": 1, "lookups": 1},
            {"sizes": (8,), "seed": 104, "warmups": 0, "repetitions": 1, "lookups": 1},
            {"sizes": (8,), "seed": 104, "warmups": 1, "repetitions": 0, "lookups": 1},
            {"sizes": (8,), "seed": 104, "warmups": 1, "repetitions": 1, "lookups": 0},
            {
                "sizes": (8,), "seed": 104, "warmups": 1,
                "repetitions": 1, "lookups": 1, "max_seconds": 0,
            },
            {
                "sizes": (8,), "seed": 104, "warmups": 1,
                "repetitions": 1, "lookups": 1,
                "max_estimated_scan_record_visits": 0,
            },
        )
        for values in invalid_configs:
            with self.subTest(values=values), self.assertRaises(ValueError):
                BenchmarkConfig(**values)

    def test_workload_estimate_exposes_batch_multiplier(self):
        config = BenchmarkConfig(
            sizes=(100, 1_000, 10_000),
            seed=104,
            warmups=1,
            repetitions=3,
            lookups=50,
        )

        self.assertEqual(estimate_workload(config), {
            "dataset_count": 3,
            "benchmark_callable_executions": 192,
            "correctness_algorithm_executions": 120,
            "total_top_level_algorithm_executions": 312,
            "individual_lookup_or_range_queries": 6_000,
            "estimated_scan_record_visits": 11_100_000,
        })


class BenchmarkTimingTests(unittest.TestCase):
    def test_unique_isbn_linear_baseline_stops_after_first_match(self):
        records = generate_records(12, 104)

        result = _search_batch(
            records,
            (records[0].isbn,),
            "isbn",
            binary=False,
            limit=1,
        )

        self.assertEqual(result.result_count, 1)
        self.assertEqual(result.comparisons, 1)

    def test_measurement_disables_gc_only_around_callable_and_restores_state(self):
        events = []

        def operation():
            events.append("operation")
            return "result"

        with patch("scripts.benchmark_dsa.gc.isenabled", return_value=True), patch(
            "scripts.benchmark_dsa.gc.disable", side_effect=lambda: events.append("disable")
        ), patch(
            "scripts.benchmark_dsa.gc.enable", side_effect=lambda: events.append("enable")
        ), patch(
            "scripts.benchmark_dsa.time.perf_counter_ns", side_effect=(100, 175)
        ):
            value, elapsed = _measure_ns(operation)

        self.assertEqual(value, "result")
        self.assertEqual(elapsed, 75)
        self.assertEqual(events, ["disable", "operation", "enable"])

    def test_measurement_restores_gc_after_operation_failure(self):
        was_enabled = gc.isenabled()
        try:
            with self.assertRaisesRegex(RuntimeError, "planned"):
                _measure_ns(lambda: (_ for _ in ()).throw(RuntimeError("planned")))
            self.assertEqual(gc.isenabled(), was_enabled)
        finally:
            if was_enabled and not gc.isenabled():
                gc.enable()


class BenchmarkExecutionTests(unittest.TestCase):
    def setUp(self):
        self.config = BenchmarkConfig(
            sizes=(12, 24), seed=104, warmups=1, repetitions=2, lookups=7
        )

    def test_run_enforces_correctness_before_any_measurement(self):
        wrong = SearchResult(records=[], stats=AlgorithmStats())
        with patch("scripts.benchmark_dsa.binary_exact_search", return_value=wrong), patch(
            "scripts.benchmark_dsa._measure_ns"
        ) as measure:
            with self.assertRaisesRegex(AssertionError, "binary"):
                run_benchmarks(self.config)
        measure.assert_not_called()

    def test_workload_limit_fails_before_fixture_generation(self):
        config = BenchmarkConfig(
            sizes=(10_000,),
            seed=104,
            warmups=1,
            repetitions=1,
            lookups=50,
            max_estimated_scan_record_visits=1_000,
        )
        with patch("scripts.benchmark_dsa.generate_records") as generate:
            with self.assertRaisesRegex(ValueError, "estimated record visits"):
                run_benchmarks(config)
        generate.assert_not_called()

    def test_cli_formats_timeout_without_traceback(self):
        stderr = io.StringIO()
        with patch(
            "scripts.benchmark_dsa.run_benchmarks",
            side_effect=TimeoutError("planned time limit"),
        ), patch("sys.stderr", stderr):
            exit_code = main([
                "--sizes", "12",
                "--seed", "104",
                "--warmups", "1",
                "--repetitions", "1",
                "--lookups", "5",
                "--json-output", "unused.json",
                "--markdown-output", "unused.md",
            ])

        self.assertEqual(exit_code, 2)
        self.assertEqual(
            stderr.getvalue().strip(),
            "Benchmark aborted: planned time limit",
        )

    def test_wall_clock_deadline_fails_before_next_algorithm(self):
        config = BenchmarkConfig(
            sizes=(12,),
            seed=104,
            warmups=1,
            repetitions=1,
            lookups=5,
            max_seconds=1,
        )
        with patch(
            "scripts.benchmark_dsa.time.monotonic", side_effect=(100.0, 101.1)
        ), patch("scripts.benchmark_dsa.generate_records") as generate:
            with self.assertRaisesRegex(TimeoutError, "time limit"):
                run_benchmarks(config)
        generate.assert_not_called()

    def test_report_contains_all_cases_targets_raw_samples_summaries_and_counts(self):
        report = run_benchmarks(self.config)

        self.assertEqual(report["schema_version"], 1)
        self.assertEqual(report["config"], {
            "sizes": [12, 24],
            "seed": 104,
            "warmups": 1,
            "repetitions": 2,
            "lookups": 7,
            "max_seconds": 300.0,
            "max_estimated_scan_record_visits": 100_000_000,
        })
        self.assertEqual(
            report["workload"]["benchmark_callable_executions"], 100
        )
        self.assertIn("python_version", report["environment"])
        self.assertIn("platform", report["environment"])
        self.assertIn("generated_at_utc", report)
        self.assertEqual(
            report["policies"]["normalized_isbn_duplicates"],
            "last record wins; lookup benchmarks use normalized-unique targets",
        )

        expected_comparisons = {
            "linear_vs_binary_title",
            "linear_vs_hash_isbn",
            "custom_merge_vs_python_sorted",
            "bst_vs_baselines",
        }
        self.assertEqual(len(report["cases"]), 8)
        for size in self.config.sizes:
            size_cases = [case for case in report["cases"] if case["dataset_size"] == size]
            self.assertEqual({case["comparison"] for case in size_cases}, expected_comparisons)

        title_case = next(
            case for case in report["cases"]
            if case["dataset_size"] == 24
            and case["comparison"] == "linear_vs_binary_title"
        )
        self.assertEqual(
            {target["label"] for target in title_case["targets"]},
            {"first", "middle", "last", "missing", "duplicate_title"},
        )

        hash_case = next(
            case for case in report["cases"]
            if case["dataset_size"] == 24
            and case["comparison"] == "linear_vs_hash_isbn"
        )
        self.assertTrue(all(target["normalized_unique"] for target in hash_case["targets"]))
        self.assertGreaterEqual(hash_case["correctness"]["duplicate_isbn_count"], 1)
        self.assertEqual(hash_case["correctness"]["duplicate_policy"], "last_record_wins")

        bst_case = next(
            case for case in report["cases"]
            if case["dataset_size"] == 24 and case["comparison"] == "bst_vs_baselines"
        )
        self.assertIn("range_queries", {target["kind"] for target in bst_case["targets"]})

        for case in report["cases"]:
            self.assertTrue(case["correctness"]["passed"])
            self.assertGreater(len(case["measurements"]), 1)
            for measurement in case["measurements"]:
                with self.subTest(case=case["comparison"], measurement=measurement["name"]):
                    self.assertEqual(len(measurement["samples_ns"]), self.config.repetitions)
                    self.assertEqual(measurement["summary_ns"]["sample_count"], self.config.repetitions)
                    self.assertIn("median", measurement["summary_ns"])
                    self.assertIn("p95", measurement["summary_ns"])
                    self.assertIn("operation_counts", measurement)

    def test_json_and_markdown_reports_come_from_the_same_result(self):
        report = run_benchmarks(
            BenchmarkConfig(sizes=(12,), seed=104, warmups=1, repetitions=1, lookups=5)
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            json_path = root / "results.json"
            markdown_path = root / "results.md"

            write_reports(report, json_path, markdown_path)

            loaded = json.loads(json_path.read_text(encoding="utf-8"))
            markdown = markdown_path.read_text(encoding="utf-8")
            self.assertEqual(loaded, report)
            self.assertIn("Seed: `104`", markdown)
            self.assertIn("Sizes: `12`", markdown)
            self.assertIn("Linear vs Binary Title", markdown)
            self.assertIn("last record wins", markdown)
            self.assertIn("No database, HTTP, frontend, or network work is timed", markdown)
            self.assertIn(
                "This run uses `1` repetitions; percentile estimates are less stable",
                markdown,
            )
            self.assertIn("cold batch totals", markdown)
            self.assertIn("Approximate measured break-even", markdown)
            self.assertIn("build + q × warm lookup", markdown)
            self.assertIn("## Findings from this run", markdown)
            self.assertIn("## Big-O agreement", markdown)
            self.assertIn("Operation-count trend", markdown)
            self.assertIn("fixed `5`-lookup batches", markdown)
            self.assertIn("this `1`-sample run", markdown)

    def test_importing_benchmark_does_not_load_flask_or_sqlalchemy(self):
        backend_root = Path(__file__).resolve().parents[1]
        completed = subprocess.run(
            [
                sys.executable,
                "-c",
                (
                    "import sys; import scripts.benchmark_dsa; "
                    "loaded = [name for name in ('flask', 'sqlalchemy') "
                    "if name in sys.modules]; "
                    "assert not loaded, ','.join(loaded)"
                ),
            ],
            cwd=backend_root,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_documented_direct_script_invocation_writes_both_reports(self):
        backend_root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            json_path = root / "direct.json"
            markdown_path = root / "direct.md"
            completed = subprocess.run(
                [
                    sys.executable,
                    "scripts/benchmark_dsa.py",
                    "--sizes",
                    "12",
                    "--seed",
                    "104",
                    "--warmups",
                    "1",
                    "--repetitions",
                    "1",
                    "--lookups",
                    "5",
                    "--json-output",
                    str(json_path),
                    "--markdown-output",
                    str(markdown_path),
                ],
                cwd=backend_root,
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertTrue(json_path.is_file())
            self.assertTrue(markdown_path.is_file())


if __name__ == "__main__":
    unittest.main()
