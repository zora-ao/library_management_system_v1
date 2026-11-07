import unittest

from app.dsa.binary_search_tree import BookTitleBST
from app.dsa.contracts import BookRecord, normalize_text
from app.dsa.merge_sort import merge_sort_books
from app.dsa.search import binary_exact_search


def make_book(book_id: str, title: str) -> BookRecord:
    return BookRecord(
        id=book_id,
        title=title,
        author="Author",
        isbn=None,
        available_copies=1,
        created_at=None,
    )


class BookTitleBSTConstructionTests(unittest.TestCase):
    def test_empty_and_one_node_trees_report_size_height_and_traversal(self):
        empty = BookTitleBST.from_sorted([])
        one_record = make_book("1", "Alpha")
        one = BookTitleBST.from_sorted([one_record])

        self.assertEqual(empty.size, 0)
        self.assertEqual(empty.height, 0)
        self.assertEqual(empty.in_order().records, [])
        self.assertEqual(one.size, 1)
        self.assertEqual(one.height, 1)
        self.assertEqual(one.in_order().records, [one_record])

    def test_odd_even_and_seven_record_trees_use_balanced_midpoints(self):
        records = [make_book(str(index), chr(64 + index)) for index in range(1, 8)]

        odd = BookTitleBST.from_sorted(records[:3])
        even = BookTitleBST.from_sorted(records[:4])
        seven = BookTitleBST.from_sorted(records)

        self.assertEqual(odd.height, 2)
        self.assertEqual(even.height, 3)
        self.assertEqual(seven.height, 3)
        self.assertEqual(seven.size, 7)

    def test_in_order_returns_normalized_title_order_and_honors_limit(self):
        records = [
            make_book("1", " Alpha "),
            make_book("2", "beta"),
            make_book("3", "CHARLIE"),
            make_book("4", "delta"),
        ]
        tree = BookTitleBST.from_sorted(records)

        result = tree.in_order()
        limited = tree.in_order(limit=2)

        self.assertEqual(
            [normalize_text(record.title) for record in result.records],
            ["alpha", "beta", "charlie", "delta"],
        )
        self.assertEqual([record.id for record in limited.records], ["1", "2"])


class BookTitleBSTSearchTests(unittest.TestCase):
    def setUp(self):
        self.records = [
            make_book("1", "Alpha"),
            make_book("2", "Beta"),
            make_book("3", " clean  code "),
            make_book("4", "CLEAN CODE"),
            make_book("5", "Delta"),
            make_book("6", "Echo"),
            make_book("7", "Foxtrot"),
        ]
        self.tree = BookTitleBST.from_sorted(self.records)

    def test_exact_search_returns_all_duplicates_and_missing_is_empty(self):
        found = self.tree.find_exact("  Clean   Code ")
        missing = self.tree.find_exact("Missing")

        self.assertEqual([record.id for record in found.records], ["3", "4"])
        self.assertGreater(found.stats.nodes_visited, 0)
        self.assertEqual(missing.records, [])
        self.assertGreater(missing.stats.nodes_visited, 0)

    def test_exact_search_limit_truncates_without_overwriting_duplicates(self):
        result = self.tree.find_exact("clean code", limit=1)

        self.assertEqual([record.id for record in result.records], ["3"])
        self.assertEqual(self.tree.size, 7)

    def test_range_search_is_inclusive_case_insensitive_and_pruned(self):
        result = self.tree.range_search(" BETA ", " delta ")

        self.assertEqual([record.id for record in result.records], ["2", "3", "4", "5"])
        self.assertLessEqual(result.stats.nodes_visited, self.tree.size)

    def test_range_search_handles_empty_result_and_limit(self):
        empty = self.tree.range_search("Golf", "Hotel")
        limited = self.tree.range_search("Alpha", "Foxtrot", limit=3)

        self.assertEqual(empty.records, [])
        self.assertEqual([record.id for record in limited.records], ["1", "2", "3"])

    def test_invalid_ranges_queries_and_limits_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "range_start"):
            self.tree.range_search("Zulu", "Alpha")
        with self.assertRaisesRegex(ValueError, "non-empty"):
            self.tree.find_exact("   ")
        with self.assertRaisesRegex(ValueError, "limit"):
            self.tree.in_order(limit=0)

    def test_tree_results_match_custom_merge_sort_and_binary_search(self):
        unsorted = [
            make_book("7", "Foxtrot"),
            make_book("4", "CLEAN CODE"),
            make_book("1", "Alpha"),
            make_book("6", "Echo"),
            make_book("3", " clean  code "),
            make_book("2", "Beta"),
            make_book("5", "Delta"),
        ]
        sorted_result = merge_sort_books(unsorted, "title")
        tree = BookTitleBST.from_sorted(sorted_result.records)

        traversal = tree.in_order()
        tree_exact = tree.find_exact("clean code")
        binary_exact = binary_exact_search(sorted_result.records, "clean code", "title")

        self.assertEqual(traversal.records, sorted_result.records)
        self.assertEqual(
            [record.id for record in tree_exact.records],
            [record.id for record in binary_exact.records],
        )


if __name__ == "__main__":
    unittest.main()
