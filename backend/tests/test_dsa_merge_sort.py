import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from app.dsa.contracts import BookRecord, normalize_text
from app.dsa.merge_sort import merge_sort_books
from app.dsa.search import binary_exact_search


def make_book(
    book_id: str,
    title: str,
    *,
    author: str = "Author",
    available_copies: int = 1,
    created_at: datetime | None = None,
) -> BookRecord:
    return BookRecord(
        id=book_id,
        title=title,
        author=author,
        isbn=None,
        available_copies=available_copies,
        created_at=created_at,
    )


class MergeSortTests(unittest.TestCase):
    def setUp(self):
        self.early = datetime(2024, 1, 1, tzinfo=timezone.utc)
        self.late = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.records = [
            make_book("3", "Gamma", author="Zulu", available_copies=2, created_at=None),
            make_book("1", "Alpha", author="Mike", available_copies=3, created_at=self.late),
            make_book("2", "Beta", author="Able", available_copies=1, created_at=self.early),
        ]

    def test_empty_and_one_item_collections_are_returned_as_new_lists(self):
        empty = []
        one = [self.records[0]]

        empty_result = merge_sort_books(empty, "title")
        one_result = merge_sort_books(one, "title")

        self.assertEqual(empty_result.records, [])
        self.assertIsNot(empty_result.records, empty)
        self.assertEqual(one_result.records, one)
        self.assertIsNot(one_result.records, one)
        self.assertEqual(empty_result.stats.comparisons, 0)
        self.assertEqual(one_result.stats.writes, 0)

    def test_already_sorted_and_reverse_sorted_inputs(self):
        ascending = [self.records[1], self.records[2], self.records[0]]
        reverse = [self.records[0], self.records[2], self.records[1]]

        self.assertEqual(
            [record.id for record in merge_sort_books(ascending, "title").records],
            ["1", "2", "3"],
        )
        self.assertEqual(
            [record.id for record in merge_sort_books(reverse, "title").records],
            ["1", "2", "3"],
        )

    def test_all_supported_fields_sort_in_both_directions(self):
        cases = (
            ("title", ["1", "2", "3"], ["3", "2", "1"]),
            ("author", ["2", "1", "3"], ["3", "1", "2"]),
            ("available_copies", ["2", "3", "1"], ["1", "3", "2"]),
            ("created_at", ["2", "1", "3"], ["3", "1", "2"]),
        )

        for field, expected_ascending, expected_descending in cases:
            with self.subTest(field=field, direction="ascending"):
                result = merge_sort_books(self.records, field)
                self.assertEqual([record.id for record in result.records], expected_ascending)
            with self.subTest(field=field, direction="descending"):
                result = merge_sort_books(self.records, field, descending=True)
                self.assertEqual([record.id for record in result.records], expected_descending)

    def test_none_creation_dates_sort_last_ascending_and_first_descending(self):
        ascending = merge_sort_books(self.records, "created_at")
        descending = merge_sort_books(self.records, "created_at", descending=True)

        self.assertEqual([record.id for record in ascending.records], ["2", "1", "3"])
        self.assertEqual([record.id for record in descending.records], ["3", "1", "2"])

    def test_duplicate_keys_preserve_original_relative_order(self):
        duplicates = [
            make_book("3", " Clean  Code "),
            make_book("1", "clean code"),
            make_book("2", "CLEAN CODE"),
        ]

        ascending = merge_sort_books(duplicates, "title")
        descending = merge_sort_books(duplicates, "title", descending=True)

        self.assertEqual([record.id for record in ascending.records], ["3", "1", "2"])
        self.assertEqual([record.id for record in descending.records], ["3", "1", "2"])

    def test_input_list_and_records_are_not_mutated(self):
        original_list = list(self.records)
        original_titles = [record.title for record in self.records]

        merge_sort_books(self.records, "title")

        self.assertEqual(self.records, original_list)
        self.assertEqual([record.title for record in self.records], original_titles)

    def test_output_matches_python_sorted_oracle_without_delegating(self):
        expected = sorted(self.records, key=lambda record: normalize_text(record.title))

        with patch("builtins.sorted", side_effect=AssertionError("delegated to sorted")):
            result = merge_sort_books(self.records, "title")

        self.assertEqual(result.records, expected)

    def test_metrics_follow_documented_comparison_and_write_convention(self):
        result = merge_sort_books(self.records, "title")

        self.assertEqual(result.stats.comparisons, 3)
        self.assertEqual(result.stats.writes, 10)

    def test_invalid_sort_field_is_rejected_even_for_empty_input(self):
        with self.assertRaisesRegex(ValueError, "Unsupported sort field"):
            merge_sort_books([], "isbn")

    def test_merge_sorted_output_satisfies_binary_search_precondition(self):
        unsorted = [
            make_book("4", "Zeta"),
            make_book("2", "Clean Code"),
            make_book("1", "Alpha"),
            make_book("3", " clean   code "),
        ]

        sorted_result = merge_sort_books(unsorted, "title")
        search_result = binary_exact_search(sorted_result.records, "CLEAN code", "title")

        self.assertEqual([record.id for record in search_result.records], ["2", "3"])


if __name__ == "__main__":
    unittest.main()
