# Performance optimization results

Measurements: 2026-11-05; final verification: 2026-11-06 (Asia/Manila)

## Outcome

The highest-amplification problems from `performance-diagnosis.md` are fixed without changing the database provider, production credentials, borrowing state machine, role rules, or restore safety:

- CORS `OPTIONS` requests now bypass the database-backed maintenance guard. A measured cold preflight fell from **2,254.2 ms / 2 SQL statements / 1 checkout** to **0.2 ms / 0 SQL statements / 0 checkouts**.
- The maintenance state and validated JWT user are reused only within the current Flask request. `/auth/me` fell from **6 SQL statements** to **3**, while user activation, role, and auth-epoch checks still run on every protected request.
- Borrow-history serialization now eager-loads `book` and `user`. Its service-level regression test fell from **3 SQL statements for one row** to **1**, and the live endpoint fell from **7 total statements** to **4**.
- The aggressive, undocumented `pool_recycle=180` churn is removed. `pool_pre_ping`, connect timeout, and TCP keepalives remain enabled for stale-connection detection and recovery.
- Categories and borrow queries now have explicit freshness windows, so later observers and development remounts reuse fresh results. Mutation invalidation is scoped to the data that actually changes.
- The unused frontend `/auth/me` wrapper was removed. There is no `/auth/me` caller in the current frontend source.

The remaining latency is predominantly remote Supabase round-trip and connection setup time. Warm protected endpoints are now roughly **0.46–0.61 seconds** in the sampled run instead of the prior **0.65–1.64 seconds** ranges, but each remaining sequential remote statement still costs roughly 90–200 ms from this development machine.

## Backend changes

### Preflight handling

`backend/app/maintenance.py` returns before any database work when `request.method == "OPTIONS"`. This does not weaken actual request protection: all non-OPTIONS `/api` requests still check persistent maintenance state and, except for the restore endpoint, acquire the shared transaction advisory lock. Flask-JWT and role decorators remain on the protected routes.

Regression coverage proves:

- preflight returns successfully with no `db.session.get()` or `execute()` call;
- normal API methods still require the maintenance flag and shared lock;
- restore remains fail-closed;
- inactive users, role changes, auth-epoch changes, and missing security state revoke tokens.

### Request-scoped security reuse

`backend/app/security_state.py` stores the loaded `SystemSecurityState` and successfully validated user on Flask `g`, with an explicit owner reference to the concrete Flask request. A new request clears both cached values even if a test or extension deliberately retains an outer application context, so no authorization decision is reused across requests or cached globally.

The JWT callback still queries the current user on every protected request and verifies:

- the user exists and is active;
- the token auth epoch matches current persistent state;
- the token role matches the current database role.

The maintenance guard's security state is reused later in the same request. `/auth/me` reuses the user already validated by the JWT callback. The JWT user query eager-loads the optional student row, eliminating the later serialization lookup. Login also eager-loads the student row and reuses the maintenance state when issuing its token.

Restore-state mutation helpers explicitly clear the request copy before bulk/native restore boundaries so finalization reloads current database state.

### Connection lifetime

The configured hostname/port is Supabase shared session mode (`pooler.supabase.com:5432`). Supabase describes session mode as appropriate for persistent IPv4 clients and long-lasting connections, and says application-side pools such as SQLAlchemy reuse persistent connections. Supabase does not document a three-minute session lifetime that would justify forced recycling. [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [Supabase pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits)

Accordingly, `pool_recycle=180` was removed rather than replaced with another arbitrary lifetime. SQLAlchemy documents `pool_pre_ping` as the reliable checkout-time stale-connection check that immediately recycles an unusable socket and invalidates older pooled connections; it remains enabled. [SQLAlchemy connection pooling](https://docs.sqlalchemy.org/en/21/core/pooling.html#disconnect-handling-pessimistic)

No Supabase setting, provider, connection string, or credential was changed.

### Borrow history

`BorrowService.get_borrowed_history()` now applies `joinedload(Borrow.book)` and `joinedload(Borrow.user)`. The response shape, filters, ordering, statuses, and permissions are unchanged.

## Frontend changes

### Query freshness

TanStack Query considers cached data stale immediately by default and refetches stale data on new observers and window focus. Explicit `staleTime` is the recommended way to avoid excessive refetches while allowing invalidation and later freshness checks. [TanStack Query important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)

Applied policies:

| Data | Freshness window | Focus behavior | Reason |
| --- | ---: | --- | --- |
| Categories | 5 minutes | Refetch once stale | Reference data; mutations invalidate immediately |
| Active/history/admin borrows | 15 seconds | Refetch once stale | Avoid duplicate observers while keeping status changes fresh |
| Public book availability | 30 seconds | Refetch once stale | Short cross-user availability window; mutations invalidate immediately |
| Favorites | Existing 5 minutes | Existing behavior | Favorite mutations already invalidate the query |
| Staff books | Existing 1 minute | Existing behavior | Staff mutations invalidate the catalog prefix |

The new hook regression tests mount an observer, unmount it, then mount a later observer with the same query key. Both categories and borrow history made two HTTP calls before the change and one after it.

### Targeted invalidation

Borrow mutations now reflect actual state transitions:

- Create request and request return: invalidate active/admin borrow data only.
- Approve borrow and confirm pickup: invalidate active/admin borrow data; approval additionally invalidates catalog availability and the affected book because it reserves a copy.
- Reject request: invalidate active/history/admin borrow data; book availability is unchanged.
- Confirm return: invalidate active/history/admin borrow data plus catalog availability and the affected book because it restores a copy.

The redundant `['books', 'staff']` invalidation was removed because invalidating the parent `['books']` prefix already covers staff and public book queries.

### StrictMode and `/auth/me`

React `StrictMode` remains enabled. React documents its extra development-only render/effect cycle as an intentional correctness check. The query freshness tests demonstrate that later/remounted observers reuse fresh cached results rather than issuing another request. [React StrictMode](https://react.dev/reference/react/StrictMode)

Before implementation, `getCurrentUser()` was defined but had no caller; `AuthContext` restores its local session from `localStorage`. The dead wrapper was removed, and repository search now finds no frontend `auth/me` reference. If `/auth/me` still appears in DevTools after a clean Vite restart with cache disabled, its source is outside the current bundle (for example another tab, stale deployed assets, an extension, or manual tooling). Server-side role and activation freshness remains enforced on every protected API request.

## Cold and warm measurements

Measurements used the existing opt-in `PERFORMANCE_DIAGNOSTICS` instrumentation and the configured Supabase database. A cold sample disposed the local SQLAlchemy pool before the request; its paired warm sample reused the newly established connection. These are single samples, so durations should be read as directional evidence rather than a benchmark distribution.

| Endpoint | Before | After cold | After warm |
| --- | --- | --- | --- |
| `OPTIONS /api/books` | 2 queries; 2,254.2 ms cold; 1,818.5 ms checkout | **0 queries; 0.2 ms; no checkout** | **0 queries; 0.2 ms; no checkout** |
| `GET /api/books?limit=1000` | 4 queries; 700–1,430 ms warm | 4 queries; 1,404.6 ms; 801.7 ms checkout | 4 queries; **615.3 ms**; 96.7 ms checkout |
| `GET /api/auth/me` | 6 queries; 780–1,550 ms warm | **3 queries**; 1,020.1 ms; 640.4 ms checkout; 101.7 ms auth | **3 queries; 463.9 ms**; 91.0 ms checkout; 94.4 ms auth |
| `GET /api/categories` | 5 queries; 650–1,440 ms warm | **4 queries**; 1,110.7 ms; 612.4 ms checkout | **4 queries; 585.3 ms**; 98.9 ms checkout |
| `GET /api/borrows/history` | 7 queries with one row; 850–1,640 ms warm | **4 queries**; 1,165.1 ms; 625.5 ms checkout | **4 queries; 612.5 ms**; 102.6 ms checkout |

Here, `db_checkout_ms` is the elapsed time from the beginning of the request until SQLAlchemy completes its first pool checkout. It includes work before the first database access plus connection establishment and `pool_pre_ping`; SQLAlchemy's checkout event does not expose pure pool-wait duration separately. The maintenance guard is the first database consumer on these measured application requests, so the value remains a useful connection-path indicator rather than an exact pool-wait measurement.

The public books endpoint remains at four statements because its count query, page query, maintenance-state read, and advisory lock are unchanged. It still benefits indirectly from zero-cost backend preflight and from no forced reconnection every three minutes.

## Verification

- Backend full suite: **139 tests passed, 1 PostgreSQL integration class skipped** because `TEST_DATABASE_URL` is not configured. This includes a regression proving request two cannot reuse request one's cached security state even under a retained outer application context.
- Frontend full suite: **32 files, 154 tests passed**.
- Frontend production build: passed; Vite retained its existing warning that the main chunk exceeds 500 kB.
- Live read-only cold/warm probes: all measured endpoints returned HTTP 200.
- Permissions: existing admin/librarian category tests, staff borrow route tests, JWT role-change tests, inactive-user tests, and auth-epoch tests passed.
- Frontend lint: the command runs but currently fails on three pre-existing errors in `NotificationsModal.tsx` and `MyBorrowsPage.tsx`, plus one existing warning in `MyFavoritesPage.tsx`. None are in files changed for this optimization.
- Database migration/provider/credentials: unchanged.

## Remaining bottlenecks and recommended follow-up

1. The local backend still reaches a remote `ap-south-1` Supabase database. Cold connection creation remains roughly 0.6–0.8 seconds in the after sample, and warm remote statements remain roughly 90–200 ms each.
2. `pool_pre_ping` intentionally costs a checkout round trip. It should remain until stale-socket behavior is measured reliably in the deployed environment.
3. Actual protected requests still perform the maintenance-state read and advisory-lock statement. Combining them safely could remove another round trip, but that requires a restore-concurrency design change and was intentionally not attempted here.
4. `/books?limit=1000` still performs count + page queries and loads review relationships to compute ratings. Database-side rating aggregates and bounded pagination remain the next query-shape improvement.
5. Deployment worker/thread and application pool sizes are still not committed in the repository. They should be sized together against Supabase session-pooler limits and observed under load before changing production settings.
