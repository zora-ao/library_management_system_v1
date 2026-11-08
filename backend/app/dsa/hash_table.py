"""A deterministic separate-chaining hash table for exact ISBN lookup."""

from dataclasses import dataclass
from typing import Generic, TypeVar

from app.dsa.contracts import BookRecord, normalize_isbn


V = TypeVar("V")


@dataclass
class _Entry(Generic[V]):
    key: str
    value: V


@dataclass(frozen=True)
class HashTableStats:
    collisions: int
    capacity: int
    max_chain_length: int
    resizes: int
    size: int
    load_factor: float


@dataclass(frozen=True)
class IsbnIndexResult:
    table: "ChainedHashTable[BookRecord]"
    indexed_count: int
    skipped_count: int
    duplicate_count: int


class ChainedHashTable(Generic[V]):
    """String-key table using list buckets and explicit collision chains.

    ``collisions`` counts a user insertion of a new distinct key into a
    non-empty bucket. Rehashing during resize never changes that counter.
    """

    def __init__(
        self,
        initial_capacity: int = 11,
        max_load_factor: float = 0.75,
    ) -> None:
        if (
            isinstance(initial_capacity, bool)
            or not isinstance(initial_capacity, int)
            or initial_capacity < 1
        ):
            raise ValueError("initial_capacity must be a positive integer")
        if (
            isinstance(max_load_factor, bool)
            or not isinstance(max_load_factor, (int, float))
            or max_load_factor <= 0
            or max_load_factor > 1
        ):
            raise ValueError("max_load_factor must be greater than 0 and at most 1")

        self._buckets: list[list[_Entry[V]]] = []
        bucket_index = 0
        while bucket_index < initial_capacity:
            self._buckets.append([])
            bucket_index += 1
        self._max_load_factor = float(max_load_factor)
        self._size = 0
        self._collisions = 0
        self._resizes = 0

    @staticmethod
    def _validate_key(key: str) -> None:
        if not isinstance(key, str) or not key:
            raise ValueError("key must be a non-empty string")

    @staticmethod
    def _bucket_index(key: str, capacity: int) -> int:
        value = 0
        for character in key:
            value = value * 31 + ord(character)
        return value % capacity

    def _find_entry_index(self, bucket: list[_Entry[V]], key: str) -> int:
        index = 0
        while index < len(bucket):
            if bucket[index].key == key:
                return index
            index += 1
        return -1

    def _append_rehashed_entry(self, entry: _Entry[V]) -> None:
        index = self._bucket_index(entry.key, len(self._buckets))
        self._buckets[index].append(entry)
        self._size += 1

    def _resize(self) -> None:
        old_buckets = self._buckets
        new_capacity = len(old_buckets) * 2 + 1
        self._buckets = []
        index = 0
        while index < new_capacity:
            self._buckets.append([])
            index += 1

        self._size = 0
        bucket_index = 0
        while bucket_index < len(old_buckets):
            chain = old_buckets[bucket_index]
            entry_index = 0
            while entry_index < len(chain):
                self._append_rehashed_entry(chain[entry_index])
                entry_index += 1
            bucket_index += 1
        self._resizes += 1

    def put(self, key: str, value: V) -> None:
        self._validate_key(key)
        index = self._bucket_index(key, len(self._buckets))
        bucket = self._buckets[index]
        existing_index = self._find_entry_index(bucket, key)
        if existing_index >= 0:
            bucket[existing_index].value = value
            return

        projected_load = (self._size + 1) / len(self._buckets)
        if projected_load > self._max_load_factor:
            self._resize()
            index = self._bucket_index(key, len(self._buckets))
            bucket = self._buckets[index]

        if bucket:
            self._collisions += 1
        bucket.append(_Entry(key=key, value=value))
        self._size += 1

    def get(self, key: str) -> V | None:
        self._validate_key(key)
        index = self._bucket_index(key, len(self._buckets))
        bucket = self._buckets[index]
        entry_index = self._find_entry_index(bucket, key)
        if entry_index < 0:
            return None
        return bucket[entry_index].value

    def remove(self, key: str) -> bool:
        self._validate_key(key)
        index = self._bucket_index(key, len(self._buckets))
        bucket = self._buckets[index]
        entry_index = self._find_entry_index(bucket, key)
        if entry_index < 0:
            return False
        bucket.pop(entry_index)
        self._size -= 1
        return True

    def __len__(self) -> int:
        return self._size

    @property
    def stats(self) -> HashTableStats:
        max_chain_length = 0
        index = 0
        while index < len(self._buckets):
            chain_length = len(self._buckets[index])
            if chain_length > max_chain_length:
                max_chain_length = chain_length
            index += 1
        capacity = len(self._buckets)
        return HashTableStats(
            collisions=self._collisions,
            capacity=capacity,
            max_chain_length=max_chain_length,
            resizes=self._resizes,
            size=self._size,
            load_factor=self._size / capacity,
        )


def build_isbn_index(
    records: list[BookRecord],
    initial_capacity: int = 11,
) -> IsbnIndexResult:
    """Build an ISBN index, skipping blanks and letting the last duplicate win."""

    table = ChainedHashTable[BookRecord](initial_capacity=initial_capacity)
    skipped_count = 0
    duplicate_count = 0
    for record in records:
        key = normalize_isbn(record.isbn)
        if not key:
            skipped_count += 1
            continue
        if table.get(key) is not None:
            duplicate_count += 1
        table.put(key, record)
    return IsbnIndexResult(
        table=table,
        indexed_count=len(table),
        skipped_count=skipped_count,
        duplicate_count=duplicate_count,
    )
