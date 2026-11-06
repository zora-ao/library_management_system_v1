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
- Set a strong `BACKUP_TOKEN_SIGNING_KEY` that is different from `JWT_SECRET_KEY`. Safety and restore tokens expire after 15 minutes.
- The version-one envelope defaults to Scrypt `N=32768`, `r=8`, `p=1`, a 250 MiB maximum backup, and a 300-second native operation timeout. These backend limits are defined in `app/config.py`; align the reverse proxy request-body limit and timeout with them.
- Serve the frontend and API over HTTPS. Expose `Content-Disposition` and `X-Backup-Safety-Token` through any proxy or gateway.
- Monitor free temporary disk space and operating-system cleanup. Export, inspection, and restore use bounded temporary workspaces that are removed when each request completes.
- Restore accepts only authenticated backups for this application with the exact deployed Alembic revision set and at least one active administrator. Deploy schema migrations before creating the backup that will be used for recovery.
- A successful restore rotates the authentication epoch and signs out every user. If security finalization fails after the native restore, the persistent maintenance flag intentionally stays enabled for fail-closed recovery.

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
