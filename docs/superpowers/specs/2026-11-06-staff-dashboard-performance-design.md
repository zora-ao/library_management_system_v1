# Staff Dashboard Performance Design

## Intent

Make the shared admin/librarian dashboard load quickly over the high-latency Supabase connection without changing circulation behavior, permissions, or the data shown to staff.

## Goals and constraints

- Replace the dashboard's three librarian requests and four admin requests with one role-aware staff-only request.
- Return the same counts, urgent rows, recent rows, and seven-day activity currently rendered by the page.
- Keep complete users, books, categories, and borrow APIs for their dedicated management pages.
- Preserve live authorization on every request and refresh dashboard data after relevant mutations.
- Remove the `/api/users` student-profile N+1 for the users management page.
- Do not change database providers, credentials, schemas, circulation status transitions, or role permissions.
- Use the portable IANA `tzdata` package so named browser timezones behave consistently on Windows and Linux.

## Approach

The chosen approach is a compact `/api/dashboard` endpoint backed by aggregate and bounded queries, consumed by one TanStack Query hook with a short stale time and window-focus refresh. This was selected over client-side reuse of full collections because full borrow history and the 1,000-book catalog are the dominant payload/round-trip costs, and over long-lived caching because availability and circulation status must remain fresh.

The endpoint returns role-independent library and circulation metrics plus `total_users` only for administrators. It returns at most three attention rows and four recent rows. Seven-day activity is aggregated in the backend using the browser's IANA timezone (with its numeric offset as a fallback) so existing local-day behavior and daylight-saving boundaries are preserved. Relevant mutations invalidate the dashboard query; dedicated management queries retain their existing invalidation behavior.

The existing users endpoint will eager-load `User.student`, eliminating per-user lazy queries without changing its response.

## Non-goals

- Reworking dedicated management pages or their pagination.
- Removing connection health checks or changing Supabase pool settings.
- Adding database migrations or changing production configuration.
