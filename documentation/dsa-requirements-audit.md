# ITEC 104 DSA Requirements Audit

**System:** Pahina Library Management System  
**Audit date:** November 7, 2026  
**Scope:** React/TypeScript frontend, Flask/Python backend, SQLAlchemy models/services/routes, Alembic migrations, and automated tests in this repository. The configured database contents and live Supabase query plans were not inspected. No application code was changed as part of this audit.

## Executive conclusion

The project is **partially compliant** with the ITEC 104 final-project requirements.

The application has substantial working functionality: book and category CRUD, circulation workflows, favorites, reviews, validation, missing-record handling in most paths, client-side searches and sorts, database filtering and ordering, PostgreSQL-backed indexed lookups, and automated tests. These are good foundations for the integration and demonstration portions of the rubric.

The main grading risk is that the repository contains **no evidenced custom Python implementation of a sorting algorithm, searching algorithm, hash table, graph traversal, or tree operation**. Current sorting and searching are performed by JavaScript's `Array.sort`, `Array.filter`, and `String.includes`; Python's `sorted`; SQL `ORDER BY` and `ILIKE`; or SQLAlchemy/PostgreSQL lookup behavior. JavaScript `Set` and `Map` are used effectively, but they are library/runtime-provided data structures. Password and backup hashing are cryptographic operations, not hash-table record lookup.

The project also lacks DSA-focused Big-O/space analysis, controlled algorithm comparisons, collision tests, scale tests, and a final-demonstration path for hashing plus a graph or tree. Those gaps affect the highest-value rubric categories: correctness of DSA implementations (30), integration (20), and algorithm analysis/performance (15).

### Verification performed during this audit

- Backend: `.venv\Scripts\python.exe -m unittest discover tests -v` from `backend` — **149 tests passed; 1 PostgreSQL backup/restore integration suite skipped** because `TEST_DATABASE_URL` was not configured. The run emitted SQLite resource warnings and test-only JWT key-length warnings, but no test failed.
- Frontend: `npm test` from `frontend` — **34 test files passed; 162 tests passed**.
- No live Supabase query plan, production dataset, or destructive backup/restore integration test was run. Database-index and deployed-performance claims therefore remain **Needs Verification**.

## Status meanings

- **Met** — the requirement is implemented and directly evidenced in the inspected code.
- **Partially Met** — related functionality exists, but an important part of the stated DSA requirement is absent or library-provided.
- **Missing** — no implementation or documentation satisfying the requirement was found.
- **Needs Verification** — code suggests the capability, but the deployed database/runtime or an executed demonstration is required to confirm it.

## Requirements compliance checklist

| Requirement | Status | Evidence and audit finding |
|---|---|---|
| 1.1 Add, view, update, and delete records | **Met** | Books expose create/read/update/archive/restore endpoints in `backend/app/blueprints/books/routes.py:122-186`; core create/update/archive/restore logic is in `backend/app/services/book_service.py:184-334`. Categories expose all four operations in `backend/app/blueprints/category/routes.py:10-59` and `backend/app/services/category_service.py:7-97`. Favorites add/list/remove in `backend/app/blueprints/books/routes.py:12-39`. “Delete book” is intentionally a soft delete/archive, not physical deletion. |
| 1.2 Organize records using appropriate data structures | **Partially Met** | PostgreSQL tables and foreign-key relationships model books, users, categories, borrows, reviews, and favorites (`backend/app/models/book.py:29-44`, `backend/app/models/borrow.py:20-32`, `backend/app/models/favorite.py:7-22`). Frontend arrays, sets, and maps organize view data (`frontend/src/features/books/lib/bookListView.ts:32-72`, `frontend/src/pages/adminPage/BooksListPage.tsx:50-56`). These structures are appropriate, but most are ORM/database/runtime facilities rather than student-implemented DSA structures. |
| 1.3 Handle invalid input and missing records | **Partially Met** | Integer/UUID validation exists in `BookService._parse_book_integer` and `_parse_uuid` (`backend/app/services/book_service.py:13-42`); missing books are returned as 404 in `backend/app/blueprints/books/routes.py:148-185`; borrow transitions validate IDs, records, states, and stock in `backend/app/services/borrow_service.py:14-20,59-81,98-135,152-214`. However, missing-category handling is inconsistent: `delete_category` returns `{"message": "Category not found"}` instead of raising (`backend/app/services/category_service.py:75-80`), so the route returns HTTP 200 (`backend/app/blueprints/category/routes.py:14-19`), and update maps a missing category to 400 rather than 404 (`backend/app/blueprints/category/routes.py:31-35`). Public catalog `page`/`limit` values are accepted without explicit bounds validation (`backend/app/blueprints/books/routes.py:192-201`). |
| 2.1 Implement searching algorithms | **Partially Met** | User-facing linear scans exist through `filter`/`includes`: book staff search (`frontend/src/features/books/lib/bookListView.ts:32-45`), catalog search (`frontend/src/pages/usersPage/BookCatalogPage.tsx:19-22`), users (`frontend/src/features/auth/lib/userWorkspace.ts:37-51`), borrow requests (`frontend/src/features/borrows/lib/borrowRequestView.ts:44-58`), and loans (`frontend/src/features/borrows/lib/loanView.ts:73-77`). The backend also performs SQL substring search with `ILIKE` (`backend/app/services/book_service.py:147-163`). No custom Python linear-search or binary-search implementation was found. |
| 2.2 Implement sorting algorithms | **Partially Met** | Sorting is integrated into books, categories, users, loans, borrow requests, reviews, favorites, and notifications. Examples: `filterAndSortBooks` (`frontend/src/features/books/lib/bookListView.ts:47-54`), `filterAndSortCategories` (`frontend/src/features/books/lib/categoryWorkspace.ts:17-27`), `sortBorrowRequests` (`frontend/src/features/borrows/lib/borrowRequestView.ts:11-18`), and SQL ordering (`backend/app/services/book_service.py:166-181`; `backend/app/services/borrow_service.py:23-40`). All are JavaScript/Python/database-provided sorts; no custom Python merge sort, quicksort, insertion sort, or comparable implementation was found. |
| 2.3 Efficient record lookup using hashing | **Missing** | JavaScript `Set`/`Map` provide runtime hash-based membership/deduplication (`frontend/src/features/books/lib/bookListView.ts:57-65`; `frontend/src/pages/adminPage/BooksListPage.tsx:50`; `frontend/src/components/layout/NotificationsModal.tsx:224-238`). No custom Python hash table, hash function for record keys, collision handling, resizing/load-factor policy, or hash-based lookup feature was found. Password hashes (`backend/app/models/user.py:52-61`) and SHA-256 backup integrity (`backend/app/services/backup_service.py:3,44,74-79`) are cryptographic hashing, not record lookup. |
| 2.4 Process data using other appropriate data structures | **Partially Met** | Sets classify circulation statuses (`frontend/src/features/books/lib/bookListView.ts:57-65`; `frontend/src/features/auth/lib/userWorkspace.ts:15-34`), a map deduplicates category IDs (`frontend/src/pages/adminPage/BooksListPage.tsx:50`), arrays/lists drive filtering and pagination, and tuples hold fixed backend status groups (`backend/app/services/dashboard_service.py:12-16`). These are useful real features but are runtime-provided structures. No custom queue, stack, heap/priority queue, linked list, tree, or graph representation was found. |
| 3.1 Integrate multiple data structures and algorithms into actual features | **Partially Met** | Search/sort/set/map operations are integrated into actual catalog, staff books, user, circulation, request, favorites, and notification screens. Examples of UI wiring are `frontend/src/pages/usersPage/BookCatalogPage.tsx:19-30`, `frontend/src/pages/adminPage/BooksListPage.tsx:48-56`, and `frontend/src/features/auth/components/UserTable.tsx:42-56`. The missing part is demonstrable custom DSA implementation, especially in Python. |
| 3.2 Explain why each structure/algorithm is appropriate | **Missing** | No DSA design document or code-level explanation comparing structures/algorithms was found. Existing performance documents discuss API/database latency, not DSA selection or asymptotic analysis. |
| 3.3 Demonstrate functionality with realistic test data | **Partially Met** | Tests use realistic books, categories, users, statuses, and dates: `Clean Code`, `Dune`, availability values, and circulation statuses in `frontend/src/features/books/lib/bookListView.test.ts:12-63`; categories in `frontend/src/features/books/lib/categoryWorkspace.test.ts:4-27`; borrow requests in `frontend/src/features/borrows/lib/borrowRequestView.test.ts:11-79`; and service-level book/favorite workflows in `backend/tests/test_book_service.py:302-412`. Datasets are small and do not exercise custom algorithms, hash collisions, large inputs, graph traversal, or comparative performance. |
| 4.1 Analyze time complexity with Big-O notation | **Missing** | No Big-O analysis was found in source or documentation. `backend/app/performance.py:32-121` records request/query timings and slow SQL statements, but empirical API timing is not asymptotic algorithm analysis. |
| 4.2 Discuss space complexity | **Missing** | No space-complexity analysis was found. Several client operations copy arrays before sorting, but their memory cost is undocumented (`frontend/src/features/books/lib/bookListView.ts:47`; `frontend/src/features/borrows/lib/borrowRequestView.ts:15`). |
| 4.3 Compare at least two relevant approaches | **Missing** | No controlled comparison such as linear vs binary search, built-in vs custom merge sort, list scan vs hash lookup, or simple related-book query vs graph traversal was found. Existing performance reports compare API behavior, not DSA approaches. |
| 5.1 Demonstrate sorting and searching | **Partially Met** | These can be shown in the existing UI, but only as built-in/runtime/database behavior. The staff books, categories, users, borrow requests, loans, student catalog, and favorites screens expose working search/sort controls. |
| 5.2 Demonstrate hashing | **Missing** | No hash-table lookup operation exists. JavaScript Set/Map membership and cryptographic hashes should not be presented as a custom hashing implementation. |
| 5.3 Demonstrate a relevant graph or tree operation | **Missing** | The current recommendation query uses a SQL category/author predicate and `LIMIT`, not a graph (`backend/app/services/book_service.py:336-345`). PostgreSQL's internal B-tree indexes are not an application-level tree implementation or traversal. No BFS, DFS, adjacency list/matrix, BST, AVL tree, or tree traversal was found. |
| 5.4 Explain selection, performance, testing, and limitations | **Partially Met** | The repository has broad automated testing and API performance diagnostics, but no consolidated DSA rationale, Big-O/space analysis, algorithm comparison, or DSA-specific limitation discussion. |

## Evidence-based inventory of current structures and algorithms

### Application data structures currently used

| Structure | Actual use | Classification |
|---|---|---|
| Python lists/list comprehensions | Serialize result rows and models, assemble dashboard metrics, hold status groups; examples in `backend/app/services/category_service.py:18-21` and `backend/app/services/dashboard_service.py:55-87,137-145`. | Built-in Python structure; application logic, not a custom list implementation. |
| Python dictionaries | API/model serialization (`backend/app/models/book.py:108-130`), dashboard result assembly (`backend/app/services/dashboard_service.py:126-150`), backup manifests/counts. | Built-in hash map. Useful, but not a custom hash-table implementation. |
| Python tuples | Fixed attention statuses (`backend/app/services/dashboard_service.py:12-16`) and fixed metadata such as schema revisions. | Built-in immutable sequence. |
| TypeScript/JavaScript arrays | Primary frontend record collections; filtering, sorting, aggregation, pagination, and rendering throughout `frontend/src`. | Runtime-provided dynamic arrays. |
| JavaScript `Set` | Average constant-time status membership and notification-read membership (`frontend/src/features/books/lib/bookListView.ts:57-65`; `frontend/src/components/layout/NotificationsModal.tsx:224-238`). | Runtime-provided hash set, not custom. |
| JavaScript `Map` | Deduplicate category ID/name pairs before sorting in `frontend/src/pages/adminPage/BooksListPage.tsx:50`. | Runtime-provided hash map, not custom. |
| Relational tables and relationships | UUID-keyed books, categories, users, borrows, reviews, favorites; relationships in `backend/app/models/book.py:41-44`, `backend/app/models/user.py:19-20`, and `backend/app/models/favorite.py:21-22`. | PostgreSQL/SQLAlchemy data model, not an in-memory custom DSA. |
| Borrow-state constants/state transitions | Pending request → ready for pickup → borrowed → pending return → returned, plus rejected/overdue; `backend/app/models/borrow.py:11-18` and `backend/app/services/borrow_service.py:59-229`. | Finite-state workflow. Valuable domain logic, but not by itself a required search/sort/hash/graph/tree implementation. |

### Searching currently used

| Operation | Evidence | What it actually is |
|---|---|---|
| Staff book search | `filterAndSortBooks`, `frontend/src/features/books/lib/bookListView.ts:32-45` | Linear scan over the loaded array plus built-in substring search over concatenated metadata. |
| Student catalog search | `frontend/src/pages/usersPage/BookCatalogPage.tsx:19-22` | Linear array filtering and built-in substring matching in the browser. The API fetches up to 1,000 books (`frontend/src/features/books/api/books.ts:33-38`), so client search is incomplete if active records exceed that limit. |
| User search | `filterAndSortUsers`, `frontend/src/features/auth/lib/userWorkspace.ts:37-51` | Linear scan with built-in `includes`. |
| Request/loan search | `frontend/src/features/borrows/lib/borrowRequestView.ts:44-58`; `frontend/src/features/borrows/lib/loanView.ts:73-77` | Linear scan across several fields, IDs, and generated references. |
| Backend catalog search | `BookService.get_paginated_books`, `backend/app/services/book_service.py:147-163` | SQLAlchemy-generated PostgreSQL `ILIKE '%query%'`, not a custom Python search. No title/author trigram or full-text index migration was found. |
| ID lookup | `db.session.get` examples in `backend/app/services/book_service.py:64` and `backend/app/services/borrow_service.py:63,102,125,133` | ORM primary-key lookup, normally backed by PostgreSQL's primary-key B-tree index. It is not hashing implemented by the application. |

### Sorting currently used

| Operation | Evidence | What it actually is |
|---|---|---|
| Books | `frontend/src/features/books/lib/bookListView.ts:47-54`; `frontend/src/pages/usersPage/BookCatalogPage.tsx:22-23` | JavaScript `Array.sort` with application comparators. The runtime chooses the sort implementation. |
| Categories | `frontend/src/features/books/lib/categoryWorkspace.ts:17-27` | JavaScript `Array.sort`; SQL also orders categories by name at `backend/app/services/category_service.py:8-16`. |
| Users | `frontend/src/features/auth/lib/userWorkspace.ts:37-51` | JavaScript `Array.sort` by name/date. |
| Borrow requests and loans | `frontend/src/features/borrows/lib/borrowRequestView.ts:11-31`; `frontend/src/features/borrows/borrow-view.ts:38-56`; `frontend/src/pages/adminPage/AdminBorrowsPage.tsx:49-74` | JavaScript `Array.sort` by created/approved/due/return dates. |
| Backend records | `backend/app/services/book_service.py:166-181`; `backend/app/services/borrow_service.py:23-40`; `backend/app/services/dashboard_service.py:112-123` | PostgreSQL `ORDER BY` generated through SQLAlchemy. Database planner/implementation, not custom Python sorting. |
| Performance diagnostics | `backend/app/performance.py:116-118` | Python built-in `sorted` selects the five slowest queries. This is not a student-implemented sorting algorithm. |

### Hashing and indexes currently used

| Mechanism | Evidence | DSA-credit interpretation |
|---|---|---|
| Password hashing | `backend/app/models/user.py:4,52-61` | Werkzeug security library. Cryptographic password protection, not record lookup. |
| SHA-256 backup digest | `backend/app/services/backup_service.py:3,44,74-79`; envelope hashing in `backend/app/services/backup_envelope.py:134-183,297` | Library-provided cryptographic integrity checking. Time is linear in bytes, but it is not a hash table. |
| Primary/unique database indexes | UUID primary key in `backend/app/models/base.py:8-9`; unique ISBN in `backend/app/models/book.py:29`; unique username/email and indexed Google ID in `backend/app/models/user.py:9-16`. | PostgreSQL normally implements these constraints/indexes with B-trees. Efficient and production-appropriate, but database-provided and not custom hashing. |
| Favorite indexes | Model declarations at `backend/app/models/favorite.py:9-17`; migrations at `backend/migrations/versions/a1b2c3d4e5f6_add_favorites_table.py:19-36`. | PostgreSQL indexes support lookup/join performance. Not custom hashing. |
| JavaScript Set/Map | Status sets and category map cited above. | Genuine hash-based runtime structures, useful as supporting evidence, but no custom implementation, collision logic, or Python hashing feature. |

### Index and query limitations that need live verification

- The inspected migrations declare indexes for `users.google_id` and `favorites.user_id`/`favorites.book_id`, plus indexes created by primary-key and unique constraints. No explicit indexes were found for `books.title`, `books.author`, `books.category_id`, `books.is_deleted`, `borrows.user_id`, `borrows.book_id`, `borrows.status`, or circulation date fields.
- A normal B-tree does not efficiently serve a leading-wildcard predicate such as `ILIKE '%term%'`. The actual plan for `BookService.get_paginated_books` must be checked with `EXPLAIN (ANALYZE, BUFFERS)` against realistic Supabase data before claiming indexed search.
- SQL `ORDER BY` can use an index or perform a sort depending on filters, indexes, statistics, and table size. The application code alone cannot establish its exact deployed complexity.
- The public paginated query has no explicit `ORDER BY` (`backend/app/services/book_service.py:147-163`), so page order is not guaranteed by SQL. The student UI subsequently sorts its loaded subset/client collection, but deterministic server pagination should not be claimed.

## Existing algorithm complexity that can be documented now

Use the following notation:

- `n` — number of records loaded into the current browser collection.
- `m` — total searchable characters inspected per record.
- `r` — number of borrow records for a selected book/user.
- `b` — number of bytes in a backup file.
- `s` — number of statuses or IDs stored in a set.

| Current operation | Time complexity | Auxiliary/returned space | Notes |
|---|---:|---:|---|
| Client linear filter with substring matching | `O(n × m)` worst case | `O(n)` result array | Applies to books/users/loans/requests. `String.includes` is runtime-provided; worst-case substring details depend on the engine. |
| Client sort after filtering | `O(n log n)` expected comparison-sort bound | `O(n)` visible copy, plus engine sort workspace | Code often copies first (`[...filtered]` or `.slice()`), preserving cached input. Do not claim a specific sort such as merge sort unless it is implemented explicitly. |
| Combined client filter + sort | `O(n × m + n log n)` | `O(n)` | Most staff workspaces follow this pattern. |
| `Set.has` status/read membership | `O(1)` average, `O(s)` worst case | `O(s)` | Runtime hash-set assumptions; not guaranteed worst-case constant time. |
| `Map` category deduplication | `O(n)` average before name sorting | `O(u)` for `u` unique categories | Followed by `O(u log u)` sorting. |
| `getBookCirculation` | `O(r)` | `O(r)` | It filters all borrows once and then filters the selected subset twice (`frontend/src/features/books/lib/bookListView.ts:60-72`). |
| Review average | `O(n)` | `O(1)` beyond loaded reviews | `sum` over loaded relationship at `backend/app/models/book.py:71-75`; loading the relationship itself is a database concern. |
| Backup SHA-256 stream | `O(b)` | `O(1)` with respect to file size | Uses fixed 1 MiB chunks at `backend/app/services/backup_service.py:44,74-79`. This is an integrity operation, not a hash-table lookup. |
| PostgreSQL primary-key/unique B-tree lookup | Typically `O(log n)` | Managed by PostgreSQL index pages | Needs query-plan verification; should not be labeled hash lookup. |
| `ILIKE '%term%'` without a supporting trigram/full-text index | Commonly `O(n × m)` scan-like behavior | Database-managed | Verify with the live query plan. |

## Missing and partially implemented features

### Critical missing DSA evidence

1. **No custom Python sorting algorithm.** Comparator functions exist, but the actual sort is performed by JavaScript, Python, or PostgreSQL.
2. **No custom Python searching algorithm.** Current search is array filtering/substring matching or SQL `ILIKE`; there is no explicit linear-search implementation with counters and no binary search over sorted data.
3. **No hash table for record lookup.** There is no bucket array, collision strategy, insertion/search/deletion, resizing/load factor, or integration with ISBN/member lookup.
4. **No graph or tree operation.** The existing related-book query is a simple one-hop SQL predicate, not adjacency-list construction or BFS/DFS.
5. **No DSA complexity document or comparison experiment.** Existing API performance diagnostics do not replace Big-O/space analysis.
6. **No DSA-specific correctness suite.** Existing tests cover view logic and business workflows, but not merge correctness/stability, binary-search boundaries, hash collisions/resizing, or graph cycles/disconnected nodes.

### Existing correctness/scale limitations relevant to the audit

- Client catalog search only receives at most 1,000 books (`frontend/src/features/books/api/books.ts:33-38`). The UI should not claim complete-catalog search above that size.
- Server pagination lacks an explicit deterministic order (`backend/app/services/book_service.py:147-163`).
- Missing-category response semantics are inconsistent, as described in requirement 1.3.
- Client-side admin screens fetch full collections and then filter/sort/page in memory. That is acceptable for a class dataset but should be documented as a scale limitation.
- The current related-books endpoint does not rank results or specify an order (`backend/app/services/book_service.py:336-345`); results depend on the database plan/order.

## Rubric-prioritized implementation plan

The plan below deliberately reuses existing book/catalog/recommendation workflows. It does not require changing the database provider or redesigning the application.

### Priority 0 — Correct custom implementations and tests (30 points)

Create a small, isolated backend DSA package (for example, `backend/app/dsa/`) with implementations that do not delegate the core operation to `sorted`, `list.sort`, `bisect`, `dict`, or `set`:

1. **Stable merge sort for books.** Sort by normalized title, availability, or creation date; preserve a deterministic ID tie-breaker. Return optional metrics such as comparisons and moves for the demonstration.
2. **Linear search and binary search.** Keep substring/multi-field search as a clearly named linear search. Add binary search for exact ISBN/title or title-prefix range only after merge-sorting by the same normalized key. Do not apply binary search to arbitrary substring search.
3. **Separate-chaining hash table for exact ISBN lookup.** Use a bucket array, a documented deterministic string hash, collision chains, insert/get/delete, resize threshold, and load-factor reporting. Use lists of key/value entries for buckets rather than Python `dict` as the underlying record store.
4. **Recommendation adjacency list plus BFS.** Reuse the existing related-books feature. Connect books by shared category/author and, if desired, co-borrow history; traverse breadth-first with a visited structure, depth/limit bounds, deterministic ranking, and cycle protection.

Required correctness tests:

- Empty, one-item, duplicate-key, already-sorted, reverse-sorted, mixed-case, and null/optional metadata cases.
- Merge-sort stability and input non-mutation.
- Binary-search first/last/not-found boundaries and duplicate-title range behavior.
- Forced hash collisions, overwrite policy, deletion from a collision chain, resize preservation, and missing keys.
- BFS cycles, disconnected books, depth limits, duplicate suppression, missing start node, and deterministic output.

### Priority 1 — Integrate into existing workflows (20 points) and problem analysis (10 points)

1. Add exact ISBN **Quick Lookup** to the existing staff Books List workflow and route it through the custom hash table. Keep PostgreSQL as the source of truth; document cache/index build and invalidation behavior.
2. Route one existing staff sort option through the custom merge sort. A small “algorithm details” disclosure can show input size, comparisons, and elapsed time without redesigning the page.
3. Offer clearly labeled linear and binary exact/prefix search modes in the existing staff catalog demonstration. Preserve normal substring search for users who need it.
4. Replace or supplement `BookService.get_related_books` with the adjacency-list/BFS recommender so the existing book-details recommendations become the graph feature.
5. Keep DSA code separated from Flask routes and SQLAlchemy concerns. Routes should parse input, services should load/serialize models, and `app/dsa` should operate on plain records.

For each feature, document the problem, accepted input, invariants, why the chosen structure fits, and when the production database approach remains preferable.

### Priority 2 — Algorithm analysis and performance evidence (15 points)

Add a DSA analysis document and a reproducible benchmark script using generated datasets (for example 100, 1,000, 10,000, and 50,000 records). Report medians over repeated runs rather than one timing.

Required comparisons:

1. **Linear vs binary search:** linear `O(n)` with no preparation; merge-sort preparation `O(n log n)` plus binary lookup `O(log n)`. Explain that binary search pays off for repeated lookups and requires a sorted invariant.
2. **Linear scan vs custom hash lookup:** scan `O(n)` per lookup; hash-index build `O(n)` plus average `O(1)` lookup and `O(n)` storage. Include worst-case `O(n)` collision behavior and cache invalidation cost.
3. **Built-in/runtime sort vs custom merge sort:** both generally `O(n log n)` comparison-sort behavior, but built-ins are more optimized. The custom version exists for learning, instrumentation, stability proof, and grading—not to claim production superiority.
4. **Simple one-hop SQL recommendations vs BFS graph:** SQL predicate is easy and database-native; graph construction is `O(V + E)` space/time and BFS is `O(V + E)` within explored bounds, but can express multi-hop relationships.

Keep wall-clock results separate from Big-O. Include hardware/runtime, dataset generator seed, warm-up, repetitions, and limitations.

### Priority 3 — Testing and debugging evidence (10 points)

- Add focused Python unit tests for every custom structure/algorithm.
- Add service tests proving the DSA output is integrated into existing API responses.
- Add one frontend integration test per visible DSA feature.
- Use deterministic generated data and fixed seeds.
- Add invariant/property-style loops even if no property-testing library is added: compare custom merge-sort output with Python `sorted` as a test oracle; compare binary/hash results with a simple scan oracle.
- Test realistic data volume, duplicates, invalid input, and missing records. Record discovered defects and fixes for the presentation.

### Priority 4 — Demonstration and understanding (10 points), then documentation (5 points)

Prepare a repeatable demonstration dataset with colliding ISBN keys, duplicate titles, multiple categories/authors, disconnected books, and multi-hop recommendations. Add concise architecture, pseudocode, correctness invariants, complexity tables, comparison results, known limitations, and a mapping from each UI action to its Python function.

## Suggested final-presentation demonstrations

### What can be demonstrated honestly from the current repository

| Feature | Demonstration | What to say |
|---|---|---|
| CRUD and validation | Add a book, view it, edit copies/metadata, archive it, restore it; create/edit/delete a category; attempt invalid copies and a missing record. | CRUD is implemented through Flask services/SQLAlchemy. Book deletion is soft deletion. Validation and database constraints protect inventory, but missing-category semantics still need cleanup. |
| Current book search | Search title/author/ISBN in the student catalog and staff list; show no-match behavior. | This is a linear client-side scan using built-in array/string operations. The backend also has SQL `ILIKE`; neither is a custom Python search algorithm. |
| Current sorting | Sort books by title/availability/date, categories by name/count, users by date/name, and loans by due/return date. | Comparators are application code, but JavaScript/PostgreSQL performs the sort. Do not label it a custom merge/quick sort. |
| Set membership | Show that only active circulation statuses block archive and that notification read IDs are checked efficiently. | JavaScript `Set` provides average `O(1)` membership. It is a library-provided supporting structure, not the required custom hash table. |
| Map deduplication | Load active and archived books and show the unique category selector. | JavaScript `Map` deduplicates category IDs before sorting. Again, it is runtime-provided. |
| Database lookup/indexes | Fetch a book by UUID and add/remove favorites. | Primary/unique/favorite indexes are database-provided, generally B-tree based. Confirm actual performance with `EXPLAIN`; do not call this application hashing. |
| Circulation state workflow | Request → approve → pickup → return request → confirm return, including out-of-stock/duplicate-state errors. | This is strong domain/state-machine logic and realistic integration, but it does not replace the required sort/search/hash/graph evidence. |

### Demonstrations after the recommended DSA work

| DSA feature | Presentation sequence | Evidence to display |
|---|---|---|
| Custom merge sort | Start with visibly unsorted books including duplicate titles; choose title sort; show stable output and comparison count; run empty/one-item/reverse inputs. | Function name/source, split/merge visualization or trace, unit test, `O(n log n)` time and `O(n)` auxiliary space. |
| Linear vs binary search | Search the same exact/prefix target using both modes at increasing sizes; include found, first/last, duplicate, and missing cases. | Comparisons, preparation cost, timing medians, `O(n)` vs `O(log n)`, sorted-data precondition, why substring search remains linear. |
| Custom hash table | Insert books whose ISBNs intentionally collide; inspect bucket chains/load factor; look up and delete one; trigger a resize and prove all entries remain retrievable. | Hash function, bucket index calculation, collision strategy, average `O(1)`/worst `O(n)`, `O(n)` space, invalidation limitation. |
| Recommendation graph BFS | Open a book with direct and two-hop neighbors; show adjacency list, BFS queue/visited states, depth limit, and a disconnected book. | `V`/`E`, traversal order, cycle prevention, `O(V + E)` time/space over the explored graph, comparison with the current one-hop SQL query. |
| Testing/debugging | Run focused DSA tests live; briefly show a forced collision and graph-cycle test. | Passing test count, realistic fixtures, edge cases, oracle comparisons, and one bug/fix story. |
| Performance/limitations | Run the reproducible benchmark or show saved results for increasing `n`. | Big-O table beside measured medians; explain constants, cache build cost, database superiority for production-scale persistent data, and multi-worker cache consistency. |

## Recommended analysis wording for each proposed algorithm

### Stable merge sort

- **Why appropriate:** predictable `O(n log n)` performance, stable ordering for duplicate titles, and easy comparison/move instrumentation.
- **Time:** best/average/worst `O(n log n)` for the conventional implementation.
- **Space:** `O(n)` auxiliary arrays plus recursion depth `O(log n)`.
- **Compare with:** JavaScript/Python built-in sort. Built-ins should be faster in production; the custom version demonstrates understanding and exposes operation counts.

### Linear search

- **Why appropriate:** supports unsorted, multi-field, substring searches and has no preprocessing cost.
- **Time:** best `O(1)` if the first record matches; average/worst `O(n)` record checks, with field/string inspection cost included separately.
- **Space:** `O(1)` for first-match lookup or `O(k)` for `k` returned matches.
- **Compare with:** binary search and hash lookup.

### Binary search

- **Why appropriate:** exact or prefix-bound lookup on a collection kept sorted by the same normalized key, especially for repeated searches.
- **Time:** `O(log n)` lookup after `O(n log n)` preparation; building all matching duplicates may add `O(k)`.
- **Space:** `O(1)` iterative search, excluding sorted-copy storage.
- **Limitation:** unsuitable for arbitrary “contains” substring search and incorrect if the sorted invariant is broken.

### Separate-chaining hash table

- **Why appropriate:** exact ISBN lookups are equality-based and ISBN is intended to be unique.
- **Time:** average `O(1)` insert/get/delete under a controlled load factor; worst `O(n)` under severe collisions; resize `O(n)`.
- **Space:** `O(n + c)` for entries plus `c` buckets.
- **Compare with:** list scan `O(n)` and PostgreSQL unique B-tree lookup, usually `O(log n)` but persistent, transactional, and production-safe.
- **Limitation:** an in-memory index must be rebuilt/invalidated after create, ISBN update, archive/restore, and across multiple Flask workers.

### Adjacency-list graph with BFS

- **Why appropriate:** related-book recommendations are naturally relationships among books; an adjacency list is efficient when each book connects to relatively few others.
- **Build:** `O(V + E)` time and space for `V` books and `E` relationships, assuming grouping/index preparation avoids all-pairs comparison.
- **Traversal:** `O(V + E)` worst case within the explored graph; bounded depth/result limits reduce practical work.
- **Compare with:** the existing one-hop SQL category/author predicate, which is simpler and database-native but cannot express controlled multi-hop traversal as clearly.

## Final audit judgment

The repository already provides a credible working library system and enough real workflows to integrate DSA without major architectural changes. For ITEC 104, however, the team should not present built-in sorts, SQL queries, PostgreSQL indexes, ORM primary-key lookups, password hashing, or SHA-256 backup digests as custom DSA implementations. The safest path to rubric coverage is to add a small tested Python DSA layer for merge sort, linear/binary search, separate-chaining ISBN lookup, and BFS recommendations, then wire those functions into the existing Books List and Book Details workflows with explicit complexity analysis and comparative tests.
