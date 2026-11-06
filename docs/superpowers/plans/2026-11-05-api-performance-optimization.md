# API Performance Optimization Implementation Plan

> Execution mode: inline in the current feature branch. The binding specification is the user's request plus `performance-diagnosis.md`.

**Goal:** Remove avoidable remote database round trips and duplicate frontend fetches while preserving authentication, authorization, restore safety, borrowing transitions, and data freshness.

**Architecture:** Keep the existing Flask app factory, Flask-SQLAlchemy scoped session, Supabase session-pooler connection, and TanStack Query cache. Add request-local reuse through Flask `g`, eager-load only relationships already serialized, and configure freshness per data family. Keep production diagnostics opt-in and use them for before/after evidence.

**Constraints:** No database migration, provider change, credential change, production-setting mutation, StrictMode removal, or permission/business-logic change. Keep `pool_pre_ping`; remove the unjustified three-minute forced recycle because Supabase session mode is documented for long-lived persistent clients and pre-ping handles stale checkout sockets.

## Task 1: Preflight and request-local authentication

**Files:** `backend/tests/test_maintenance.py`, `backend/tests/test_security_state.py`, `backend/app/maintenance.py`, `backend/app/security_state.py`, `backend/app/services/auth_service.py`

1. Add failing tests proving `OPTIONS /api/*` does not touch the database, actual API methods still use the maintenance lock, a protected request reuses its authenticated user, and cache state does not cross requests.
2. Run the focused tests and record the expected failures.
3. Skip the maintenance guard for `OPTIONS`; cache the maintenance state and validated user only on Flask `g`; invalidate request state around restore-state mutations.
4. Eager-load the user/student relationship in JWT validation and login where it replaces a later serialization query.
5. Run focused auth, maintenance, CORS, and security tests.

## Task 2: Pool lifetime and borrow history N+1

**Files:** `backend/tests/test_config_and_cors.py`, `backend/tests/test_borrow_service.py`, `backend/app/config.py`, `backend/app/services/borrow_service.py`

1. Add failing tests proving no forced three-minute recycle is configured and borrow-history serialization executes one service query regardless of relationships.
2. Run the focused tests and record the expected failures.
3. Remove `pool_recycle=180`, retain `pool_pre_ping`, timeouts, and TCP keepalives; eager-load `Borrow.book` and `Borrow.user` in history.
4. Run focused and full backend suites.

## Task 3: Frontend query lifecycle

**Files:** `frontend/src/hooks/useCategories.test.tsx`, `frontend/src/hooks/useBorrowWorkflow.test.tsx`, `frontend/src/hooks/useCategories.ts`, `frontend/src/hooks/useBorrows.ts`, `frontend/src/hooks/useBooks.ts`, `frontend/src/features/auth/api/authApi.ts`

1. Add failing hook tests proving remounting category and borrow observers within their freshness windows reuses cached results.
2. Run the focused tests and record the expected failures.
3. Add a five-minute category freshness window, a short borrow/status freshness window, and a short public-book availability window. Keep focus/reconnect refetching and mutation invalidation so stale or explicitly changed data refreshes.
4. Remove only the unused `/auth/me` API wrapper after confirming there are no callers; keep StrictMode.
5. Run focused and full frontend tests plus the production build.

## Task 4: Measurement and documentation

**Files:** `performance-optimization-results.md`

1. With development diagnostics enabled, measure cold and warm representative requests against the configured read-only-capable environment without changing database settings.
2. Compare total duration, query count, checkout time, and authentication time against `performance-diagnosis.md`; distinguish deterministic query-count improvements from variable network timing.
3. Run backend and frontend full suites, build, lint where practical, and `git diff --check`.
4. Document implemented changes, unchanged risks, cold/warm evidence, tests, permissions coverage, StrictMode finding, `/auth/me` finding, and cited Supabase/SQLAlchemy/TanStack/React guidance.

## Review focus

- No request-local object can leak across Flask requests.
- CORS preflight bypass cannot bypass authentication or authorization for non-OPTIONS methods.
- Restore maintenance and auth-epoch mutation remain coherent after request caching.
- Query freshness does not leave availability, borrowing status, or role enforcement stale after a mutation.
- No production credentials or database settings are changed.
