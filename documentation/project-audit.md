# Pahina: Library Management System — Repository Audit

**Audit date:** November 3, 2026

**Audited branch:** `refactor/improve-ui-design`

**Audited commit:** `39199b8` (`Merge PR #49 for validation`)

**Audit scope:** Repository structure, frontend, backend, database models and migrations, routes, services, configuration, tests, and existing documentation.

## Evidence labels

- **Verified:** Directly supported by repository code, configuration, a command result, or a reproduced test.
- **Interpretation:** A reasonable explanation of verified code. It should be reviewed by the group before being stated as project intent.
- **Confirmation required:** The repository does not contain enough evidence to make the claim.

## Audit boundary and working-tree state

This audit did not modify application source code or configuration. Before documentation work began, the working tree already contained uncommitted frontend changes related to restoring the previous transparent logo. Those changes were preserved and are not treated as part of this audit.

The audit excluded generated or third-party directories such as `frontend/node_modules`, root `node_modules`, `frontend/dist`, and `backend/.venv`. Their manifests and lock files were inspected instead.

## 1. Repository structure

| Area | Responsibility | Primary evidence |
|---|---|---|
| `frontend/src/pages` | Route-level React pages for public authentication, student-facing pages, and staff workspaces | `frontend/src/App.tsx` |
| `frontend/src/features` | Feature-oriented UI, API clients, schemas, types, and view logic | `frontend/src/features/**` |
| `frontend/src/hooks` | React Query and authentication hooks | `frontend/src/hooks/**` |
| `frontend/src/components` | Shared layout and interface components | `frontend/src/components/**` |
| `frontend/src/services/api.ts` | Axios client, JWT request header, and 401 handling | `frontend/src/services/api.ts` |
| `backend/app/blueprints` | Flask HTTP routes grouped by domain | `backend/app/blueprints/**/routes.py` |
| `backend/app/services` | Business operations and database transactions | `backend/app/services/**` |
| `backend/app/models` | SQLAlchemy entities and API serialization contracts | `backend/app/models/**` |
| `backend/app/middleware` | Role checks and JSON error handlers | `backend/app/middleware/**` |
| `backend/migrations` | Alembic schema history | `backend/migrations/versions/**` |
| `backend/tests` | Backend unit, route, service, and one destructive integration test | `backend/tests/**` |
| `docs/superpowers` | Historical feature specifications and implementation plans | `docs/superpowers/**` |

The root `README.md` gives basic setup instructions and a detailed backup/restore deployment note. `frontend/README.md` remains the default React/Vite template and does not document Pahina-specific frontend behavior.

## 2. Verified technology and architecture

### Frontend

- React 19 and TypeScript 6, built by Vite 8 (`frontend/package.json`, `frontend/vite.config.ts`).
- Tailwind CSS 4 through the Vite plugin, supplemented by project CSS files (`frontend/src/index.css`, page-specific CSS).
- React Router for client-side routes and nested layouts (`frontend/src/App.tsx`).
- TanStack React Query for server-state queries, mutations, cache invalidation, and loading/error state (`frontend/src/hooks/**`).
- Axios for API calls and bearer-token injection (`frontend/src/services/api.ts`).
- React Hook Form and Zod for login, registration, book, and category form validation.
- Base UI and shadcn-style local UI components for dialogs, tables, menus, inputs, tabs, and sheets.
- Recharts for the seven-day loans-versus-returns activity chart (`frontend/src/pages/adminPage/BorrowingActivityChart.tsx`).
- Vitest, jsdom, and Testing Library for frontend tests (`frontend/vitest.config.ts`).

### Backend

- Flask 3 application-factory structure (`backend/app/__init__.py`).
- Flask blueprints for authentication, users, books, borrows, categories, and backups.
- Service-layer modules that hold most business rules and transaction handling.
- Flask-SQLAlchemy/SQLAlchemy ORM with PostgreSQL UUID columns.
- Flask-Migrate and Alembic for schema changes.
- Flask-JWT-Extended for four-hour bearer access tokens.
- Werkzeug password hashing for password accounts.
- Google ID-token verification through `google-auth`.
- Cloudinary's Python SDK for book-cover and avatar uploads.
- Native PostgreSQL `pg_dump` and `pg_restore` processes for database backup and recovery.
- `cryptography` AES-GCM plus Scrypt for encrypted backup envelopes.
- Python `unittest` for backend tests.

### Architectural interpretation

**Interpretation:** The application uses a three-layer backend structure: blueprints handle HTTP input/output, services implement domain operations, and SQLAlchemy models represent persistent data. The frontend is feature-oriented rather than strictly layered; pages compose feature components and hooks, while React Query separates remote state from local interface state.

The application is a client-rendered single-page application. Vercel rewrites all frontend paths to `index.html` (`frontend/vercel.json`). The API defaults to `http://127.0.0.1:5001/api`, with an optional `VITE_API_BASE_URL` override.

## 3. Roles and access control

The repository defines `student`, `librarian`, and `admin` role strings. Database constraints do not enforce this set; services and route checks enforce it selectively.

| Access level | Verified behavior | Evidence |
|---|---|---|
| Public | Login, registration, Google sign-in, and the raw `GET /api/books` catalog endpoint | Auth/book routes |
| Any authenticated account | Catalog UI, book details, borrow requests, favorites, reviews, personal borrow records, profile settings, and About page | `frontend/src/App.tsx`; JWT decorators |
| Librarian or administrator | Dashboard, user directory, borrow-request processing, pickup confirmation, loans/returns, book management, and staff catalog | `admin_required()` and conditional routes |
| Administrator only | Database backup/restore and category create/update/delete API operations | `administrator_required()`; `AdminRoute` |

Important access findings:

1. `admin_required()` is named broadly but permits both administrators and librarians (`backend/app/middleware/auth.py`).
2. The frontend mounts `/users` for both staff roles. Librarians can list users, activate/deactivate other accounts, and change student/librarian roles. Backend logic prevents librarians from granting or modifying the administrator role.
3. The frontend mounts `/categories` for both staff roles, but category mutations are administrator-only. The current page exposes mutation controls without a visible role check. **Verified mismatch:** a librarian can open the page but receives a 403 response for create, update, or delete.
4. Borrowing, favoriting, and reviewing are not restricted to the Student role. Any authenticated administrator or librarian can technically use those endpoints and pages.
5. Although the catalog interface is protected, `GET /api/books` is public. **Confirmation required:** whether public catalog API access is intentional.

## 4. Database entities

All regular domain entities except `SystemSecurityState` inherit a UUID primary key from `BaseEntity` (`backend/app/models/base.py`).

### User (`users`)

| Field | Type and constraints |
|---|---|
| `id` | UUID primary key |
| `username` | String(100), unique, required |
| `email` | String(100), unique, required |
| `phone` | String(30), nullable |
| `is_active` | Boolean, required, default true |
| `role` | String(20), required, default `student`; no database check constraint |
| `created_at` | DateTime, required, default database current time |
| `google_id` | String(255), unique, nullable, indexed |
| `avatar_url` | String(500), nullable |
| `password_hash` | String(255), nullable for Google-only accounts |

Relationships: one User to many Borrows, Reviews, and Favorites; one User to zero or one Student profile. The Student relationship uses ORM orphan deletion.

### Student (`students`)

| Field | Type and constraints |
|---|---|
| `id` | UUID primary key |
| `user_id` | UUID foreign key to `users.id`, unique, required |
| `student_number` | String(50), unique, nullable |
| `course` | String(100), nullable |
| `year_level` | String(50), nullable |
| `enrollment_status` | String(50), required, default `Enrolled` |

### Category (`categories`)

| Field | Type and constraints |
|---|---|
| `id` | UUID primary key |
| `name` | String(225), unique, required |

The model trims and title-cases names. The service also checks for case-insensitive duplicates before creation.

### Book (`books`)

| Field | Type and constraints |
|---|---|
| `id` | UUID primary key |
| `isbn` | String(20), unique, nullable |
| `title` | String(200), required |
| `author` | String(100), required |
| `category_id` | Nullable UUID foreign key to `categories.id` |
| `image_url` | String(500), nullable |
| `description` | String(250), nullable |
| `pages` | Integer, nullable |
| `created_at` | DateTime, database default |
| `is_deleted` | Boolean, required, default false |
| `archived_at` | Time-zone-aware DateTime, nullable |
| `total_copies` | Integer, required, default 1 |
| `available_copies` | Integer, required, default 1 |

Relationships: many Books to one Category; one Book to many Borrows, Reviews, and Favorites. Copy invariants are enforced by model methods, not database check constraints.

### Borrow (`borrows`)

| Field | Type and constraints |
|---|---|
| `id` | UUID primary key |
| `user_id` | Required UUID foreign key to `users.id` |
| `book_id` | Required UUID foreign key to `books.id` |
| `borrowed_at` | Nullable DateTime |
| `due_date` | Nullable DateTime |
| `returned_at` | Nullable DateTime |
| `approved_at` | Nullable DateTime |
| `rejection_reason` | Nullable Text |
| `status` | String(100), required, default `PENDING_BORROW`; no database enum/check |
| `created_at` | DateTime, database default |

Status constants are `PENDING_BORROW`, `READY_FOR_PICKUP`, `BORROWED`, `PENDING_RETURN`, `RETURNED`, `REJECTED`, and `OVERDUE`. Overdue is normally calculated during serialization from a `BORROWED` record and its due date rather than persisted as a scheduled status update.

### Favorite (`favorites`)

| Field | Type and constraints |
|---|---|
| `id` | UUID primary key |
| `user_id` | Required UUID foreign key to `users.id`, indexed |
| `book_id` | Required UUID foreign key to `books.id`, indexed |
| `created_at` | DateTime, required, database default |

Constraint: unique pair (`user_id`, `book_id`) prevents duplicate favorites.

### Review (`reviews`)

| Field | Type and constraints |
|---|---|
| `id` | UUID primary key |
| `book_id` | Required UUID foreign key to `books.id` |
| `user_id` | Required UUID foreign key to `users.id` |
| `rating` | Required Integer |
| `comment` | Nullable Text |
| `created_at` | DateTime, database default |

The service accepts ratings from 1 to 5, but the database has no rating check constraint. There is no unique user/book constraint, so a user may create multiple reviews for the same book.

### SystemSecurityState (`system_security_state`)

| Field | Type and constraints |
|---|---|
| `id` | SmallInteger primary key; migration check requires `id = 1` |
| `auth_epoch` | String(36), required |
| `maintenance_mode` | Boolean, required, default false |
| `restore_started_at` | Nullable time-zone-aware DateTime |
| `updated_at` | Required time-zone-aware DateTime, server default/update |

This singleton is intentionally excluded from database dumps. It controls maintenance mode and invalidates prior JWTs after a restore.

## 5. Relationship summary for the UML class diagram

```text
User 1 ── 0..1 Student
User 1 ── 0..* Borrow *..1 Book
User 1 ── 0..* Favorite *..1 Book
User 1 ── 0..* Review *..1 Book
Category 1 ── 0..* Book (Book.category_id is nullable)
SystemSecurityState is an independent singleton used by authentication and restore maintenance.
```

The UML should distinguish database associations from service dependencies. `AuthService`, `BorrowService`, `BookService`, `CategoryService`, `BackupService`, and `UsersService` are service classes/modules, not database entities.

## 6. Migration state

The repository contains one linear Alembic chain:

```text
c881fbed6733
  → 0b084f5d5e10
  → 64784c9fb908
  → 8c05d0a4ae4d
  → b7f3a91c4d2e
  → e4a6b7c8d9f0
  → f2c3d4e5a6b7
  → a1b2c3d4e5f6
  → f6d7e8a9b0c1 (head)
```

Reproduced command: `backend/.venv/Scripts/python.exe -m flask --app run.py db heads`

Result: `f6d7e8a9b0c1 (head)`.

This verifies repository migration topology, not whether a particular deployed database has applied the head revision.

## 7. Verified business workflows

### Authentication and session workflow

1. Password registration validates the form in the browser, then `POST /api/auth/register` creates a User with role `student` and an associated Student row.
2. Password login checks the stored Werkzeug password hash and active status.
3. Google sign-in sends a Google credential to `POST /api/auth/google`. The backend verifies audience, email, subject, email verification, and a small clock skew. It creates a Student account if necessary or links an existing email account when no conflicting Google identity exists.
4. The backend issues a four-hour JWT containing identity, role, username, and the current authentication epoch.
5. The frontend stores both JWT and serialized user data in `localStorage`; Axios sends the JWT in the `Authorization` header.
6. The backend rejects tokens when the user is inactive, the role claim no longer matches the database, or the authentication epoch changed.
7. Frontend logout removes local session data, clears React Query state, and calls Google's logout helper.

Limitations: no refresh-token workflow is implemented. On application reload, the frontend initially trusts local storage and relies on a later API 401 to clear an invalid session.

### Book and catalog workflow

1. Authenticated users browse, search, sort, and filter active books in the catalog.
2. Book details show availability, description, rating aggregate, reviews, related books, and books by the same author.
3. Authenticated users can add/remove favorites and submit reviews.
4. Staff can create and edit books through multipart forms. A category name can select an existing category or create a new category.
5. Staff can archive a book only when no active circulation record exists. Archived books are hidden from the public catalog.
6. Staff can view archived books and restore them.
7. Cover images are uploaded to Cloudinary; only their URLs are stored in PostgreSQL.

### Borrowing and pickup workflow

```text
PENDING_BORROW
  ├─ reject with reason → REJECTED
  └─ approve and reserve one copy → READY_FOR_PICKUP
       └─ confirm physical pickup → BORROWED (borrowed_at set; due_date = 14 days)
```

- A request is refused when no copy is available or the same user already has an active request/loan for the same book.
- Approval decrements availability and reserves the copy before pickup.
- Rejection does not decrement availability.
- Pickup starts the loan period without decrementing inventory a second time.

### Returning workflow

The current user interface directs a borrower to bring the physical book to the library desk. Staff then record the return from Loans & Returns:

```text
BORROWED or calculated OVERDUE
  → staff confirms physical receipt
  → RETURNED + returned_at + available_copies increment
```

The backend still implements `PUT /api/borrows/<id>/return`, which changes `BORROWED` to `PENDING_RETURN`, and the frontend still contains `returnBook()` and `useReturnBook()`. No current page calls that hook. Therefore, “student return request” is a disconnected/legacy capability, not an exposed workflow.

### Category workflow

- Any authenticated account can list categories.
- Administrators can create, rename, and delete categories.
- Category names are trimmed, title-cased, and checked case-insensitively for duplicates.
- Deletion is blocked when an active book is assigned to the category.
- The frontend currently exposes the Categories page to librarians even though mutation routes reject librarians.

### User administration workflow

- Staff can search, filter, sort, inspect, activate/deactivate, and assign roles to users.
- A user cannot change their own role or active state through these administration endpoints.
- A librarian cannot grant the administrator role or modify an existing administrator's role.
- An administrator can assign student, librarian, or administrator roles to other users.
- Role and active-state changes invalidate existing JWTs through database checks.

### Backup and restore workflow

Administrator-only backups are implemented as encrypted, database-only downloads:

1. Capabilities verify a separate signing key, PostgreSQL tools, and compatible client/server versions.
2. Export requires a 12-character passphrase and step-up authentication using the administrator's password or Google credential.
3. `pg_dump` creates a PostgreSQL custom archive. The backend checks schema revisions, table counts, and active-administrator count before and after the dump.
4. The dump and manifest are encrypted with an Scrypt-derived AES-GCM key. A short-lived safety token is returned in a response header.
5. Inspection decrypts and validates application ID, schema revisions, archive digest/size, and active-administrator presence, then issues a short-lived restore token.
6. Restore requires the selected backup, both operation tokens, passphrase, exact `RESTORE DATABASE` text, and new step-up authentication.
7. During restore, maintenance mode and a PostgreSQL advisory lock block ordinary API work. A successful restore rotates the authentication epoch and signs out all users.

Cloudinary files are not included in this backup.

## 8. Implemented user-facing features

- Password registration and login.
- Google sign-in.
- Role-aware navigation and route guards.
- Searchable/filterable book catalog and detail pages.
- Favorites, reviews, ratings, author books, and related recommendations.
- Borrow request, staff approval/rejection, pickup confirmation, 14-day due dates, overdue calculation, physical return confirmation, and history.
- Client-generated borrow notifications with locally stored read/unread state.
- Staff dashboard totals, attention list, quick actions, recent activity, and Recharts activity graph.
- Book create/edit/archive/restore management.
- Category management, subject to the role mismatch described above.
- User directory, role updates, status updates, and loan inspection.
- Profile display-name/photo update, password change, and local light/dark theme preference.
- Administrator-only encrypted PostgreSQL backup/inspect/restore workflow.
- About/developer page.

See `feature-inventory.md` for the role-by-role and implementation-status matrix.

## 9. Tests and reproducible results

### Frontend — reproduced

Command:

```powershell
cd frontend
npm.cmd test -- --maxWorkers=2
```

Result on November 3, 2026: **32 test files passed; 146 tests passed; 0 failed**. Final verification duration: 77.85 seconds.

The tests cover route guards, layouts, settings, dashboard calculations, chart rendering, book/category staff workflows, borrow request and return views, backup API/UI behavior, catalog filtering, and supporting view functions/hooks.

### Backend — reproduced

Command:

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Result on November 3, 2026: **98 tests passed; 0 failed; 1 integration test class skipped**. Final verification duration: 19.726 seconds.

The skipped test was `PostgresBackupRestoreIntegrationTests` because `TEST_DATABASE_URL` was not configured. The passing suite used mocks and SQLite-backed test contexts for many unit/route checks. It emitted several unclosed-SQLite `ResourceWarning`s and an insecure test JWT-key warning. These warnings did not change the exit status.

### Tests located but not demonstrated end to end

- Destructive backup and restore against a disposable PostgreSQL database.
- Live Google sign-in with an actual configured Google client.
- Live Cloudinary upload and deletion.
- Browser-level end-to-end tests against simultaneously running frontend, API, PostgreSQL, Google, and Cloudinary services.
- Migration upgrade against the group's actual development/production database.
- Performance, load, penetration/security, accessibility, usability, and cross-browser testing.

No code-coverage report is configured or claimed.

## 10. Partial, disconnected, unused, or questionable areas

### Partial or disconnected behavior

- Student return-request API/client hook exists, but no current student interface invokes it.
- Student profile fields (`student_number`, `course`, `year_level`) can be stored by the backend but are not editable in the current Settings page.
- The backend accepts profile email and phone updates, while the current Settings page disables email and does not expose phone.
- Notifications are derived in the browser from borrow data. There is no notification table, server push, email, SMS, or scheduled notification worker.
- Overdue state is calculated when records are serialized or displayed; there is no scheduled job that persists overdue transitions.
- Review ratings are service-validated but not protected by a database check, and repeated reviews per user/book are allowed.
- Categories page access and category-mutation API permissions are inconsistent for librarians.

### Apparently unused frontend code/assets

Static search found no active import/use for these components:

- `frontend/src/components/layout/AuthBg.tsx`
- `frontend/src/components/layout/Footer.tsx`
- `frontend/src/features/books/components/books/BookCatalogPagination.tsx`
- `frontend/src/features/books/components/books/BookFilters.tsx`
- `frontend/src/features/books/components/categories/CategoryFilter.tsx`
- `frontend/src/features/borrows/components/BorrowsTable.tsx`
- `useReturnBook` in `frontend/src/hooks/useBorrows.ts`

Several starter/template assets also appear unused, including React/Vite assets. Static search is evidence of no repository reference, but runtime string construction could produce false negatives.

### Documentation and configuration gaps

- `frontend/README.md` is still a Vite template.
- No frontend `.env.example` documents `VITE_API_BASE_URL` or `VITE_GOOGLE_CLIENT_ID`.
- `backend/.env.example` includes `GOOGLE_CLIENT_SECRET`, but inspected backend code uses only `GOOGLE_CLIENT_ID` for token verification.
- Root `npm test` is a placeholder that exits with an error; real tests must be run inside `frontend` and `backend`.
- The backend SQLAlchemy error handler includes `str(error)` in a 500 response. This may disclose internal database details and should not be described as production-hardened error handling.
- `backend/run.py` enables Flask debug mode when run directly; this is appropriate for local development, not evidence of a production deployment configuration.
- About-page developer role labels contain informal placeholder text. The group must replace or approve them before academic screenshots or publication (`frontend/src/pages/about-content.ts`).

## 11. Claims that are not supported by this audit

The code and reproduced tests do **not** establish that Pahina is secure, reliable, scalable, usable, accessible, faster than a manual process, or accepted by real users. They also do not establish measured time savings, satisfaction, error reduction, or production availability. These claims require separate methods and evidence.

## 12. Items requiring group confirmation

- Intended institution/library, actual users, deployment environment, and development period.
- Whether staff accounts should be allowed to borrow, favorite, and review books.
- Whether the public books API is intentional.
- Whether librarians should manage categories or only view them.
- Whether multiple reviews by one user for the same book are intended.
- Whether student profile fields and phone/email editing belong in the documented scope.
- Whether the disconnected return-request path should be removed, restored to the UI, or documented only as legacy code.
- Whether the backup/restore feature has been exercised successfully against the group's real PostgreSQL environment.
- Final developer names, academic roles, adviser, course, section, institution, and submission date.
