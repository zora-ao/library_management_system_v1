import unittest
from unittest.mock import patch

from app.dsa.contracts import BookRecord
from app.dsa.hash_table import ChainedHashTable, build_isbn_index


def make_book(book_id: str, isbn: str | None) -> BookRecord:
    return BookRecord(
        id=book_id,
        title=f"Book {book_id}",
        author="Author",
        isbn=isbn,
        available_copies=1,
        created_at=None,
    )


class ChainedHashTableTests(unittest.TestCase):
    def test_empty_get_and_remove_are_safe(self):
        table = ChainedHashTable[str]()

        self.assertIsNone(table.get("missing"))
        self.assertIs(table.remove("missing"), False)
        self.assertEqual(len(table), 0)

    def test_insert_get_and_update_without_size_growth(self):
        table = ChainedHashTable[str]()

        table.put("isbn", "first")
        table.put("isbn", "updated")

        self.assertEqual(table.get("isbn"), "updated")
        self.assertEqual(len(table), 1)
        self.assertEqual(table.stats.collisions, 0)

    def test_invalid_configuration_and_keys_are_rejected(self):
        for capacity in (0, -1, True):
            with self.subTest(capacity=capacity):
                with self.assertRaisesRegex(ValueError, "initial_capacity"):
                    ChainedHashTable(initial_capacity=capacity)

        for load_factor in (0, -0.5, 1.1, True):
            with self.subTest(load_factor=load_factor):
                with self.assertRaisesRegex(ValueError, "max_load_factor"):
                    ChainedHashTable(max_load_factor=load_factor)

        table = ChainedHashTable[str]()
        with self.assertRaisesRegex(ValueError, "non-empty string"):
            table.put("", "value")
        with self.assertRaisesRegex(ValueError, "non-empty string"):
            table.get(None)

    def test_polynomial_hash_is_deterministic_and_not_python_hash(self):
        table = ChainedHashTable[str](initial_capacity=5)

        with patch("builtins.hash", side_effect=AssertionError("randomized hash delegated")):
            table.put("a", "alpha")
            table.put("f", "foxtrot")
            result = table.get("a")

        self.assertEqual(result, "alpha")

    def test_colliding_keys_remain_independent_and_metrics_are_reported(self):
        table = ChainedHashTable[str](initial_capacity=5)

        table.put("a", "alpha")
        table.put("f", "foxtrot")
        table.put("f", "updated")

        self.assertEqual(table.get("a"), "alpha")
        self.assertEqual(table.get("f"), "updated")
        self.assertEqual(table.stats.collisions, 1)
        self.assertEqual(table.stats.max_chain_length, 2)
        self.assertIs(table.remove("a"), True)
        self.assertIsNone(table.get("a"))
        self.assertEqual(table.get("f"), "updated")
        self.assertEqual(table.stats.max_chain_length, 1)

    def test_resize_preserves_entries_size_and_user_collision_count(self):
        table = ChainedHashTable[str](initial_capacity=5, max_load_factor=0.75)
        table.put("a", "A")
        table.put("f", "F")
        collisions_before_resize = table.stats.collisions

        table.put("b", "B")
        table.put("c", "C")

        self.assertEqual(table.stats.capacity, 11)
        self.assertEqual(table.stats.resizes, 1)
        self.assertEqual(len(table), 4)
        self.assertEqual(table.stats.collisions, collisions_before_resize)
        self.assertEqual(table.get("a"), "A")
        self.assertEqual(table.get("f"), "F")
        self.assertEqual(table.get("b"), "B")
        self.assertEqual(table.get("c"), "C")
        self.assertAlmostEqual(table.stats.load_factor, 4 / 11)


class IsbnIndexTests(unittest.TestCase):
    def test_index_skips_missing_and_blank_isbns(self):
        result = build_isbn_index(
            [make_book("1", None), make_book("2", " -- "), make_book("3", "300-0")]
        )

        self.assertEqual(result.indexed_count, 1)
        self.assertEqual(result.skipped_count, 2)
        self.assertEqual(result.duplicate_count, 0)
        self.assertEqual(result.table.get("3000").id, "3")

    def test_duplicate_normalized_isbn_uses_last_record_deterministically(self):
        first = make_book("1", "978-0-13")
        second = make_book("2", "978 0 13")

        result = build_isbn_index([first, second], initial_capacity=5)

        self.assertEqual(result.indexed_count, 1)
        self.assertEqual(result.skipped_count, 0)
        self.assertEqual(result.duplicate_count, 1)
        self.assertEqual(result.table.get("978013"), second)
        self.assertEqual(len(result.table), 1)


if __name__ == "__main__":
    unittest.main()
