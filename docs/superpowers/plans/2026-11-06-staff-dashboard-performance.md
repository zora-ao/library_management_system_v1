# Staff Dashboard Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load the admin/librarian dashboard through one compact, role-aware API request and eliminate the users endpoint N+1.

**Architecture:** A focused dashboard blueprint and service produce aggregate metrics and bounded borrow previews. A dedicated frontend API/hook replaces four collection hooks on the dashboard, with targeted mutation invalidation preserving freshness.

**Tech Stack:** Flask, Flask-JWT-Extended, SQLAlchemy, React, TypeScript, TanStack Query, Vitest, unittest

**Spec:** `docs/superpowers/specs/2026-11-06-staff-dashboard-performance-design.md`

## Global Constraints

- Preserve circulation status transitions, role permissions, response semantics visible on the dashboard, and database configuration.
- Keep dedicated users/books/categories/borrow APIs intact.
- Use test-first RED/GREEN cycles; defer git commits until explicitly requested by the user.

## Review Focus

- Student access to `/api/dashboard` must remain forbidden.
- Librarian responses must not disclose the admin-only user total.
- Empty databases must return zeros and empty arrays rather than errors.
- Overdue borrowed rows must count and sort as overdue even when stored as `BORROWED`.
- Local-day activity boundaries must use the supplied browser timezone offset.

---

### Task 1: Backend dashboard summary and users N+1

**Files:**
- Create: `backend/app/blueprints/dashboard/__init__.py`
- Create: `backend/app/blueprints/dashboard/routes.py`
- Create: `backend/app/services/dashboard_service.py`
- Create: `backend/tests/test_dashboard_service.py`
- Create: `backend/tests/test_dashboard_routes.py`
- Modify: `backend/app/__init__.py`
- Modify: `backend/app/blueprints/users/routes.py`
- Modify: `backend/tests/test_user_settings_routes.py`

**Interfaces:**
- Produces: `DashboardService.get_summary(include_user_count: bool, timezone_offset_minutes: int, timezone_name: str | None = None, now_utc: datetime | None = None) -> dict`
- Produces: `GET /api/dashboard?timezone_offset_minutes=<integer>` for admin/librarian roles.

- [ ] Write service tests for exact aggregate values, bounded attention/recent rows, local-day buckets, empty data, admin-only user totals, and a fixed query-count ceiling.
- [ ] Run the service tests and verify failure because the service is absent.
- [ ] Implement the minimal aggregate and bounded eager-loaded queries.
- [ ] Run the service tests and verify they pass.
- [ ] Write route tests for staff access, student denial, offset validation, and librarian user-total omission; verify RED.
- [ ] Register and implement the route; verify GREEN.
- [ ] Add a query-count regression test for `/api/users` serialization; verify RED.
- [ ] Eager-load `User.student`; verify GREEN.

### Task 2: Frontend dashboard request and rendering

**Files:**
- Create: `frontend/src/features/dashboard/api/dashboard.ts`
- Create: `frontend/src/features/dashboard/types.ts`
- Create: `frontend/src/hooks/useDashboard.ts`
- Modify: `frontend/src/pages/adminPage/AdminDashboardPage.tsx`
- Modify: `frontend/src/pages/adminPage/AdminDashboardPage.test.tsx`

**Interfaces:**
- Consumes: backend `GET /api/dashboard` response.
- Produces: `useDashboard()` using query key `["dashboard"]`, 15-second stale time, and window-focus refresh.

- [ ] Rewrite dashboard page fixtures around the compact response and add assertions for admin totals, librarian omission, loading, and existing dashboard content; verify RED.
- [ ] Add typed API and query hook and switch the page from four collection hooks to `useDashboard`; verify GREEN.
- [ ] Run frontend typecheck/build and targeted page tests.

### Task 3: Targeted invalidation and verification

**Files:**
- Modify: `frontend/src/hooks/useAuth.ts`
- Modify: `frontend/src/hooks/useBorrows.ts`
- Modify: `frontend/src/hooks/useBooks.ts`
- Modify: `frontend/src/hooks/useCategories.ts`
- Modify or create focused hook tests as needed.
- Modify: `performance-optimization-results.md`

**Interfaces:**
- Consumes: dashboard query key `["dashboard"]`.
- Produces: invalidation after user, circulation, book, and category mutations that affect dashboard metrics.

- [ ] Add failing mutation-hook tests proving relevant successful mutations invalidate the dashboard and failed mutations do not.
- [ ] Add the minimal targeted invalidations and verify GREEN.
- [ ] Run the complete backend and frontend suites plus frontend build.
- [ ] Compare dashboard query count and cold/warm timings with the existing diagnostics where network access permits.
- [ ] Document measured results and any environmental limitations.
