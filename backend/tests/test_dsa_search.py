import sys
import unittest
from unittest.mock import patch

from app.dsa.contracts import BookRecord
from app.dsa.search import (
    binary_exact_search,
    linear_contains_search,
    linear_exact_search,
)


def make_book(
    book_id: str,
    title: str,
    author: str = "Author",
    isbn: str | None = None,
) -> BookRecord:
    return BookRecord(
        id=book_id,
        title=title,
        author=author,
        isbn=isbn,
        available_copies=1,
        created_at=None,
    )


class LinearSearchTests(unittest.TestCase):
    def setUp(self):
        self.records = [
            make_book("1", "Clean Code", "Robert Martin", "978-0-1"),
            make_book("2", "Data Structures", "Nell Dale", None),
            make_book("3", "The Pragmatic Programmer", "Andrew Hunt", "978-0-3"),
        ]

    def test_empty_records_and_blank_query_return_empty_without_comparisons(self):
        empty = linear_contains_search([], "clean", ("title", "author"))
        blank = linear_exact_search(self.records, "   ", "title")

        self.assertEqual(empty.records, [])
        self.assertEqual(empty.stats.comparisons, 0)
        self.assertEqual(blank.records, [])
        self.assertEqual(blank.stats.comparisons, 0)

    def test_contains_search_checks_fields_in_order_and_stops_at_limit(self):
        result = linear_contains_search(
            self.records,
            "martin",
            ("title", "author", "isbn"),
            limit=1,
        )

        self.assertEqual([record.id for record in result.records], ["1"])
        self.assertEqual(result.stats.comparisons, 2)

    def test_contains_search_is_case_and_whitespace_insensitive_and_null_safe(self):
        result = linear_contains_search(
            self.records,
            "  PRAGMATIC   programmer ",
            ("title", "author", "isbn"),
        )

        self.assertEqual([record.id for record in result.records], ["3"])
        self.assertEqual(result.stats.comparisons, 7)

    def test_exact_search_normalizes_isbn_and_text_fields(self):
        isbn_result = linear_exact_search(self.records, "978 0 3", "isbn")
        title_result = linear_exact_search(self.records, "  CLEAN   code ", "title")

        self.assertEqual([record.id for record in isbn_result.records], ["3"])
        self.assertEqual([record.id for record in title_result.records], ["1"])
        self.assertEqual(isbn_result.stats.comparisons, 3)
        self.assertEqual(title_result.stats.comparisons, 3)

    def test_exact_search_comparison_counts_are_deterministic(self):
        first = linear_exact_search(self.records, "Clean Code", "title", limit=1)
        middle = linear_exact_search(self.records, "Data Structures", "title", limit=1)
        last = linear_exact_search(self.records, "The Pragmatic Programmer", "title", limit=1)
        missing = linear_exact_search(self.records, "Missing", "title", limit=1)

        self.assertEqual(first.stats.comparisons, 1)
        self.assertEqual(middle.stats.comparisons, 2)
        self.assertEqual(last.stats.comparisons, 3)
        self.assertEqual(missing.stats.comparisons, 3)

    def test_search_does_not_mutate_input_records(self):
        original = list(self.records)

        linear_contains_search(self.records, "code", ("title", "author"))
        linear_exact_search(self.records, "Data Structures", "title")

        self.assertEqual(self.records, original)

    def test_invalid_fields_and_limits_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "at least one search field"):
            linear_contains_search(self.records, "clean", ())
        with self.assertRaisesRegex(ValueError, "limit"):
            linear_exact_search(self.records, "clean", "title", limit=0)
        with self.assertRaisesRegex(ValueError, "Unsupported search field"):
            linear_exact_search(self.records, "clean", "description")


class BinarySearchTests(unittest.TestCase):
    def setUp(self):
        # Binary search deliberately accepts an already-sorted collection.
        self.records = [
            make_book("1", "Algorithms", isbn="100-0"),
            make_book("2", "Clean Code", isbn="200-0"),
            make_book("3", " clean   code ", isbn="300-0"),
            make_book("4", "Data Structures", isbn="400-0"),
            make_book("5", "The Pragmatic Programmer", isbn="500-0"),
        ]

    def test_empty_one_record_and_missing_targets(self):
        empty = binary_exact_search([], "Clean Code", "title")
        one = binary_exact_search([self.records[0]], " algorithms ", "title")
        missing = binary_exact_search(self.records, "Missing", "title")

        self.assertEqual(empty.records, [])
        self.assertEqual(empty.stats.comparisons, 0)
        self.assertEqual([record.id for record in one.records], ["1"])
        self.assertEqual(one.stats.comparisons, 2)
        self.assertEqual(missing.records, [])
        self.assertGreater(missing.stats.comparisons, 0)

    def test_first_middle_and_last_targets_are_found(self):
        first = binary_exact_search(self.records, "Algorithms", "title")
        middle = binary_exact_search(self.records, "Data Structures", "title")
        last = binary_exact_search(self.records, "The Pragmatic Programmer", "title")

        self.assertEqual([record.id for record in first.records], ["1"])
        self.assertEqual([record.id for record in middle.records], ["4"])
        self.assertEqual([record.id for record in last.records], ["5"])

    def test_duplicate_normalized_titles_keep_contiguous_input_order(self):
        result = binary_exact_search(self.records, "  CLEAN code ", "title")
        limited = binary_exact_search(self.records, "clean code", "title", limit=1)

        self.assertEqual([record.id for record in result.records], ["2", "3"])
        self.assertEqual([record.id for record in limited.records], ["2"])
        self.assertEqual(result.stats.comparisons, limited.stats.comparisons)

    def test_isbn_search_uses_normalized_values(self):
        isbn_sorted = [
            make_book("1", "First", isbn="100-0"),
            make_book("2", "Second", isbn="200 0"),
            make_book("3", "Third", isbn="3000"),
        ]

        result = binary_exact_search(isbn_sorted, " 200-0 ", "isbn")

        self.assertEqual([record.id for record in result.records], ["2"])

    def test_binary_search_is_iterative_and_does_not_delegate_to_bisect(self):
        call_count = 0
        target_code = binary_exact_search.__code__

        def count_function_calls(frame, event, _arg):
            nonlocal call_count
            if event == "call" and frame.f_code is target_code:
                call_count += 1

        with patch("bisect.bisect_left", side_effect=AssertionError("bisect delegated")), patch(
            "bisect.bisect_right", side_effect=AssertionError("bisect delegated")
        ):
            sys.setprofile(count_function_calls)
            try:
                result = binary_exact_search(self.records, "Data Structures", "title")
            finally:
                sys.setprofile(None)

        self.assertEqual([record.id for record in result.records], ["4"])
        self.assertEqual(call_count, 1)

    def test_binary_search_rejects_invalid_input(self):
        with self.assertRaisesRegex(ValueError, "limit"):
            binary_exact_search(self.records, "Clean Code", "title", limit=0)
        with self.assertRaisesRegex(ValueError, "Unsupported search field"):
            binary_exact_search(self.records, "Clean Code", "description")


if __name__ == "__main__":
    unittest.main()
