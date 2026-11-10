# Pahina ITEC 104 DSA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add correct, custom Python implementations of linear search, binary search, merge sort, a collision-handling hash table, and a meaningful binary search tree, then expose them in a staff-facing DSA Explorer without replacing or slowing the production library workflows.

**Architecture:** Add a pure-Python `app/dsa` package whose algorithms operate on immutable plain book records and never delegate their core work to SQL, `sorted`, `list.sort`, `bisect`, `dict`, `set`, or JavaScript. A new staff-only, lazy-loaded API reads the active catalog with one explicit SQL projection per user-triggered DSA run, executes one or more custom algorithms on that snapshot, and returns results plus operation counters and complexity metadata. An isolated DSA Explorer sheet opens from the existing Books List page; all current production search, sort, authentication, catalog, and borrowing paths remain unchanged.

**Tech Stack:** Python 3, Flask 3, Flask-SQLAlchemy/SQLAlchemy 2, PostgreSQL/Supabase, Python `unittest`, React 19, TypeScript, TanStack Query, Axios, Vitest, Testing Library.

**Spec:** `documentation/dsa-requirements-audit.md`

## Global Constraints

- Implement the core algorithms in Python; production SQL/ORM operations and JavaScript built-ins do not count as the DSA implementations.
- Do not replace or alter existing production book search, client-side sort, authentication, authorization, borrowing transitions, inventory rules, or database indexes.
- Do not add a catalog query to normal page load. The DSA API is called only after staff opens the explorer and explicitly runs an operation.
- Each DSA API request executes exactly one active-book projection query and performs all compared algorithms against the same in-memory snapshot.
- Do not serialize SQLAlchemy models through `Book.to_dict()` in the DSA service because it can touch relationships; select only the scalar fields required by `BookRecord`.
- Do not add a database migration or persistent cache. Rebuild the educational structures from the request snapshot so results cannot become stale across Flask workers.
- Never use `sorted`, `list.sort`, `bisect`, Python `dict`/`set` as the underlying custom hash-table or tree storage, or SQL `ORDER BY`/search predicates to perform the demonstrated algorithm.
- Python built-ins remain allowed outside the algorithm core for API JSON objects, test oracles, benchmark baselines, statistics, and normal application infrastructure.
- Enforce staff authorization with the existing `admin_required()` decorator, which permits `admin` and `librarian` roles.
- Cap user-visible returned results at 100 and reject malformed/overlong input with HTTP 400.
- Benchmarks must exclude database, HTTP, JSON, React, fixture generation, and file-writing time from timed algorithm regions.
- Benchmark output must record the fixed seed, sizes, warm-ups, repetitions, lookup count, Python version, operating system, and timestamp.
- Follow test-driven development: write a failing focused test, observe the expected failure, implement the minimum behavior, and rerun the focused and affected suites before committing.

## Review Focus

1. **Duplicate normalized titles and ISBNs:** exact search, stable merge ordering, hash updates, and BST range traversal must return deterministic results without losing records; Tasks 2-5 contain duplicate-key tests.
2. **Missing or blank metadata:** `None`/blank ISBNs must be skipped by the hash index and remain safe in linear search/sort/tree operations; Tasks 1, 2, 3, and 4 pin this behavior.
3. **Binary-search precondition:** the API must sort by the same normalized field before binary search and report preprocessing separately; Tasks 2 and 6 verify this contract.
4. **Large or hostile request input:** unknown operations, invalid fields/directions, empty required queries, over-200-character queries, and limits outside `1..100` must return 400 without a database query; Task 6 owns these tests.
5. **Production isolation:** opening or using the existing Books List filters must not call the DSA endpoint, and a failed DSA request must not affect normal catalog state; Task 7 adds these regression tests.

---

## Design decisions

### Selected approach: read-only DSA Explorer over a real catalog snapshot

The explorer is opened from the staff Books List and uses actual active-book records. It is intentionally separate from the production controls, so the team can prove its own algorithms without claiming that educational code should replace PostgreSQL or optimized runtime behavior. A comparison request loads the snapshot once, then gives both algorithms identical records and query values.

This approach provides meaningful library operations:

- Flexible title/author/ISBN discovery through custom linear search.
- Exact title lookup through custom linear and binary search comparison.
- Alphabetical, author, availability, and creation-date ordering through custom stable merge sort.
- Exact ISBN quick lookup through a custom separate-chaining hash table and a linear-scan baseline.
- Alphabetical title range browsing through a custom balanced binary search tree and in-order traversal.

### Rejected approach: replace production search and sorting

Replacing the current browser/SQL behavior would add network latency, transfer entire tables, weaken PostgreSQL pagination, and turn educational algorithms into a production bottleneck. It also risks changing workflows the user explicitly asked to preserve.

### Rejected approach: synthetic benchmark page only

A benchmark-only page would prove algorithm code but not integration into a working library system. Synthetic data remains appropriate for reproducible benchmarks, while the explorer must operate on real active books.

### Additional structure decision: balanced static BST, not FIFO queue

A title BST directly satisfies the original final-demonstration expectation for a relevant tree operation. Building a balanced, read-only tree from the custom merge-sort output enables exact title search, in-order traversal, and inclusive title-range browsing. A FIFO borrow queue was rejected for this scope: a queue becomes meaningful only if it controls approval fairness, which would require persistence, locking, retry rules, and changes to the existing borrowing workflow. The BST adds demonstration value without mutating circulation behavior.

## File and responsibility map

### Backend files to create

- `backend/app/dsa/__init__.py` — public exports for the DSA package.
- `backend/app/dsa/contracts.py` — immutable `BookRecord`, field aliases, result/stat dataclasses, and normalization helpers.
- `backend/app/dsa/search.py` — custom linear-contains, linear-exact, and iterative binary-exact search.
- `backend/app/dsa/merge_sort.py` — custom stable merge sort for book records.
- `backend/app/dsa/hash_table.py` — generic string-key separate-chaining hash table and ISBN index builder.
- `backend/app/dsa/binary_search_tree.py` — balanced static title BST with exact search, in-order traversal, and inclusive range search.
- `backend/app/services/dsa_demo_service.py` — one-query snapshot loading, algorithm orchestration, fair comparisons, response shaping, and complexity copy.
- `backend/app/blueprints/dsa/__init__.py` — blueprint package marker.
- `backend/app/blueprints/dsa/routes.py` — staff-only `POST /api/dsa/books/run` endpoint and payload validation.
- `backend/scripts/benchmark_dsa.py` — deterministic synthetic generator, benchmark runner, CLI, JSON output, and Markdown report writer.
- `backend/tests/test_dsa_contracts.py` — record normalization/field-contract tests.
- `backend/tests/test_dsa_search.py` — linear and binary correctness/edge tests.
- `backend/tests/test_dsa_merge_sort.py` — merge-sort correctness, stability, and non-mutation tests.
- `backend/tests/test_dsa_hash_table.py` — collision, update, removal, resize, and ISBN-index tests.
- `backend/tests/test_dsa_binary_search_tree.py` — balance, exact search, traversal, range, and duplicate-title tests.
- `backend/tests/test_dsa_demo_service.py` — snapshot query count, orchestration, comparison, and response tests.
- `backend/tests/test_dsa_routes.py` — authorization, validation, and response mapping tests.
- `backend/tests/test_dsa_benchmark.py` — fixture determinism, oracle equality, timing-boundary, and report-schema tests.

### Backend files to modify

- `backend/app/__init__.py:6-12,50-57` — import and register `dsa_bp`; no other application-factory behavior changes.

### Frontend files to create

- `frontend/src/features/dsa/types.ts` — exact request, response, result, metric, and operation union types.
- `frontend/src/features/dsa/api.ts` — typed `runDsaBookOperation` API call.
- `frontend/src/hooks/useDsaExplorer.ts` — TanStack mutation; no automatic query on render/open.
- `frontend/src/features/dsa/components/DsaExplorerSheet.tsx` — operation controls and accessible sheet shell.
- `frontend/src/features/dsa/components/DsaResultPanel.tsx` — book results, comparison counters, preprocessing cost, and error/empty states.
- `frontend/src/features/dsa/components/DsaComplexityReference.tsx` — concise theoretical time/space table and limitations.
- `frontend/src/features/dsa/components/DsaExplorerSheet.test.tsx` — lazy-call, operation, result, error, and production-isolation UI tests.
- `frontend/src/features/dsa/api.test.ts` — request/response path and payload tests.

### Frontend files to modify

- `frontend/src/pages/adminPage/BooksListPage.tsx:1-18,24-43,81-83,126-130` — add explorer-open state/button and render the sheet; leave existing filtering/sorting/pagination logic unchanged.
- `frontend/src/pages/adminPage/BooksListPage.test.tsx:24-44,46-192` — mock the DSA hook/component as appropriate and prove existing behavior does not trigger DSA calls.

### Documentation files to create

- `documentation/dsa-complexity-analysis.md` — algorithm rationale, invariants, time/space tables, comparisons, and limitations.
- `documentation/dsa-benchmark-results.json` — machine-readable benchmark configuration and samples/summary.
- `documentation/dsa-benchmark-results.md` — human-readable tables and interpretation generated from the same run.
- `documentation/dsa-presentation-guide.md` — repeatable final demonstration script and rubric talking points.

## Shared interfaces and API contract

Implement these names once and use them consistently in later tasks.

```python
# backend/app/dsa/contracts.py
SearchField = Literal["title", "author", "isbn"]
SortField = Literal["title", "author", "available_copies", "created_at"]

@dataclass(frozen=True)
class BookRecord:
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
```

```python
# algorithm entry points
def normalize_text(value: str | None) -> str: ...
def normalize_isbn(value: str | None) -> str: ...
def linear_contains_search(records, query, fields, limit=100) -> SearchResult: ...
def linear_exact_search(records, query, field, limit=100) -> SearchResult: ...
def binary_exact_search(sorted_records, query, field, limit=100) -> SearchResult: ...
def merge_sort_books(records, field, descending=False) -> SortResult: ...
```

The API accepts one of these payload shapes at `POST /api/dsa/books/run`:

```json
{"operation":"linear_contains","query":"martin","fields":["title","author","isbn"],"limit":25}
{"operation":"search_compare","query":"Clean Code","field":"title","limit":25}
{"operation":"merge_sort","field":"title","direction":"asc","limit":25}
{"operation":"hash_compare","query":"9780132350884","limit":25}
{"operation":"bst_range","range_start":"A","range_end":"Mzzzz","limit":25}
```

Every successful response has this stable top-level shape:

```json
{
  "operation": "search_compare",
  "dataset": {"source": "active_books", "size": 42},
  "results": [],
  "runs": [
    {
      "algorithm": "linear_search",
      "result_ids": [],
      "metrics": {
        "comparisons": 42,
        "writes": 0,
        "nodes_visited": 0,
        "collisions": null,
        "capacity": null,
        "load_factor": null,
        "preprocessing_ns": 0,
        "algorithm_ns": 12000
      },
      "complexity": {"time": "O(n)", "space": "O(k)"}
    }
  ],
  "notes": []
}
```

`results` contains the union of records referenced by `result_ids`, serialized from `BookRecord`, so the frontend can render once without duplicating full book objects in each comparison run. Nanosecond timings are educational samples, not benchmark claims; the reproducible benchmark script supplies the defensible measurements.

## Complexity targets

| Custom feature | Time | Auxiliary space | Required comparison |
|---|---:|---:|---|
| Linear contains/exact search | Best `O(1)` for first match; worst `O(n * m)` for text inspection; exact record checks `O(n)` | `O(k)` returned matches, otherwise `O(1)` | Exact linear vs binary on identical sorted snapshot and query sequence |
| Iterative binary exact search | `O(log n + k)` after sorting, where `k` duplicate matches are collected | `O(k)` output and `O(1)` search workspace | Cold path includes merge-sort preparation; warm lookup reports search separately |
| Stable merge sort | Best/average/worst `O(n log n)` | `O(n)` merge buffers plus `O(log n)` recursion stack | Custom merge sort vs Python `sorted` only in benchmark/oracle code |
| Separate-chaining hash table | Build `O(n)` average; get/put/remove average `O(1)`, worst `O(n)`; resize `O(n)` | `O(n + c)` entries plus `c` buckets | Linear exact ISBN lookup vs hash build + lookup and repeated warm lookup |
| Balanced static title BST | Build `O(n)` from merge-sorted data; exact/range start `O(log n)` when balanced; range `O(log n + k)` | `O(n)` nodes plus `O(log n)` recursion | BST exact/range operation vs binary search/in-order scan where applicable |

## Rubric mapping

| Professor rubric | Points | Plan evidence |
|---|---:|---|
| Problem Analysis | 10 | Design decisions, explicit production/non-production boundary, algorithm appropriateness, preconditions, and limitations in Tasks 1, 6, and 9. |
| Correctness of DSA Implementations | 30 | Pure implementations and focused edge/invariant tests in Tasks 2-5; built-ins used only as test/benchmark oracles. |
| Integration into Working System | 20 | Staff-only API and real-catalog explorer in Tasks 6-7; one query per explicit run; no production-path replacement. |
| Algorithm Analysis and Performance | 15 | Complexity targets above, reproducible benchmark harness in Task 8, and full analysis in Task 9. |
| Testing and Debugging | 10 | TDD steps in every task, pure unit tests, service/route/UI integration tests, oracle comparisons, and full regression verification. |
| Documentation | 5 | Audit, this plan, complexity analysis, benchmark reports, source docstrings, and presentation guide in Task 9. |
| Demonstration and Understanding | 10 | User-visible operation counters, hash collision stats, BST traversal, fair comparisons, and the scripted presentation flow in Tasks 7 and 9. |

---

### Task 1: Define immutable records, normalization, and metric contracts

**Files:**
- Create: `backend/app/dsa/__init__.py`
- Create: `backend/app/dsa/contracts.py`
- Create: `backend/tests/test_dsa_contracts.py`

**Interfaces:**
- Consumes: scalar book fields already represented by `backend/app/models/book.py`.
- Produces: `BookRecord`, `AlgorithmStats`, `SearchResult`, `SortResult`, `SearchField`, `SortField`, `normalize_text`, `normalize_isbn`, `search_field_value`, and `sort_field_value` for Tasks 2-8.

- [ ] **Step 1: Write failing normalization and record-contract tests**

Test names and required assertions:

```python
def test_normalize_text_is_case_and_whitespace_insensitive():
    self.assertEqual(normalize_text("  Clean   CODE  "), "clean code")

def test_normalize_isbn_removes_spaces_and_hyphens():
    self.assertEqual(normalize_isbn("978-0 13-235088-4"), "9780132350884")
    self.assertEqual(normalize_isbn(None), "")

def test_book_record_is_immutable_and_field_access_is_null_safe():
    record = BookRecord(..., isbn=None, created_at=None)
    self.assertEqual(search_field_value(record, "isbn"), "")
    with self.assertRaises(FrozenInstanceError):
        record.title = "Changed"
```

- [ ] **Step 2: Run the focused test and verify the expected import failure**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_contracts -v`  
Expected: FAIL because `app.dsa.contracts` does not exist.

- [ ] **Step 3: Implement the contracts and normalization helpers**

Use Unicode `casefold()`, trim leading/trailing whitespace, collapse internal whitespace with an explicit loop/helper, and keep ISBN normalization limited to whitespace/hyphen removal. Do not silently strip other characters. Field helpers must reject unsupported fields with `ValueError`.

- [ ] **Step 4: Run focused tests**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_contracts -v`  
Expected: PASS.

- [ ] **Step 5: Commit the foundation**

```powershell
git add backend/app/dsa backend/tests/test_dsa_contracts.py
git commit -m "feat: add DSA record and metric contracts"
```

---

### Task 2: Implement custom linear and binary searches

**Files:**
- Create: `backend/app/dsa/search.py`
- Create: `backend/tests/test_dsa_search.py`
- Modify: `backend/app/dsa/__init__.py`

**Interfaces:**
- Consumes: `BookRecord`, `SearchField`, `SearchResult`, `AlgorithmStats`, `normalize_text`, `normalize_isbn`, and `search_field_value` from Task 1.
- Produces: `linear_contains_search(...)`, `linear_exact_search(...)`, and `binary_exact_search(...)` for the DSA service and benchmarks.

- [ ] **Step 1: Write failing linear-search tests**

Cover:

- Empty records and blank query return an empty result without error.
- Contains search checks requested fields in record order, stops at `limit`, and does not use `filter`.
- Search is case/whitespace insensitive.
- Missing ISBN is safe.
- Exact ISBN search uses normalized ISBN; exact title/author use normalized text.
- `comparisons` is deterministic for first, middle, last, and missing matches.
- Input records are not mutated.

- [ ] **Step 2: Run and observe the missing-function failure**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_search.LinearSearchTests -v`  
Expected: FAIL because the search functions do not exist.

- [ ] **Step 3: Implement linear search with explicit loops**

`linear_contains_search` appends matching records until the limit and counts each inspected field comparison. `linear_exact_search` compares only the selected field. Do not use list comprehensions, `filter`, `any`, `index`, or database queries for the core scan.

- [ ] **Step 4: Run linear-search tests**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_search.LinearSearchTests -v`  
Expected: PASS.

- [ ] **Step 5: Write failing iterative binary-search tests**

Cover:

- Empty, one-record, first, middle, last, and missing target.
- Duplicate normalized titles return every contiguous match in deterministic record order.
- Mixed case and extra query whitespace normalize identically.
- ISBN comparison uses `normalize_isbn`.
- `limit` truncates returned duplicates but not correctness of the found range.
- No recursion and no `bisect` delegation.
- Document and test the sorted-input precondition by passing a manually sorted fixture; do not add an `O(n)` sortedness check inside the function.

- [ ] **Step 6: Run and observe the binary-search failure**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_search.BinarySearchTests -v`  
Expected: FAIL because `binary_exact_search` is missing.

- [ ] **Step 7: Implement lower-bound and upper-bound loops**

Use two explicit iterative binary searches to find the first position not less than the normalized target and the first position greater than it. Return the contiguous matching slice through an explicit append loop. Count key comparisons consistently and describe the convention in the docstring.

- [ ] **Step 8: Run all search tests and the backend regression suite**

Run:

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest tests.test_dsa_search -v
.\.venv\Scripts\python.exe -m unittest discover tests -v
```

Expected: all tests pass; the PostgreSQL integration suite may retain its documented configuration skip.

- [ ] **Step 9: Commit custom searches**

```powershell
git add backend/app/dsa backend/tests/test_dsa_search.py
git commit -m "feat: implement custom linear and binary search"
```

---

### Task 3: Implement custom stable merge sort

**Files:**
- Create: `backend/app/dsa/merge_sort.py`
- Create: `backend/tests/test_dsa_merge_sort.py`
- Modify: `backend/app/dsa/__init__.py`

**Interfaces:**
- Consumes: `BookRecord`, `SortField`, `SortResult`, `AlgorithmStats`, and field helpers from Task 1.
- Produces: `merge_sort_books(records, field, descending=False) -> SortResult`; Task 6 uses its title-ascending output before binary search and BST construction.

- [ ] **Step 1: Write failing merge-sort tests**

Required cases:

- Empty and one-item lists.
- Already sorted and reverse-sorted input.
- Title, author, available-copy, and creation-date fields in both directions.
- `None` creation dates sort after real dates in ascending order and before them in descending order; state this rule in the function docstring.
- Duplicate primary keys preserve original relative order, proving stability.
- Deterministic secondary tie-breaks are not added inside the comparator because they would defeat stability; API snapshot order is preserved for equal keys.
- Input list and records remain unchanged.
- Output equals Python `sorted` under the same test-only key function.
- `comparisons` and `writes` are positive/deterministic for a small known fixture.

- [ ] **Step 2: Run and verify failure**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_merge_sort -v`  
Expected: FAIL because `merge_sort_books` is missing.

- [ ] **Step 3: Implement recursive split/merge without built-in sorting**

Copy the input once, use a reusable auxiliary list sized to `n`, recursively split index ranges, and merge with explicit indices. Choose the left item on equality to guarantee stability. Count each key comparison and each write into the destination/auxiliary storage according to one documented convention.

- [ ] **Step 4: Run merge-sort and search tests together**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_merge_sort tests.test_dsa_search -v`  
Expected: PASS.

- [ ] **Step 5: Add an integration-style correctness test for sort then binary search**

The test must merge-sort an unsorted duplicate-title fixture by title, pass the output to `binary_exact_search`, and assert all matching IDs are returned. This pins the binary-search precondition without adding an internal scan.

- [ ] **Step 6: Run focused tests and commit**

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest tests.test_dsa_merge_sort tests.test_dsa_search -v
cd ..
git add backend/app/dsa backend/tests/test_dsa_merge_sort.py backend/tests/test_dsa_search.py
git commit -m "feat: add stable custom merge sort"
```

---

### Task 4: Implement a separate-chaining hash table and ISBN index

**Files:**
- Create: `backend/app/dsa/hash_table.py`
- Create: `backend/tests/test_dsa_hash_table.py`
- Modify: `backend/app/dsa/__init__.py`

**Interfaces:**
- Consumes: `BookRecord` and `normalize_isbn` from Task 1.
- Produces: `ChainedHashTable[V]`, `HashTableStats`, and `build_isbn_index(records, initial_capacity=11)` for Task 6 and Task 8.

Define the public table contract:

```python
class ChainedHashTable(Generic[V]):
    def __init__(self, initial_capacity: int = 11, max_load_factor: float = 0.75): ...
    def put(self, key: str, value: V) -> None: ...
    def get(self, key: str) -> V | None: ...
    def remove(self, key: str) -> bool: ...
    def __len__(self) -> int: ...
    @property
    def stats(self) -> HashTableStats: ...
```

- [ ] **Step 1: Write failing base-table tests**

Cover empty get/remove, insert/get, update without size growth, and invalid configuration. Use a deterministic polynomial rolling string hash with base 31 so tests are repeatable across Python processes; do not use Python's randomized `hash()`.

- [ ] **Step 2: Add forced-collision tests**

With capacity 5, keys `"a"` and `"f"` land in the same bucket under the documented hash. Assert both remain retrievable, removing one preserves the other, collision count increments only when a new distinct key enters an occupied bucket, and maximum chain length is reported.

- [ ] **Step 3: Add resize-preservation tests**

Insert enough keys to exceed load factor 0.75, assert capacity grows to `old_capacity * 2 + 1`, all values remain retrievable, size is unchanged by rehashing, and collision metrics distinguish user inserts from rehash work as documented.

- [ ] **Step 4: Run and observe failure**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_hash_table -v`  
Expected: FAIL because the hash table is missing.

- [ ] **Step 5: Implement buckets and collision chains with lists**

Use `list[list[_Entry[V]]]`; scan a selected bucket explicitly for put/get/remove. Do not use a Python dictionary or set to store keys, detect duplicates, or rehash. Use the documented capacity growth and normalize only at the ISBN-index adapter layer, not inside the generic table.

- [ ] **Step 6: Add ISBN-index tests**

Assert that `build_isbn_index` skips `None`/blank ISBNs, treats hyphenated and unhyphenated forms as the same normalized key, updates a duplicate normalized ISBN deterministically, and reports indexed/skipped counts. Database uniqueness should prevent duplicates in production, but the algorithm must define behavior for tests and malformed snapshots.

- [ ] **Step 7: Run focused tests and commit**

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest tests.test_dsa_hash_table -v
cd ..
git add backend/app/dsa backend/tests/test_dsa_hash_table.py
git commit -m "feat: add collision-safe ISBN hash table"
```

---

### Task 5: Implement a balanced static book-title BST

**Files:**
- Create: `backend/app/dsa/binary_search_tree.py`
- Create: `backend/tests/test_dsa_binary_search_tree.py`
- Modify: `backend/app/dsa/__init__.py`

**Interfaces:**
- Consumes: title-ascending stable output from `merge_sort_books` and normalization from Task 1.
- Produces: `BookTitleBST.from_sorted(records)`, `find_exact(title, limit=100)`, `range_search(start, end, limit=100)`, `in_order(limit=100)`, `height`, and `size` for Task 6.

- [ ] **Step 1: Write failing construction and traversal tests**

Cover empty, one-node, odd/even record counts, and a seven-record fixture. Assert in-order traversal returns normalized title order and seven records produce height 3 when constructed by recursive midpoint selection.

- [ ] **Step 2: Write failing exact/range tests**

Cover exact found/missing, duplicate normalized titles, inclusive range endpoints, an empty range, `start > end` validation, result limiting, and mixed-case boundaries. Count nodes visited. Duplicate records must not be overwritten; node keys use `(normalized_title, id)` while title queries gather all matching keys.

- [ ] **Step 3: Run and observe failure**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_binary_search_tree -v`  
Expected: FAIL because the tree is missing.

- [ ] **Step 4: Implement static balanced construction and pruned traversal**

Build nodes directly from the merge-sorted sequence by choosing midpoint indices recursively. Implement in-order and inclusive range traversal explicitly; prune left/right subtrees based on normalized boundaries. Do not use a dictionary/set index or flatten the tree before searching.

- [ ] **Step 5: Add cross-algorithm oracle tests**

Compare the BST in-order result to custom merge-sort output and exact-search IDs to custom binary-search output for deterministic fixtures. Python built-ins may be used only to prepare the expected oracle in separate assertions.

- [ ] **Step 6: Run all pure DSA tests and commit**

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest tests.test_dsa_contracts tests.test_dsa_search tests.test_dsa_merge_sort tests.test_dsa_hash_table tests.test_dsa_binary_search_tree -v
cd ..
git add backend/app/dsa backend/tests/test_dsa_binary_search_tree.py
git commit -m "feat: add balanced title search tree"
```

---

### Task 6: Add one-query DSA orchestration and a staff-only API

**Files:**
- Create: `backend/app/services/dsa_demo_service.py`
- Create: `backend/app/blueprints/dsa/__init__.py`
- Create: `backend/app/blueprints/dsa/routes.py`
- Create: `backend/tests/test_dsa_demo_service.py`
- Create: `backend/tests/test_dsa_routes.py`
- Modify: `backend/app/__init__.py:6-12,50-57`

**Interfaces:**
- Consumes: every Task 1-5 algorithm and contract.
- Produces: `DsaDemoService.run(operation, payload) -> dict` and `POST /api/dsa/books/run`; Task 7 consumes the JSON contract defined above.

- [ ] **Step 1: Write a failing snapshot-loader test**

Assert `_load_active_book_records()` calls `db.session.execute(...)` once, selects only `Book.id`, `Book.title`, `Book.author`, `Book.isbn`, `Book._available_copies`, and `Book.created_at`, filters out archived books, performs no `joinedload`, and returns plain `BookRecord` instances.

- [ ] **Step 2: Write failing service tests for all five operations**

Required assertions:

- `linear_contains` runs only custom linear search.
- `search_compare` uses one snapshot, custom merge-sort preprocessing, then custom linear exact and binary exact search; both result ID sets match.
- `merge_sort` returns custom-sorted records and comparison/write counts.
- `hash_compare` builds one custom table and compares its result with custom linear exact ISBN lookup; IDs match and collision/capacity/load-factor metrics are present.
- `bst_range` builds from the same merge-sorted snapshot and returns in-order range results, height, size, and nodes visited.
- Algorithm timers wrap only preprocessing/algorithm calls, not `_load_active_book_records()` or JSON shaping.
- The service never calls Python `sorted`/`list.sort` in production code.

- [ ] **Step 3: Run service tests and verify failure**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_demo_service -v`  
Expected: FAIL because the service is missing.

- [ ] **Step 4: Implement the service and standard response builder**

Use `time.perf_counter_ns()` around algorithm regions. Report merge-sort preprocessing separately for binary search, hash-table build separately from lookup, and BST build separately from range traversal. Add truthful notes: timings are single educational samples; production search/sort remains unchanged; binary search requires sorted input; hash worst case is linear.

- [ ] **Step 5: Write failing route authorization and validation tests**

Cover unauthenticated 401, student 403, admin/librarian 200, non-object JSON, unknown operation, missing/blank required values, unknown fields, bad directions, more than three/duplicate search fields, query/range strings over 200 characters, and limits `0`, `101`, boolean, float, and string. Patch the service and assert invalid input causes zero service/database calls.

- [ ] **Step 6: Implement route validation and blueprint registration**

Keep validation in small private helpers in `routes.py`; return `{"message": ...}` with 400 for client errors and log/return a generic 500 without exposing internals. Register `dsa_bp` in `create_app()` without reordering maintenance/error registration.

- [ ] **Step 7: Add a query-count regression test**

Run each valid operation against a seeded test app and assert exactly one catalog SQL statement is executed by the DSA service. Algorithm comparisons must not requery. Authentication/security-state queries, if present in the full app harness, must be counted separately from the service's catalog query.

- [ ] **Step 8: Run DSA backend and full backend suites**

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest tests.test_dsa_demo_service tests.test_dsa_routes -v
.\.venv\Scripts\python.exe -m unittest discover tests -v
```

Expected: PASS, with only the existing environment-dependent PostgreSQL integration skip when not configured.

- [ ] **Step 9: Commit service and API integration**

```powershell
git add backend/app/__init__.py backend/app/blueprints/dsa backend/app/services/dsa_demo_service.py backend/tests/test_dsa_demo_service.py backend/tests/test_dsa_routes.py
git commit -m "feat: expose staff DSA explorer API"
```

---

### Task 7: Integrate the user-visible DSA Explorer into Books List

**Files:**
- Create: `frontend/src/features/dsa/types.ts`
- Create: `frontend/src/features/dsa/api.ts`
- Create: `frontend/src/features/dsa/api.test.ts`
- Create: `frontend/src/hooks/useDsaExplorer.ts`
- Create: `frontend/src/features/dsa/components/DsaExplorerSheet.tsx`
- Create: `frontend/src/features/dsa/components/DsaResultPanel.tsx`
- Create: `frontend/src/features/dsa/components/DsaComplexityReference.tsx`
- Create: `frontend/src/features/dsa/components/DsaExplorerSheet.test.tsx`
- Modify: `frontend/src/pages/adminPage/BooksListPage.tsx:1-18,24-43,81-83,126-130`
- Modify: `frontend/src/pages/adminPage/BooksListPage.test.tsx`

**Interfaces:**
- Consumes: `POST /api/dsa/books/run` contract from Task 6 and the existing sheet/button/table primitives.
- Produces: a staff-visible explorer launched from Books List; no route or student navigation changes.

- [ ] **Step 1: Write the failing typed API test**

Assert `runDsaBookOperation(payload)` posts to `/dsa/books/run`, passes the exact payload unchanged, and returns the typed response data.

- [ ] **Step 2: Add exact TypeScript unions and response types**

Model the five operations, valid field/direction values, nullable metrics, `DsaBookRecord`, dataset metadata, runs, complexity, and notes. Do not use `any`.

- [ ] **Step 3: Implement API and mutation hook, then run the API test**

Run: `cd frontend; npm.cmd test -- src/features/dsa/api.test.ts`  
Expected: PASS. The hook must be `useMutation`, not an enabled `useQuery`, so it never runs automatically.

- [ ] **Step 4: Write failing explorer interaction tests**

Cover:

- Opening the sheet performs no request.
- Linear contains controls submit query/fields/limit and render results/counters.
- Search comparison displays separate linear, merge-preprocessing, and binary metrics and matching result status.
- Merge-sort controls submit field/direction.
- Hash comparison shows collisions, capacity, load factor, build time, and lookup time.
- BST range shows height, node count, nodes visited, and in-order results.
- Empty results, API 400 message, generic failure, loading, and retry states are accessible.
- Complexity reference distinguishes theoretical Big-O from one-run timings.
- Closing/reopening does not mutate the normal Books List search/sort/page state.

- [ ] **Step 5: Implement the sheet and result components**

Use one operation selector with operation-specific form controls, a “Run Python DSA” button, a results table limited by the response, and a compact explanation/complexity panel. Clearly label the feature “Educational DSA Explorer” and state that production controls remain unchanged. Do not present nanosecond samples as benchmark results.

- [ ] **Step 6: Add the Books List launch button without touching its algorithms**

Add a header button next to Categories/Add book and render `DsaExplorerSheet` at the page root. Do not change `filterAndSortBooks`, existing query keys, pagination, archive/restore state, or request timing.

- [ ] **Step 7: Add production-isolation regression tests**

In `BooksListPage.test.tsx`, assert the existing search/category/availability/sort/pagination tests still pass and no DSA mutation runs during render, filtering, sorting, paging, archive, or restore. Only clicking “DSA Explorer” and then “Run Python DSA” may call it.

- [ ] **Step 8: Run focused frontend tests, full tests, and build**

```powershell
cd frontend
npm.cmd test -- src/features/dsa/api.test.ts src/features/dsa/components/DsaExplorerSheet.test.tsx src/pages/adminPage/BooksListPage.test.tsx
npm.cmd test
npm.cmd run build
```

Expected: all tests and the TypeScript/Vite build pass.

- [ ] **Step 9: Commit user-visible integration**

```powershell
git add frontend/src/features/dsa frontend/src/hooks/useDsaExplorer.ts frontend/src/pages/adminPage/BooksListPage.tsx frontend/src/pages/adminPage/BooksListPage.test.tsx
git commit -m "feat: add staff DSA explorer"
```

---

### Task 8: Build fair, reproducible benchmarks

**Files:**
- Create: `backend/scripts/benchmark_dsa.py`
- Create: `backend/tests/test_dsa_benchmark.py`
- Create when benchmark is run: `documentation/dsa-benchmark-results.json`
- Create when benchmark is run: `documentation/dsa-benchmark-results.md`

**Interfaces:**
- Consumes: Tasks 1-5 algorithms only; it must not import Flask, SQLAlchemy, or call the database/network.
- Produces: `BenchmarkConfig`, `generate_records(size, seed)`, `run_benchmarks(config)`, and CLI/report output used by Task 9.

- [ ] **Step 1: Write failing deterministic-generator tests**

Assert identical `(size, seed)` inputs produce identical `BookRecord` sequences; a different seed changes them; fixtures include controlled duplicate titles, missing ISBNs, normalized-ISBN variants, found/missing lookup targets, and enough keys to exercise collision/resizing.

- [ ] **Step 2: Write failing benchmark correctness-gate tests**

Before recording any timing, each case must assert:

- Linear exact and binary exact return the same IDs.
- Linear ISBN and hash lookup return the same ID/absence.
- Custom merge-sort records equal the Python `sorted` baseline under the same key and stability expectation.
- BST in-order records equal custom merge-sort output; BST exact results equal binary exact results.

If an oracle differs, raise and produce no report.

- [ ] **Step 3: Write failing configuration/report-schema tests**

Validate positive sizes/warmups/repetitions/lookups, fixed seed, unique ascending sizes, and JSON fields for environment/config/cases/samples/summary/operation counters. Do not assert wall-clock thresholds in tests.

- [ ] **Step 4: Implement timing isolation and fair cases**

For each size, generate the fixture once outside timed regions. Use `time.perf_counter_ns()`, warm up each callable, run the same deterministic target sequence, and alternate baseline/custom order between repetitions to reduce order bias. Disable garbage collection only around the timed callable and restore its prior state in `finally`.

Required comparisons:

1. **Exact title:** linear lookup versus binary lookup on pre-sorted data; report merge-sort preprocessing separately and also calculate cold total.
2. **Exact ISBN:** repeated linear scan versus repeated hash lookup; report hash build separately and also calculate cold total.
3. **Sorting:** custom merge sort versus Python `sorted`, each receiving an equivalent fresh list and identical key.
4. **Title lookup/range:** BST build/search/range versus binary exact and linear range baseline, with preprocessing separated.

Use medians and percentile summaries over raw recorded samples. Keep operation counts beside timing so conclusions do not depend only on noisy clocks.

- [ ] **Step 5: Run benchmark unit tests**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_dsa_benchmark -v`  
Expected: PASS quickly with tiny test configurations.

- [ ] **Step 6: Run the committed benchmark configuration**

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\benchmark_dsa.py --sizes 100 1000 10000 50000 --seed 104 --warmups 5 --repetitions 25 --lookups 200 --json-output ..\documentation\dsa-benchmark-results.json --markdown-output ..\documentation\dsa-benchmark-results.md
```

Expected: exit 0; both reports state the same configuration and summaries. If the full run is impractical on presentation hardware, reduce only `--repetitions`, record that exact value, and do not reuse results from a different configuration without relabeling.

- [ ] **Step 7: Inspect results for fairness, not desired outcomes**

Confirm sample counts match configuration, no correctness gate failed, no I/O/database time entered timed regions, and results do not claim custom Python is faster when evidence says otherwise. Explain cold versus warm break-even behavior.

- [ ] **Step 8: Commit harness and generated evidence**

```powershell
git add backend/scripts/benchmark_dsa.py backend/tests/test_dsa_benchmark.py documentation/dsa-benchmark-results.json documentation/dsa-benchmark-results.md
git commit -m "test: add reproducible DSA benchmarks"
```

---

### Task 9: Complete complexity, rubric, and presentation documentation

**Files:**
- Create: `documentation/dsa-complexity-analysis.md`
- Create: `documentation/dsa-presentation-guide.md`
- Modify after implementation evidence exists: `documentation/dsa-requirements-audit.md`
- Verify: `documentation/dsa-benchmark-results.md`

**Interfaces:**
- Consumes: actual signatures, tests, API screenshots/results, and benchmark output from Tasks 1-8.
- Produces: the final grading evidence and repeatable presentation flow.

- [ ] **Step 1: Write the complexity analysis from implemented behavior**

For every algorithm include:

- Problem and library workflow.
- Input/precondition/invariant.
- Pseudocode matching the implementation.
- Best/average/worst time where meaningful.
- Auxiliary and output space separately.
- What each operation counter measures.
- Why the algorithm/data structure is appropriate.
- Why PostgreSQL/runtime built-ins remain preferable for normal production work.
- Limitations: binary sortedness, merge memory, hash collision/worst case and rebuild, BST static snapshot and balance dependency.

- [ ] **Step 2: Document fair comparisons and measured interpretation**

Use the generated report rather than copying timings by hand. Discuss preprocessing separately from lookup, repeated-query break-even, constant factors, Python interpreter overhead, dataset realism, and why empirical timings do not prove Big-O.

- [ ] **Step 3: Update the audit statuses using code/test evidence**

Change only requirements actually satisfied. Cite exact files/functions/tests. Preserve the distinction among custom Python, built-ins, SQL/ORM, PostgreSQL indexes, and cryptographic hashing. Mark live Supabase query-plan claims as unverified unless separately measured.

- [ ] **Step 4: Write the final presentation guide**

Use this 10-12 minute practical flow:

1. **Problem and honesty boundary (1 minute):** show existing production search/sort and explain why it is not claimed as custom DSA.
2. **Linear search (1 minute):** run contains search across title/author/ISBN; show record comparisons and `O(n * m)`/output space.
3. **Linear vs binary (2 minutes):** exact-title first/middle/missing/duplicate cases; show same result IDs, merge preprocessing, `O(n)` versus `O(log n + k)`, and the sorted-data precondition.
4. **Merge sort (1.5 minutes):** sort reverse/duplicate-title data; show stability, comparisons/writes, `O(n log n)` time, and `O(n)` auxiliary space.
5. **Hash table (2 minutes):** show ISBN quick lookup, capacity/load factor/collisions; run the forced-collision unit test and explain separate chaining, average `O(1)` and worst `O(n)`.
6. **BST (1.5 minutes):** browse an inclusive title range; show height, node count, nodes visited, and in-order result; explain balanced static build and `O(log n + k)` range start/output.
7. **Benchmarks/tests/limitations (2 minutes):** show deterministic configuration, median tables, passing focused tests, cold/warm comparisons, production isolation, and limitations.
8. **Rubric recap (30 seconds):** map each demonstrated artifact to the seven rubric categories.

Include fallback screenshots/report excerpts in case the live Supabase connection is unavailable. The pure algorithm tests and synthetic benchmark must work offline.

- [ ] **Step 5: Run final verification**

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover tests -v
cd ..\frontend
npm.cmd test
npm.cmd run build
cd ..
git diff --check
git status --short
```

Expected:

- Backend suite passes, apart from the already documented environment-dependent integration skip when unconfigured.
- All frontend tests pass.
- TypeScript/Vite build exits 0.
- No whitespace errors.
- Diff contains only planned DSA/application/documentation changes; no `.env`, credentials, generated caches, or unrelated files.

- [ ] **Step 6: Commit final documentation**

```powershell
git add documentation/dsa-complexity-analysis.md documentation/dsa-presentation-guide.md documentation/dsa-requirements-audit.md
git commit -m "docs: document DSA analysis and presentation"
```

## Completion criteria

The implementation is complete only when all statements below are evidenced:

- Linear, binary, merge-sort, hash-table, and BST core operations are visibly custom Python code and do not delegate their core work.
- Unit tests cover empty, one-item, duplicate, missing, null metadata, reverse order, collision, resize, range, and invalid-input cases.
- Cross-algorithm oracle tests prove equivalent results where approaches are compared.
- The DSA API reads the active catalog once per explicit run and never participates in normal production page load.
- Existing production search, sort, authentication, borrowing, archive/restore, and pagination tests remain green.
- Staff can run every custom feature from the Books List DSA Explorer and see results, operation counters, theoretical complexity, and limitations.
- Benchmark data is deterministic, timed fairly, reproducible from one documented command, and reports preprocessing separately.
- The final documentation maps working code and tests to every professor rubric category without relabeling SQL, built-ins, indexes, or cryptographic hashing as custom DSA.
