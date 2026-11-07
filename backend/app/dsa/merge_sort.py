"""Stable custom merge sort for Pahina book records."""

from collections.abc import Sequence

from app.dsa.contracts import (
    AlgorithmStats,
    BookRecord,
    SortField,
    SortResult,
    sort_field_value,
)


def _validate_sort_field(field: str) -> None:
    if (
        field != "title"
        and field != "author"
        and field != "available_copies"
        and field != "created_at"
    ):
        raise ValueError(f"Unsupported sort field: {field}")


def _compare_records(left: BookRecord, right: BookRecord, field: SortField) -> int:
    if field == "created_at":
        if left.created_at is None and right.created_at is None:
            return 0
        if left.created_at is None:
            return 1
        if right.created_at is None:
            return -1

    left_value = sort_field_value(left, field)
    right_value = sort_field_value(right, field)
    if left_value < right_value:
        return -1
    if left_value > right_value:
        return 1
    return 0


def merge_sort_books(
    records: Sequence[BookRecord],
    field: SortField,
    descending: bool = False,
) -> SortResult:
    """Return a stable custom merge-sort result without mutating ``records``.

    ``None`` creation dates are ordered after real dates in ascending order
    and before real dates in descending order. Equal primary keys keep their
    input order; no hidden ID tie-breaker is added.

    One comparison is counted for each left/right key pair inspected. A write
    is counted for every assignment into the reusable auxiliary array and for
    every assignment copied back to the working array. The initial input copy
    is not counted.
    """

    _validate_sort_field(field)
    if not isinstance(descending, bool):
        raise ValueError("descending must be a boolean")

    working = list(records)
    stats = AlgorithmStats()
    if len(working) < 2:
        return SortResult(records=working, stats=stats)

    auxiliary: list[BookRecord | None] = [None] * len(working)

    def merge(start: int, middle: int, end: int) -> None:
        left_index = start
        right_index = middle
        destination = start

        while left_index < middle and right_index < end:
            comparison = _compare_records(
                working[left_index],
                working[right_index],
                field,
            )
            stats.comparisons += 1
            take_left = comparison >= 0 if descending else comparison <= 0
            if take_left:
                auxiliary[destination] = working[left_index]
                left_index += 1
            else:
                auxiliary[destination] = working[right_index]
                right_index += 1
            stats.writes += 1
            destination += 1

        while left_index < middle:
            auxiliary[destination] = working[left_index]
            stats.writes += 1
            left_index += 1
            destination += 1

        while right_index < end:
            auxiliary[destination] = working[right_index]
            stats.writes += 1
            right_index += 1
            destination += 1

        destination = start
        while destination < end:
            item = auxiliary[destination]
            if item is None:
                raise RuntimeError("merge sort auxiliary slot was not populated")
            working[destination] = item
            stats.writes += 1
            destination += 1

    def sort_range(start: int, end: int) -> None:
        if end - start < 2:
            return
        middle = start + (end - start) // 2
        sort_range(start, middle)
        sort_range(middle, end)
        merge(start, middle, end)

    sort_range(0, len(working))
    return SortResult(records=working, stats=stats)
