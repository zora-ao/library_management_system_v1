# DSA Explorer Phase 7 Notes

## Implemented scope

Phase 7 exposes the existing backend DSA contract as a dedicated `/dsa-explorer` staff page. The route and sidebar link are available to administrators and librarians; the backend remains authoritative through `admin_required()` on `POST /api/dsa/books/run`.

The page does not query on navigation. A request is made only after a staff member presses **Run Python DSA**, and each click sends exactly one operation payload to the single DSA endpoint.

## Approved-plan deviation

The reviewed plan described a sheet launched from Books List. The latest Phase 7 request explicitly requires a responsive page, protected route, and Admin/Librarian sidebar entry, so Phase 7 implements a dedicated page instead. The production Books List page and its search, sorting, pagination, archive, and restore behavior were not changed.

## Contract limitations reflected in the UI

- `search_compare` supports exact title or author lookup only. ISBN comparison is provided by `hash_compare`.
- The API returns final records, per-run result IDs, counters, structure metrics, timings, theoretical complexity, and notes. It does not return algorithm traces, intermediate merge states, hash buckets, or tree nodes, so the frontend does not invent them.
- Comparison equivalence is calculated only from the ordered `result_ids` returned for each run.
- Relative timing bars use only `preprocessing_ns` and `algorithm_ns` from the backend. They are labeled as single-run educational samples, not benchmark results.
- Preprocessing is shown separately from algorithm execution. This is especially important for binary search, hash-table lookup, and BST range traversal.
- The endpoint caps returned results at 100. The frontend applies the same `1..100` validation, while backend validation remains authoritative.

Reproducible benchmark generation and final complexity/presentation documentation remain Phase 8 and Phase 9 work and were not started here.
