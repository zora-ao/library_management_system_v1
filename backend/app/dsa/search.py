"""Custom linear and binary searches for immutable book records."""

from collections.abc import Sequence

from app.dsa.contracts import (
    AlgorithmStats,
    BookRecord,
    SearchField,
    SearchResult,
    normalize_isbn,
    normalize_text,
    search_field_value,
)


def _validate_limit(limit: int) -> None:
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1:
        raise ValueError("limit must be a positive integer")


def _validate_search_field(field: str) -> None:
    if field != "title" and field != "author" and field != "isbn":
        raise ValueError(f"Unsupported search field: {field}")


def _normalized_query(query: str, field: SearchField) -> str:
    if not isinstance(query, str):
        raise ValueError("query must be a string")
    if field == "isbn":
        return normalize_isbn(query)
    return normalize_text(query)


def linear_contains_search(
    records: Sequence[BookRecord],
    query: str,
    fields: Sequence[SearchField],
    limit: int = 100,
) -> SearchResult:
    """Scan records/fields in order and count every inspected field value."""

    _validate_limit(limit)
    if not fields:
        raise ValueError("at least one search field is required")

    has_nonempty_query = False
    for field in fields:
        _validate_search_field(field)
        if _normalized_query(query, field):
            has_nonempty_query = True

    stats = AlgorithmStats()
    matches: list[BookRecord] = []
    if not has_nonempty_query:
        return SearchResult(records=matches, stats=stats)

    for record in records:
        for field in fields:
            normalized_query = _normalized_query(query, field)
            stats.comparisons += 1
            if normalized_query and normalized_query in search_field_value(record, field):
                matches.append(record)
                break
        if len(matches) >= limit:
            break

    return SearchResult(records=matches, stats=stats)


def linear_exact_search(
    records: Sequence[BookRecord],
    query: str,
    field: SearchField,
    limit: int = 100,
) -> SearchResult:
    """Scan one normalized field per record and count equality checks."""

    _validate_limit(limit)
    _validate_search_field(field)
    normalized_query = _normalized_query(query, field)
    stats = AlgorithmStats()
    matches: list[BookRecord] = []
    if not normalized_query:
        return SearchResult(records=matches, stats=stats)

    for record in records:
        stats.comparisons += 1
        if search_field_value(record, field) == normalized_query:
            matches.append(record)
            if len(matches) >= limit:
                break

    return SearchResult(records=matches, stats=stats)


def binary_exact_search(
    sorted_records: Sequence[BookRecord],
    query: str,
    field: SearchField,
    limit: int = 100,
) -> SearchResult:
    """Find a normalized exact-key range in an already-sorted collection.

    The caller must sort by the same normalized ``field`` first. The function
    performs two iterative boundary searches. ``comparisons`` counts one key
    comparison for each midpoint inspected by either boundary search.
    """

    _validate_limit(limit)
    _validate_search_field(field)
    target = _normalized_query(query, field)
    stats = AlgorithmStats()
    matches: list[BookRecord] = []
    if not target or not sorted_records:
        return SearchResult(records=matches, stats=stats)

    low = 0
    high = len(sorted_records)
    while low < high:
        middle = low + (high - low) // 2
        stats.comparisons += 1
        if search_field_value(sorted_records[middle], field) < target:
            low = middle + 1
        else:
            high = middle
    first = low

    low = first
    high = len(sorted_records)
    while low < high:
        middle = low + (high - low) // 2
        stats.comparisons += 1
        if search_field_value(sorted_records[middle], field) <= target:
            low = middle + 1
        else:
            high = middle
    after_last = low

    index = first
    while index < after_last and len(matches) < limit:
        matches.append(sorted_records[index])
        index += 1

    return SearchResult(records=matches, stats=stats)
