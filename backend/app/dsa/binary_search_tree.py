"""Balanced static binary search tree for normalized book titles."""

from collections.abc import Sequence
from dataclasses import dataclass

from app.dsa.contracts import AlgorithmStats, BookRecord, SearchResult, normalize_text


@dataclass
class _Node:
    key: tuple[str, str]
    record: BookRecord
    left: "_Node | None" = None
    right: "_Node | None" = None


class BookTitleBST:
    """Read-only balanced tree built directly from title-sorted records."""

    def __init__(self, root: _Node | None, size: int, height: int) -> None:
        self._root = root
        self._size = size
        self._height = height

    @classmethod
    def from_sorted(cls, records: Sequence[BookRecord]) -> "BookTitleBST":
        """Build a balanced tree by recursively selecting midpoint records.

        ``records`` must be ascending by normalized title. The unique node key
        combines normalized title and record ID, while title traversal remains
        stable for equal titles and therefore preserves the input order.
        """

        def build(start: int, end: int) -> tuple[_Node | None, int]:
            if start >= end:
                return None, 0
            middle = start + (end - start) // 2
            record = records[middle]
            left, left_height = build(start, middle)
            right, right_height = build(middle + 1, end)
            node = _Node(
                key=(normalize_text(record.title), record.id),
                record=record,
                left=left,
                right=right,
            )
            height = left_height + 1 if left_height >= right_height else right_height + 1
            return node, height

        root, height = build(0, len(records))
        return cls(root=root, size=len(records), height=height)

    @staticmethod
    def _validate_limit(limit: int) -> None:
        if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
            raise ValueError("limit must be a positive integer")

    @property
    def height(self) -> int:
        return self._height

    @property
    def size(self) -> int:
        return self._size

    def in_order(self, limit: int = 100) -> SearchResult:
        self._validate_limit(limit)
        records: list[BookRecord] = []
        stats = AlgorithmStats()

        def traverse(node: _Node | None) -> None:
            if node is None or len(records) >= limit:
                return
            stats.nodes_visited += 1
            traverse(node.left)
            if len(records) >= limit:
                return
            records.append(node.record)
            traverse(node.right)

        traverse(self._root)
        return SearchResult(records=records, stats=stats)

    def find_exact(self, title: str, limit: int = 100) -> SearchResult:
        self._validate_limit(limit)
        if not isinstance(title, str):
            raise ValueError("title must be a non-empty string")
        target = normalize_text(title)
        if not target:
            raise ValueError("title must be a non-empty string")

        records: list[BookRecord] = []
        stats = AlgorithmStats()

        def search(node: _Node | None) -> None:
            if node is None or len(records) >= limit:
                return
            stats.nodes_visited += 1
            stats.comparisons += 1
            node_title = node.key[0]
            if node_title >= target:
                search(node.left)
            if len(records) >= limit:
                return
            if node_title == target:
                records.append(node.record)
            if node_title <= target:
                search(node.right)

        search(self._root)
        return SearchResult(records=records, stats=stats)

    def range_search(self, start: str, end: str, limit: int = 100) -> SearchResult:
        self._validate_limit(limit)
        if not isinstance(start, str) or not isinstance(end, str):
            raise ValueError("range boundaries must be non-empty strings")
        normalized_start = normalize_text(start)
        normalized_end = normalize_text(end)
        if not normalized_start or not normalized_end:
            raise ValueError("range boundaries must be non-empty strings")
        if normalized_start > normalized_end:
            raise ValueError("range_start must not be greater than range_end")

        records: list[BookRecord] = []
        stats = AlgorithmStats()

        def search(node: _Node | None) -> None:
            if node is None or len(records) >= limit:
                return
            stats.nodes_visited += 1
            stats.comparisons += 2
            node_title = node.key[0]
            if node_title >= normalized_start:
                search(node.left)
            if len(records) >= limit:
                return
            if normalized_start <= node_title <= normalized_end:
                records.append(node.record)
            if node_title <= normalized_end:
                search(node.right)

        search(self._root)
        return SearchResult(records=records, stats=stats)
