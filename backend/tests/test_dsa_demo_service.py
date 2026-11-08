import unittest
from datetime import datetime
from unittest.mock import patch

from flask import Flask
from sqlalchemy import event

from app.dsa.contracts import BookRecord
from app.extensions import db
from app.models import Book
from app.services.dsa_demo_service import DsaDemoService


class DsaServiceDatabaseTestCase(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite://",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def seed_books(self):
        books = [
            Book("Gamma", "Zulu", total_copies=3, isbn="300-0"),
            Book("Clean Code", "Robert Martin", total_copies=2, isbn="100-0"),
            Book(" clean   code ", "Another Author", total_copies=1, isbn="200-0"),
            Book("Alpha", "Able", total_copies=4, isbn=None),
        ]
        books[0].created_at = datetime(2026, 3, 1)
        books[1].created_at = datetime(2026, 1, 1)
        books[2].created_at = datetime(2026, 2, 1)
        books[3].created_at = datetime(2025, 1, 1)
        db.session.add_all(books)
        db.session.commit()
        return books


class DsaSnapshotLoaderTests(DsaServiceDatabaseTestCase):
    def test_loader_executes_one_scalar_active_book_projection(self):
        books = self.seed_books()
        books[0].is_deleted = True
        db.session.commit()
        real_execute = db.session.execute

        with patch.object(db.session, "execute", wraps=real_execute) as execute:
            records = DsaDemoService._load_active_book_records()

        execute.assert_called_once()
        statement = execute.call_args.args[0]
        selected_names = [column.name for column in statement.selected_columns]
        self.assertEqual(
            selected_names,
            ["id", "title", "author", "isbn", "available_copies", "created_at"],
        )
        self.assertEqual(statement._with_options, ())
        self.assertIn("books.is_deleted IS false", str(statement))
        self.assertTrue(all(isinstance(record, BookRecord) for record in records))
        self.assertEqual({record.title for record in records}, {"Clean Code", " clean   code ", "Alpha"})


class DsaDemoServiceTests(DsaServiceDatabaseTestCase):
    def setUp(self):
        super().setUp()
        self.seed_books()

    def test_linear_contains_runs_only_custom_linear_search(self):
        from app.services import dsa_demo_service as module

        with patch.object(
            module,
            "linear_contains_search",
            wraps=module.linear_contains_search,
        ) as linear, patch.object(
            module,
            "merge_sort_books",
            side_effect=AssertionError("unexpected sort"),
        ):
            response = DsaDemoService.run(
                "linear_contains",
                {"query": "martin", "fields": ["title", "author"], "limit": 10},
            )

        self.assertEqual(response["operation"], "linear_contains")
        self.assertEqual(response["dataset"], {"source": "active_books", "size": 4})
        self.assertEqual([run["algorithm"] for run in response["runs"]], ["linear_search"])
        self.assertEqual([record["title"] for record in response["results"]], ["Clean Code"])
        linear.assert_called_once()

    def test_search_compare_uses_merge_preprocessing_and_equivalent_custom_searches(self):
        response = DsaDemoService.run(
            "search_compare",
            {"query": " clean CODE ", "field": "title", "limit": 10},
        )

        self.assertEqual(
            [run["algorithm"] for run in response["runs"]],
            ["linear_search", "binary_search"],
        )
        self.assertEqual(response["runs"][0]["result_ids"], response["runs"][1]["result_ids"])
        self.assertEqual(len(response["runs"][0]["result_ids"]), 2)
        self.assertEqual(response["runs"][0]["metrics"]["preprocessing_ns"], 0)
        self.assertGreaterEqual(response["runs"][1]["metrics"]["preprocessing_ns"], 0)

    def test_merge_sort_returns_custom_order_and_operation_counts(self):
        response = DsaDemoService.run(
            "merge_sort",
            {"field": "title", "direction": "asc", "limit": 10},
        )

        self.assertEqual([record["title"] for record in response["results"]], [
            "Alpha",
            "Clean Code",
            " clean   code ",
            "Gamma",
        ])
        metrics = response["runs"][0]["metrics"]
        self.assertGreater(metrics["comparisons"], 0)
        self.assertGreater(metrics["writes"], 0)

    def test_hash_compare_matches_linear_isbn_lookup_and_reports_table_metrics(self):
        response = DsaDemoService.run(
            "hash_compare",
            {"query": "100 0", "limit": 10},
        )

        self.assertEqual(
            [run["algorithm"] for run in response["runs"]],
            ["linear_search", "separate_chaining_hash_table"],
        )
        self.assertEqual(response["runs"][0]["result_ids"], response["runs"][1]["result_ids"])
        hash_metrics = response["runs"][1]["metrics"]
        self.assertIsInstance(hash_metrics["collisions"], int)
        self.assertIsInstance(hash_metrics["capacity"], int)
        self.assertIsInstance(hash_metrics["load_factor"], float)
        self.assertGreaterEqual(hash_metrics["preprocessing_ns"], 0)

    def test_bst_range_reports_balanced_tree_and_pruned_traversal_metrics(self):
        response = DsaDemoService.run(
            "bst_range",
            {"range_start": "A", "range_end": "Clean Code", "limit": 10},
        )

        self.assertEqual([record["title"] for record in response["results"]], [
            "Alpha",
            "Clean Code",
            " clean   code ",
        ])
        run = response["runs"][0]
        self.assertEqual(run["algorithm"], "balanced_title_bst")
        self.assertEqual(run["metrics"]["tree_size"], 4)
        self.assertEqual(run["metrics"]["tree_height"], 3)
        self.assertGreater(run["metrics"]["nodes_visited"], 0)

    def test_timers_exclude_snapshot_loading_and_result_serialization(self):
        events = []
        records = [
            BookRecord("1", "Beta", "Author", "2", 1, None),
            BookRecord("2", "Alpha", "Author", "1", 1, None),
        ]
        timer_value = 0

        def load_records():
            events.append("load")
            return records

        def timer():
            nonlocal timer_value
            events.append("timer")
            timer_value += 10
            return timer_value

        def serialize(record):
            events.append("serialize")
            return {"id": record.id, "title": record.title}

        with patch.object(
            DsaDemoService,
            "_load_active_book_records",
            side_effect=load_records,
        ), patch.object(
            DsaDemoService,
            "_serialize_record",
            side_effect=serialize,
        ), patch(
            "app.services.dsa_demo_service.time.perf_counter_ns",
            side_effect=timer,
        ):
            DsaDemoService.run(
                "merge_sort",
                {"field": "title", "direction": "asc", "limit": 10},
            )

        self.assertEqual(events[0], "load")
        self.assertEqual(events.count("timer"), 2)
        self.assertLess(events.index("timer"), events.index("serialize"))
        self.assertGreater(events.index("serialize"), len(events) - 3)

    def test_service_does_not_delegate_to_python_sorted(self):
        records = [
            BookRecord("1", "Gamma", "Zulu", "3000", 1, None),
            BookRecord("2", "Clean Code", "Robert Martin", "1000", 1, None),
            BookRecord("3", "Alpha", "Able", "2000", 1, None),
        ]
        operations = (
            ("linear_contains", {"query": "clean", "fields": ["title"], "limit": 10}),
            ("search_compare", {"query": "Clean Code", "field": "title", "limit": 10}),
            ("merge_sort", {"field": "author", "direction": "desc", "limit": 10}),
            ("hash_compare", {"query": "1000", "limit": 10}),
            ("bst_range", {"range_start": "A", "range_end": "Z", "limit": 10}),
        )

        with patch.object(
            DsaDemoService,
            "_load_active_book_records",
            return_value=records,
        ), patch("builtins.sorted", side_effect=AssertionError("delegated to sorted")):
            for operation, payload in operations:
                with self.subTest(operation=operation):
                    DsaDemoService.run(operation, payload)

    def test_each_valid_operation_executes_one_catalog_statement(self):
        operations = (
            ("linear_contains", {"query": "clean", "fields": ["title"], "limit": 10}),
            ("search_compare", {"query": "Clean Code", "field": "title", "limit": 10}),
            ("merge_sort", {"field": "title", "direction": "asc", "limit": 10}),
            ("hash_compare", {"query": "1000", "limit": 10}),
            ("bst_range", {"range_start": "A", "range_end": "Z", "limit": 10}),
        )

        for operation, payload in operations:
            statements = []

            def record_statement(_conn, _cursor, statement, _params, _context, _many):
                statements.append(statement)

            event.listen(db.engine, "before_cursor_execute", record_statement)
            try:
                DsaDemoService.run(operation, payload)
            finally:
                event.remove(db.engine, "before_cursor_execute", record_statement)

            with self.subTest(operation=operation):
                self.assertEqual(len(statements), 1)
                self.assertIn("FROM books", statements[0])


if __name__ == "__main__":
    unittest.main()
