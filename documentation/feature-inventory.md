# Pahina Feature Inventory

**Audit basis:** Repository at commit `39199b8`, including the existing uncommitted logo changes present on November 3, 2026.

## Status key

- **Implemented:** Connected frontend/backend behavior exists, or a backend-only administrative capability is intentionally exposed through its API.
- **Partial:** Some layers exist, but the workflow, access rules, persistence, or interface is incomplete or inconsistent.
- **Unused/legacy:** Code exists but no current application path was found to invoke it.
- **Planned/unverified:** Mentioned as a possible future feature or historical plan, but no complete current implementation was verified.

## Role-access matrix

| Feature | Student | Librarian | Administrator | Status and evidence |
|---|:---:|:---:|:---:|---|
| Password registration/login | Yes | Yes, if account exists | Yes, if account exists | Implemented; new registrations always create Students |
| Google sign-in | Yes | Yes, if linked/assigned | Yes, if linked/assigned | Implemented through Google ID-token verification |
| Browse/search/filter catalog | Yes | Yes | Yes | Implemented; frontend requires authentication, raw list API is public |
| Book details and availability | Yes | Yes | Yes | Implemented |
| Borrow a book | Yes | Technically yes | Technically yes | Implemented without a Student-only role check |
| Favorites | Yes | Technically yes | Technically yes | Implemented for any authenticated user |
| Submit reviews/ratings | Yes | Technically yes | Technically yes | Implemented; multiple reviews per user/book are possible |
| Personal active borrows/history | Yes | Yes | Yes | Implemented for any authenticated account |
| Borrow notifications | Yes | Yes | Yes | Partial: computed client-side; read state only in local storage |
| Profile display name/avatar | Yes | Yes | Yes | Implemented |
| Change password | Yes for password account | Yes for password account | Yes for password account | Implemented; Google-only accounts are rejected |
| Theme preference | Yes | Yes | Yes | Implemented locally per browser/device |
| Staff dashboard | No | Yes | Yes | Implemented; only administrators see total-user metric |
| Review/reject borrow request | No | Yes | Yes | Implemented |
| Confirm pickup/start 14-day loan | No | Yes | Yes | Implemented |
| Record physical return | No | Yes | Yes | Implemented |
| View returned-loan history | Personal only | All records | All records | Implemented |
| Create/edit/archive/restore books | No | Yes | Yes | Implemented; archive blocked by active circulation |
| View categories workspace | No | Yes | Yes | Implemented page access |
| Create/update/delete category | No | API rejects | Yes | Partial role mismatch in librarian UI |
| View user directory | No | Yes | Yes | Implemented |
| Activate/deactivate another user | No | Yes | Yes | Implemented; self-change blocked |
| Change student/librarian role | No | Yes | Yes | Implemented |
| Grant/change administrator role | No | No | Yes | Implemented; self-change blocked |
| Encrypted database backup/restore | No | No | Yes | Implemented, dependent on native PostgreSQL tools/configuration |
| About/developer page | Yes | Yes | Yes | Implemented; developer role text needs academic review |

## Implemented features by functional area

### Authentication and authorization

- Password account registration and login.
- Google sign-in and account creation/linking.
- JWT bearer authentication with four-hour access-token expiration.
- Role claims and backend route decorators.
- Token invalidation after role changes, deactivation, or database restore.
- Frontend protected routes and administrator-only backup route.
- Local logout and automatic redirect on API 401.

### Catalog and collection

- Active-book catalog with title, author, ISBN, category, and availability filtering/sorting.
- Book detail view with description, category, copy availability, review statistics, related books, and same-author books.
- Staff book list with active/archived states, searching, sorting, pagination, and details.
- Book creation and editing, including Cloudinary cover upload.
- Soft archive and restore.
- Copy-count adjustment with protection against reducing below the number on loan.

### Borrowing and circulation

- Borrow request creation and duplicate-active-request prevention.
- Pending request list, detail panel, approval, and rejection reason.
- Approved reservation state and inventory decrement.
- Physical pickup confirmation and 14-day due-date assignment.
- Active/overdue/due-today views.
- Staff-recorded physical return and inventory increment.
- Student personal active and historical views.
- Rejected-request tab for staff and rejected history for the requester.

### Administration and settings

- Dashboard metrics, attention queue, quick actions, recent activity, and seven-day activity chart.
- User directory, role management, account activation/deactivation, and user loan details.
- Profile display-name and avatar management.
- Password change for password accounts.
- Light/dark appearance preference stored locally.
- Administrator-only encrypted PostgreSQL export, inspection, and restore.

## Partial or inconsistent features

| Feature | Existing parts | Missing/inconsistent parts |
|---|---|---|
| Return request | API route, service method, client API, hook, status rendering | No current student action invokes it; intended workflow is staff-recorded return |
| Category management for librarians | Staff navigation and page are visible | Mutation endpoints are administrator-only; controls do not appear role-gated |
| Student profile | Database fields and backend update handling | Current Settings page does not edit student number, course, or year level |
| Contact information | User has phone; backend accepts phone/email update | Current Settings page hides phone and disables email |
| Notifications | Borrow-derived notification modal and local read state | No database entity, backend endpoint, push delivery, email, SMS, or scheduler |
| Overdue handling | Due-date calculation, serialization, filters, staff/student labels | No scheduled persisted status transition or reminder service |
| Reviews | Create/list/statistics and UI | No one-review-per-user constraint; no edit/delete/moderation workflow |
| Backup restore evidence | Full code, extensive mocked/unit tests, skipped destructive test | No reproduced live disposable-PostgreSQL restore in this audit |
| Deployment documentation | Vercel rewrite and root setup notes | No complete production architecture, secrets, proxy, Cloudinary, or monitoring guide |

## Unused or legacy implementation found

- `frontend/src/components/layout/AuthBg.tsx`
- `frontend/src/components/layout/Footer.tsx`
- `frontend/src/features/books/components/books/BookCatalogPagination.tsx`
- `frontend/src/features/books/components/books/BookFilters.tsx`
- `frontend/src/features/books/components/categories/CategoryFilter.tsx`
- `frontend/src/features/borrows/components/BorrowsTable.tsx`
- `useReturnBook` and its current UI-disconnected API call
- React/Vite starter assets and other unreferenced public assets

These should not be described as current user-facing functionality unless the group reconnects and verifies them.

## Planned features

No authoritative product roadmap was found. Files under `docs/superpowers/plans` describe work that mostly appears to have been implemented already; they are historical implementation plans, not evidence of future scope.

**Confirmation required:** The group should provide a short approved list of genuine future features. Until then, the paper should avoid naming planned capabilities as commitments.
