import unittest
from dataclasses import FrozenInstanceError
from datetime import datetime, timezone

from app.dsa.contracts import (
    AlgorithmStats,
    BookRecord,
    SearchResult,
    SortResult,
    normalize_isbn,
    normalize_text,
    search_field_value,
    sort_field_value,
)


class DsaContractTests(unittest.TestCase):
    def setUp(self):
        self.record = BookRecord(
            id="book-1",
            title="  Clean   Code  ",
            author="Robert C. Martin",
            isbn=None,
            available_copies=3,
            created_at=None,
        )

    def test_normalize_text_is_case_and_whitespace_insensitive(self):
        self.assertEqual(normalize_text("  Clean   CODE  "), "clean code")
        self.assertEqual(normalize_text("\tThe\nPragmatic\rProgrammer "), "the pragmatic programmer")
        self.assertEqual(normalize_text(None), "")

    def test_normalize_isbn_removes_only_spaces_and_hyphens(self):
        self.assertEqual(normalize_isbn("978-0 13-235088-4"), "9780132350884")
        self.assertEqual(normalize_isbn(" 978-X "), "978X")
        self.assertEqual(normalize_isbn("978/0"), "978/0")
        self.assertEqual(normalize_isbn(None), "")

    def test_book_record_is_immutable_and_field_access_is_null_safe(self):
        self.assertEqual(search_field_value(self.record, "isbn"), "")
        self.assertEqual(sort_field_value(self.record, "created_at"), datetime.min.replace(tzinfo=timezone.utc))

        with self.assertRaises(FrozenInstanceError):
            self.record.title = "Changed"

    def test_field_accessors_normalize_supported_values(self):
        created_at = datetime(2026, 11, 7, 12, 0, tzinfo=timezone.utc)
        record = BookRecord(
            id="book-2",
            title="  Data  Structures ",
            author="  NELL  Dale ",
            isbn="978-1-23",
            available_copies=7,
            created_at=created_at,
        )

        self.assertEqual(search_field_value(record, "title"), "data structures")
        self.assertEqual(search_field_value(record, "author"), "nell dale")
        self.assertEqual(search_field_value(record, "isbn"), "978123")
        self.assertEqual(sort_field_value(record, "available_copies"), 7)
        self.assertEqual(sort_field_value(record, "created_at"), created_at)

    def test_field_accessors_reject_unsupported_fields(self):
        with self.assertRaisesRegex(ValueError, "Unsupported search field"):
            search_field_value(self.record, "description")

        with self.assertRaisesRegex(ValueError, "Unsupported sort field"):
            sort_field_value(self.record, "isbn")

    def test_result_contracts_preserve_records_and_metrics(self):
        stats = AlgorithmStats(comparisons=2, writes=1, nodes_visited=3)

        search = SearchResult(records=[self.record], stats=stats)
        sort = SortResult(records=[self.record], stats=stats)

        self.assertEqual(search.records, [self.record])
        self.assertIs(search.stats, stats)
        self.assertEqual(sort.records, [self.record])
        self.assertIs(sort.stats, stats)


if __name__ == "__main__":
    unittest.main()
