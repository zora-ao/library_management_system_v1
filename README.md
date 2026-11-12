# Library Management System

A full-stack Library Management System built with:

- React + TypeScript
- Flask
- PostgreSQL
- SQLAlchemy
- JWT Authentication

## Features

- User Authentication
- Role-based Access
- Book Management
- Borrow & Return Books
- Dashboard
- Administrator-only encrypted database backup and restore

## Tech Stack

Frontend
- React
- TypeScript
- React Query
- Tailwind CSS

Backend
- Flask
- Flask SQLAlchemy
- Flask JWT Extended
- PostgreSQL

## Object-Oriented Design

The backend is layered: **routes** (HTTP) → **services** (use cases) → **models** (data + rules). The four OOP principles are applied as follows.

| Principle | Where | What it does |
|---|---|---|
| **Inheritance** | [`BaseEntity`](backend/app/models/base.py) | Abstract parent (`__abstract__ = True`) that gives `User`, `Book`, `Borrow`, `Category`, `Review` and `Favorite` a shared UUID `id` and the `to_dict()` contract. |
| | [`BaseService`](backend/app/services/base_service.py) | Parent of `BookService`, `BorrowService` and `CategoryService`; shares `_parse_uuid()` and `_get_or_404()`. |
| | [`LibraryError`](backend/app/exceptions.py) | Exception hierarchy: `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409), extended by `DuplicateReviewError`, `RegistrationValidationError`, `RegistrationConflictError`. |
| **Encapsulation** | [`User`](backend/app/models/user.py) | `password` is write-only: setting it stores a hash in the private `_password_hash`; reading it raises an error. |
| | [`Book`](backend/app/models/book.py) | `_total_copies` / `_available_copies` are read-only properties; they change only through `decrement_available()`, `increment_available()` and `adjust_total_copies()`, which enforce the stock rules. |
| | [`Borrow`](backend/app/models/borrow.py) | The borrow lifecycle (`approve()`, `confirm_pickup()`, `reject()`, `mark_returned()`) lives on the model; each method refuses a transition that is not allowed from the current status. |
| | [`Category`](backend/app/models/category.py), [`Review`](backend/app/models/review.py) | `Category.name` setter validates and title-cases; `Review.parse_rating()` owns the 1–5 star rule. |
| **Polymorphism** | `to_dict()` | Every model overrides `BaseEntity.to_dict()`; routes serialize any entity the same way. |
| | [`handle_library_error`](backend/app/middleware/errors.py) | One handler serves every `LibraryError` subclass; each subclass supplies its own `status_code`. |
| | [`HashMap<V>`, `Queue<T>`](frontend/src/lib/dsa) | Generic classes that work for any value type. |
| **Abstraction** | Services | Routes call `BorrowService.approve_borrow_request(id)` without knowing about locking, transactions or SQL. |
| | [`Queue<T>`](frontend/src/lib/dsa/Queue.ts) | Hides its linked-list nodes (`private head`, `tail`); callers only `enqueue()` and `dequeue()`. |
| | [`ReviewEntity`](frontend/src/features/books/models/ReviewEntity.ts) | Frontend class wrapping raw review JSON with typed fields and a `formattedDate` getter. |

Borrow lifecycle enforced by `Borrow`:

```
PENDING_BORROW --approve()--> READY_FOR_PICKUP --confirm_pickup()--> BORROWED --mark_returned()--> RETURNED
PENDING_BORROW --reject(reason)--> REJECTED
```

## Data Structures and Algorithms

Three data structures of our own live in [`frontend/src/lib/dsa`](frontend/src/lib/dsa) and power real pages. Full analysis, Big-O and benchmark results: [documentation/dsa.md](documentation/dsa.md).

| Data structure | Used in | Time |
|---|---|---|
| Array: `linearSearch`, `mergeSort` | All 8 search bars and their result lists | O(n) search, O(n log n) sort |
| `HashMap` (separate chaining) | Loans per user (Users), books per genre (Catalog), queue positions | O(1) average lookup |
| `Queue` (linked list, FIFO) | Pending borrow requests, first come first served | O(1) enqueue / dequeue |

Benchmark: `node scripts/benchmark-dsa.ts` from the `frontend` folder.

## Installation

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder and add your environment variables.

Example:

```env
DATABASE_URL=your_postgresql_database_url
JWT_SECRET_KEY=your_secret_key
```

### Frontend

```bash
cd frontend
npm install
```

## Running the Project

You need to run the **backend** and **frontend** separately.

### 1. Start the Backend

Open a terminal:

```bash
cd backend
python run.py
```

The Flask server should start at:

```text
http://localhost:5000
```

### 2. Start the Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

The React application should start at:

```text
http://localhost:5173
```

Open the frontend URL in your browser to use the application.

## Database backups

Administrators can open **Data Backups** in the dashboard to download an encrypted PostgreSQL backup or validate and restore one. Backups contain database data only; Cloudinary objects such as book covers and avatars are not included. The encryption passphrase is never stored and cannot be recovered.

### Production requirements

- Install `pg_dump` and `pg_restore` on the backend host. Both client tools must have the same major version, and `pg_dump` must not be older than the PostgreSQL server. Set `BACKUP_PG_BIN_DIR` only when the binaries are not on `PATH`.
- `BACKUP_PG_COMPRESSION_LEVEL` defaults to `1`. Lower values prepare backups faster but create larger files; allowed values are `0` through `9`.
- Run the application with a PostgreSQL role that owns the application database objects and can connect, create, drop, and restore them. Superuser access is not required or recommended.
- Set a strong `BACKUP_TOKEN_SIGNING_KEY` that is different from `JWT_SECRET_KEY`. Restore tokens expire after 15 minutes.
- The version-one envelope defaults to Scrypt `N=32768`, `r=8`, `p=1`, a 250 MiB maximum backup, and a 300-second native operation timeout. These backend limits are defined in `app/config.py`; align the reverse proxy request-body limit and timeout with them.
- Serve the frontend and API over HTTPS. Expose `Content-Disposition` through any proxy or gateway.
- Monitor free temporary disk space and operating-system cleanup. Export, inspection, and restore use bounded temporary workspaces that are removed when each request completes.
- Restore accepts only authenticated backups for this application with the exact deployed Alembic revision set and at least one active administrator. Deploy schema migrations before creating the backup that will be used for recovery.
- A successful restore rotates the authentication epoch and signs out every user. If security finalization fails after the native restore, the persistent maintenance flag intentionally stays enabled for fail-closed recovery.

### Recovering when the app itself is broken

The Data Backups page only works while the app runs and an administrator can log in. If the database was deleted badly enough that this is impossible (the `users`, `alembic_version` or `system_security_state` table is gone, every table was dropped or emptied, or `DATABASE_URL` now points at a brand-new empty database), restore from the command line instead. Run from the `backend` directory:

```powershell
.\.venv\Scripts\python.exe scripts\recover_database.py C:\path\to\pahina-backup-20261109T000000Z.pahina-backup
```

It restores into the database in `DATABASE_URL`, prints which database that is, and asks for the backup passphrase and for the database name as confirmation. It then:

1. decrypts and checks the backup (right application, intact, has an active administrator, made by a schema version this code knows);
2. recreates `system_security_state` if it is missing, since backups exclude it;
3. turns on maintenance mode, waits for in-flight requests, and restores every table in one transaction, so a failure leaves the database unchanged;
4. signs everyone out, turns maintenance mode off, and runs any newer migrations.

Afterwards, log in with an administrator account from the backup. Keep a recent backup file and its passphrase somewhere other than the database: once the database is gone, the admin page cannot produce one.

### Disposable PostgreSQL recovery test

The integration test is destructive. Create an empty disposable database whose name contains `test`, give the application role ownership of its objects, and configure:

```env
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/pahina_backup_test
```

Then run from the `backend` directory:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.integration.test_backup_restore_postgres -v
```

Without `TEST_DATABASE_URL` or compatible PostgreSQL client binaries, the test reports an explicit skip. A URL whose database name does not contain `test` fails before any mutation.
