"""Plain data contracts shared by Pahina's educational DSA features."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, TypeAlias


SearchField = Literal["title", "author", "isbn"]
SortField = Literal["title", "author", "available_copies", "created_at"]
SortValue: TypeAlias = str | int | datetime


@dataclass(frozen=True)
class BookRecord:
    """Immutable scalar projection of a book used by the DSA package."""

    id: str
    title: str
    author: str
    isbn: str | None
    available_copies: int
    created_at: datetime | None


@dataclass
class AlgorithmStats:
    comparisons: int = 0
    writes: int = 0
    nodes_visited: int = 0


@dataclass(frozen=True)
class SearchResult:
    records: list[BookRecord]
    stats: AlgorithmStats


@dataclass(frozen=True)
class SortResult:
    records: list[BookRecord]
    stats: AlgorithmStats


def normalize_text(value: str | None) -> str:
    """Case-fold text and collapse every run of whitespace to one space."""

    if value is None:
        return ""

    normalized: list[str] = []
    pending_space = False
    for character in value.strip().casefold():
        if character.isspace():
            pending_space = bool(normalized)
            continue
        if pending_space:
            normalized.append(" ")
            pending_space = False
        normalized.append(character)
    return "".join(normalized)


def normalize_isbn(value: str | None) -> str:
    """Remove ISBN formatting spaces/hyphens without discarding other input."""

    if value is None:
        return ""

    normalized: list[str] = []
    for character in value:
        if character == "-" or character.isspace():
            continue
        normalized.append(character)
    return "".join(normalized)


def search_field_value(record: BookRecord, field: SearchField) -> str:
    if field == "title":
        return normalize_text(record.title)
    if field == "author":
        return normalize_text(record.author)
    if field == "isbn":
        return normalize_isbn(record.isbn)
    raise ValueError(f"Unsupported search field: {field}")


def sort_field_value(record: BookRecord, field: SortField) -> SortValue:
    if field == "title":
        return normalize_text(record.title)
    if field == "author":
        return normalize_text(record.author)
    if field == "available_copies":
        return record.available_copies
    if field == "created_at":
        if record.created_at is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        if record.created_at.tzinfo is None:
            return record.created_at.replace(tzinfo=timezone.utc)
        return record.created_at.astimezone(timezone.utc)
    raise ValueError(f"Unsupported sort field: {field}")
