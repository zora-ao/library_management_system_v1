"""Custom Python data structures and algorithms used by the DSA Explorer."""

from app.dsa.contracts import (
    AlgorithmStats,
    BookRecord,
    SearchField,
    SearchResult,
    SortField,
    SortResult,
    normalize_isbn,
    normalize_text,
    search_field_value,
    sort_field_value,
)
from app.dsa.search import (
    binary_exact_search,
    linear_contains_search,
    linear_exact_search,
)

__all__ = [
    "AlgorithmStats",
    "BookRecord",
    "SearchField",
    "SearchResult",
    "SortField",
    "SortResult",
    "normalize_isbn",
    "normalize_text",
    "binary_exact_search",
    "linear_contains_search",
    "linear_exact_search",
    "search_field_value",
    "sort_field_value",
]
