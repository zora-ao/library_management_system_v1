# API performance diagnosis

Date: 2026-11-05 (Asia/Manila)

## Executive conclusion

The 5–10 second responses are not caused by PostgreSQL spending seconds executing the application queries. `EXPLAIN ANALYZE` measured every representative server-side query below 0.4 ms on the current data set. The dominant cost is reaching the remote Supabase connection and then making several sequential database round trips per HTTP request.

The most important confirmed contributors are:

1. The local frontend calls the local Flask server, but that Flask process connects to `aws-0-ap-south-1.pooler.supabase.com:5432`. This is the Supabase shared pooler in **session mode**, not a local database and not the Render backend.
2. A cold DNS lookup took 1.884 s. A cold SQLAlchemy connection plus `SELECT 1` took 1.75–3.34 s, while the SQL portion was only 0.19–0.41 s.
3. Warm individual SQL round trips took roughly 90–400 ms even though PostgreSQL executed the same statements in less than 0.4 ms. Each affected request performs 4–7 measured statements in series, plus SQLAlchemy's checkout pre-ping.
4. Hidden CORS preflight requests also access the database. A cold `OPTIONS /api/books` took 2.25 s and executed two maintenance queries; a warm `OPTIONS /api/auth/login` took 0.49 s and executed the same two queries. Axios adds `Authorization` even to the public books request, making it preflighted.
5. `pool_recycle=180` makes connections older than three minutes reconnect on their next checkout. With connection establishment taking seconds, this setting can repeatedly reintroduce cold latency.
6. Protected requests query security state and the current user in JWT validation, then some endpoints query the same records again. The maintenance guard also adds two database statements to every `/api` request.

The current code does reuse SQLAlchemy connections and request-scoped sessions. It does **not** create a new engine or explicit session per request. Six concurrent cold category requests completed in parallel in 1.78 s wall time, so local worker serialization and pool exhaustion were not reproduced.

## Measurement evidence

Measurements were made through the configured application engine using read-only requests and read-only `EXPLAIN ANALYZE` statements. Current table sizes were 12 books, 25 reviews, 40 borrows, 4 categories, and 18 favorites.

### Connection and DNS

| Measurement | Result |
| --- | ---: |
| First DNS A-record lookup | 1,883.6 ms |
| Cached DNS lookups | 64.4–83.1 ms |
| Cold engine checkout + `SELECT 1` | 1,752.7–3,338.6 ms |
| SQL portion of cold `SELECT 1` | 192.2–407.4 ms |
| Warm checkout + `SELECT 1` | 293.5–488.9 ms |
| SQL portion of warm `SELECT 1` | 194.9–283.7 ms |

The gap between total checkout time and cursor execution time includes DNS when uncached, TCP/TLS/authentication, Supavisor connection setup, and `pool_pre_ping`. SQLAlchemy documents that pre-ping tests liveness on every checkout, usually with `SELECT 1`; that ping occurs below the normal cursor timing hooks used by the probe. See the [SQLAlchemy engine and pool documentation](https://docs.sqlalchemy.org/en/20/core/engines.html#pooling).

The configured hostname and port match Supabase's shared session pooler. Supabase recommends session mode for persistent IPv4-only backends and transaction mode for serverless/edge environments. See [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres).

### Warm endpoint probes

The ranges below show repeated runs on the same day and demonstrate substantial network variability.

| Endpoint | Queries | Total observed | Cursor/query time | Notes |
| --- | ---: | ---: | ---: | --- |
| `GET /api/auth/me` | 6 | 0.78–1.55 s | 0.66–1.31 s | Duplicates user/security reads; lazy-loads student |
| `GET /api/categories` | 5 | 0.65–1.44 s | 0.55–1.21 s | Actual category aggregate is sub-millisecond on server |
| `GET /api/books?limit=1000` | 4 | 0.70–1.43 s | 0.56–1.19 s | Public route; count plus joined page query |
| `GET /api/borrows/history` | 7 with one history row | 0.85–1.64 s | 0.75–1.50 s | Lazy user/book serialization adds queries |
| `GET /api/books/favorites` | 5 | 0.70–2.04 s | 0.58–1.82 s | Main favorites query already eager-loads relationships |

The newly added opt-in logger also measured the JWT blocklist/authentication callback at approximately 186–197 ms during a faster run. That callback performs two database reads.

### PostgreSQL execution time

| Representative query | PostgreSQL execution time |
| --- | ---: |
| Security-state primary-key lookup | 0.087 ms |
| Category aggregate | 0.314 ms |
| Books count | 0.068 ms |
| Books page with category/review joins | 0.287 ms |
| Borrow history filter/order | 0.079 ms |

This rules out slow PostgreSQL execution as the present cause. Query shape and missing indexes still matter as the data grows, but they do not explain the current multi-second waits.

## Actual backend execution paths

All `/api` requests first pass through `install_maintenance_guard()` in `backend/app/maintenance.py`:

1. Check out one SQLAlchemy connection. With `pool_pre_ping=True`, checkout performs a liveness round trip.
2. `db.session.get(SystemSecurityState, 1)`.
3. `SELECT pg_try_advisory_xact_lock_shared(...)`.
4. Continue to the route. Flask-SQLAlchemy removes the scoped session at app-context teardown and returns its connection to the pool.

The guard does not exclude `OPTIONS`, so CORS preflights pay the same database cost.

Protected endpoints then run `@jwt_required()` and `token_is_revoked()` from `backend/app/security_state.py`:

1. Load the current `User`.
2. Load `SystemSecurityState` again.
3. Compare active status, auth epoch, and role.

The second security-state load is visible in the live query trace. The earlier maintenance object is no longer strongly referenced when JWT validation occurs, so SQLAlchemy's identity map does not reliably eliminate the second read.

### `POST /api/auth/login`

Path: route → maintenance guard → `AuthService.login_user()` → user-by-email query → password hash check → `issue_access_token()` → security-state lookup → `user.to_dict()` → lazy student lookup.

The form disables itself while submitting, and there is only one submit handler, so no duplicate login call was found in the current React code. Password verification has CPU cost, but it cannot explain why the unrelated small GET endpoints are also slow.

### `GET /api/auth/me`

Path: maintenance guard → JWT blocklist checks → `AuthService.get_current_user()` → another user primary-key lookup → `user.to_dict()` → lazy student lookup.

Observed: six statements. Both user and security state are read twice within one request.

### `GET /api/borrows/history`

Path: maintenance guard → JWT blocklist checks → filtered `Borrow` query → serialize each row with `Borrow.to_dict()`.

`get_borrowed_history()` does not eager-load `Borrow.user` or `Borrow.book`, while `to_dict()` dereferences both. This is an N+1 query pattern. With one history row the request executed seven statements; additional distinct books can add additional round trips. The current migration/model also has no declared composite index for `(user_id, status, returned_at)`.

### `GET /api/books?limit=1000`

Path: maintenance guard → pagination count query → paginated books query with joined category and joined reviews → serialize.

This route is not JWT-protected, but the Axios interceptor still attaches `Authorization`, causing a browser preflight. The backend query does avoid N+1 by eager-loading category and reviews. However, loading every review row just to calculate rating/count expands the result set and `limit=1000` removes practical pagination at the frontend. This is a scaling inefficiency, not the current multi-second SQL bottleneck.

### `GET /api/categories`

Path: maintenance guard → JWT blocklist checks → one category/book-count aggregate.

Observed: five statements. PostgreSQL executed the actual aggregate in 0.314 ms; almost all time was connection/ping/network/auth/maintenance overhead.

### `GET /api/books/favorites`

Path: maintenance guard → JWT blocklist checks → one favorites query joined to books and eager-loaded category/reviews → serialize.

Observed: five statements. No endpoint-level N+1 was found. The frontend shorthand `/favorites` corresponds to this route.

## SQLAlchemy and pooling findings

### Confirmed

- `db = SQLAlchemy()` is created once in `backend/app/extensions.py` and initialized once by the app factory. No endpoint creates an engine.
- Flask-SQLAlchemy supplies a scoped session and removes it when the Flask app context ends. Services consistently use `db.session`; no ad-hoc `Session()` construction was found.
- Runtime pool type is `QueuePool`.
- Defaults currently apply: persistent pool size 5, max overflow 10, and pool timeout 30 s. SQLAlchemy therefore permits up to 15 simultaneous checked-out connections per process. The pool starts empty and grows on demand.
- Each measured request checked out one connection. Warm requests reported zero new DBAPI connections, confirming reuse.
- After six concurrent requests, five connections remained in the local process pool and none remained checked out.
- `pool_pre_ping=True` adds a remote liveness check to every checkout.
- `pool_recycle=180` discards connections on checkout after only three minutes of age.
- `connect_timeout=10` is a failure timeout, not a latency optimization.
- The application pool sits in front of a second pool: Supabase Supavisor session mode on port 5432. In session mode, each application-side connection holds an underlying database session and can queue when the Supabase pool's capacity is exhausted. Supabase describes that behavior in its [pooling documentation](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).

### Not confirmed

- No connection-pool wait occurred in the six-request concurrency probe.
- There is no `render.yaml`, `Procfile`, or committed Render URL/start command. Gunicorn is installed, but deployed worker/thread counts cannot be determined from this repository.
- The checked-in local frontend does not call Render. A Vercel production build could have a different build-time `VITE_API_BASE_URL`, but that external value is not present in the repository.
- Supabase compute wake-up, shared-pooler queuing, or transient ISP congestion could lengthen some cold requests to the reported 5–10 seconds, but those conditions were not directly observed during the probe.

## Frontend routing and duplicate requests

### API destination

Both `frontend/.env` and `frontend/.env.example` set:

```text
VITE_API_BASE_URL=http://127.0.0.1:5001/api
```

Therefore `npm run dev` calls local Flask. The database remains remote because local Flask reads the Supabase `DATABASE_URL`.

### Confirmed duplicate/refetch opportunities

- React is wrapped in `StrictMode` in `frontend/src/main.tsx`, so development mount/effect behavior is intentionally repeated.
- The global `QueryClient` uses all defaults. TanStack Query data is stale immediately unless a hook sets `staleTime`, and stale queries refetch on later mounts and window focus by default.
- `useBorrowHistory()` and `useBorrows()` have no `staleTime`. They are mounted in `NotificationsModal` on every catalog page and mounted again in `MyBorrowsPage`. Concurrent requests with the same key are normally deduplicated, but navigating to a later observer or refocusing the window can refetch the already-stale query.
- `useCategories()` has no `staleTime` and is used by the catalog, dashboard, categories page, category filter, category select, and category modal. Later mounts and focus events can refetch it.
- `useFavoriteBooks()` has a five-minute `staleTime`, so its many `BookCard` observers normally share/deduplicate one cached request. It is less likely to be the repeat source unless invalidated by a mutation.
- Broad mutation invalidations intentionally refetch keys such as `['borrows']`, `['books']`, `['categories']`, and `['favorite-books']`.
- Axios attaches the bearer token to every API call. This forces CORS preflight for otherwise public GETs such as `/books` and makes the hidden preflight traffic larger than necessary.

### `/auth/me` discrepancy

`getCurrentUser()` defines the `/auth/me` request in `frontend/src/features/auth/api/authApi.ts`, but repository-wide search found no caller. Current `AuthContext` restores both token and user directly from `localStorage` and performs no API request.

Accordingly, repeated `/auth/me` calls cannot be attributed to the checked-in `AuthContext`, a React effect, or TanStack Query in this revision. If they still appear after a clean restart, likely sources are a stale browser/deployed bundle, another client/tab, an uncommitted local change, or manual tooling. The new backend timing log can correlate each occurrence by method/path and time; a frontend request-ID interceptor would be a useful follow-up if the source remains unclear.

## Request serialization and worker findings

- Local Flask is launched by `backend/run.py` with Werkzeug's development server. Its threaded request handling did not serialize the concurrency probe.
- Six simultaneous cold category requests finished in 1.43–1.77 s each and 1.78 s total wall time.
- The first page-load can still generate more backend work than the visible GET list suggests because each cross-origin request with `Authorization` or JSON content type can be preceded by `OPTIONS`.
- Browser per-origin connection limits, cold creation of several Supabase sessions, or a deployed single synchronous Gunicorn worker can create queueing, but these were not confirmed from the available repository and probe. Chrome's Timing tab should be checked for `Queueing/Stalled` versus `Waiting for server response`.

## Development-only instrumentation added

Set the following only in a local development environment:

```text
PERFORMANCE_DIAGNOSTICS=true
```

The default is false and `backend/.env` was not changed. When enabled, every request logs one `PERF` JSON object with:

- `total_ms`
- `db_checkout_ms`, `db_checkout_count`, and `db_connect_count`
- `db_query_ms` and `query_count`
- `auth_ms` for the database-backed JWT revocation/authentication callback
- the five slowest SQL statements, truncated to 240 characters

SQL parameters are never logged. The checkout measurement includes time spent opening a new connection and running pre-ping, which normal cursor events do not expose. Instrumentation is installed before the maintenance guard so its totals include maintenance work and CORS preflights.

Affected files:

- `backend/app/performance.py` — request, pool-checkout, connection, and SQL event timing
- `backend/app/config.py` — opt-in flag, default false
- `backend/app/__init__.py` — installs diagnostics before maintenance hooks
- `backend/app/security_state.py` — times the DB-backed JWT validation callback
- `backend/.env.example` — documents the flag
- `backend/tests/test_performance_diagnostics.py` — verifies structured metrics and auth timing

## Recommended fixes, in priority order

No fix below was applied in this diagnosis.

1. **Reduce geographic/network distance first.** Verify the Supabase project region and the intended Render region. Put the persistent backend and database in the same or nearest available region. For local Philippine development, a remote `ap-south-1` database will always impose meaningful RTT on every statement.
2. **Stop database work for CORS preflights.** Let `OPTIONS` return CORS metadata without querying maintenance state or acquiring an advisory lock. Also avoid attaching `Authorization` to public endpoints. This removes two remote statements and a checkout from every preflight.
3. **Reduce per-request security round trips without weakening restore safety.** Reuse the already-loaded `SystemSecurityState` within the request, avoid loading the same user again in `/auth/me`, and evaluate whether the maintenance-state check and advisory-lock acquisition can be combined. Preserve immediate user deactivation, role-change, auth-epoch, and restore-lock semantics in tests.
4. **Revisit `pool_recycle=180`.** Three minutes is unusually aggressive for a persistent PostgreSQL backend and repeatedly pays the measured DNS/TLS/authentication cost. Choose a value based on Supabase/session lifetime behavior and observed stale-connection failures. Keep `pool_pre_ping` until evidence shows it is safe to remove; it costs one RTT but protects against stale sockets.
5. **Set pool limits explicitly per deployment worker.** Size `pool_size`, `max_overflow`, worker count, and threads together against Supabase's client/session limits. Do not blindly switch port 5432 to 6543: Supabase recommends session mode for persistent IPv4 backends and transaction mode for serverless/edge workloads.
6. **Remove the borrow-history N+1.** Eager-load `Borrow.book` and `Borrow.user` (or select only the response columns) and add an index suitable for the user/status/history ordering after validating it with production-sized data.
7. **Make book ratings aggregate data.** Replace joined loading of every review for `/books?limit=1000` with database-side `COUNT`/`AVG`, and restore bounded pagination in the frontend.
8. **Stabilize frontend query freshness.** Give categories and borrow queries intentional `staleTime` values, decide whether window-focus refetching is wanted, and fetch notification data only when necessary or share it explicitly with the page. Keep StrictMode; fix query lifecycle rather than disabling the development check.
9. **Resolve the `/auth/me` source before changing it.** Use a clean Vite restart, disable cache, close other tabs, and inspect the request initiator. Remove the unused API function or intentionally wire it to a single query after deciding whether local-storage user data or server validation is the desired source of truth.
10. **Make deployment concurrency explicit.** Commit a Render/Gunicorn start configuration with known worker/thread counts, then load-test it while watching `db_checkout_ms`, `db_connect_count`, pool status, and Supabase connection metrics.

## Bottom line

The current database is fast; access to it is slow and chatty. The severe latency is best explained by cold DNS/connection establishment, aggressive three-minute recycling, preflight requests that unnecessarily touch the database, and 4–7 sequential remote statements per visible request. Query tuning alone will not solve the present 5–10 second symptom.
