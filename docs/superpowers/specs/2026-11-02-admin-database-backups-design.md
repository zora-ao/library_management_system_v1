# Admin Database Backups Design

Date: 2026-11-02
Status: Proposed

## Goal

Add an administrator-only Data Backups page that can download an encrypted copy of all PostgreSQL data and safely restore that copy as a full database replacement.

This feature protects database data only. Cloudinary image files are not copied; the database URLs that point to those files are included.

## Product decisions

- Backups are files downloaded by the administrator. The application does not retain backup files or show server-side backup history.
- Use PostgreSQL's native custom archive format, produced by `pg_dump --format=custom` and restored with `pg_restore`.
- Restoring is a full replacement, never a merge.
- Every downloaded file is encrypted with a passphrase supplied by the administrator.
- Restore is allowed only for this application's backup envelope and the exact current Alembic schema revision.
- Only active users with the `admin` role can access backup operations. Librarians are not allowed.
- A restore requires a fresh safety backup of the current database, a validated restore file, step-up authentication, and an explicit confirmation phrase.

## Scope

### Included

- An admin navigation item and `/backups` page.
- Encrypted, downloadable database exports.
- Backup inspection and validation before restore.
- Guarded, all-or-nothing database restore.
- Maintenance locking while a restore runs.
- Invalidation of all existing login sessions after a successful restore.
- Structured audit logging and automated tests.

### Not included

- Cloudinary image contents.
- Scheduled or automatic backups.
- Server, cloud, or object-storage backup retention.
- Backup history in the application.
- Partial, table-level, or merge restores.
- Restore across different schema revisions.
- Managed-provider snapshots or point-in-time recovery.

## User experience

Add **Data Backups** to the administrator navigation. It is hidden from librarians and protected independently on the backend.

The page contains two cards.

### Download a backup

The administrator:

1. Enters and confirms a backup passphrase.
2. Completes step-up authentication.
3. Selects **Download encrypted backup**.
4. Receives a file named like `pahina-backup-2026-11-02T143000Z.pahina-backup`.

The page explains that losing the passphrase makes the backup unrecoverable and that Cloudinary images are not embedded.

### Restore a backup

The restore card uses a staged flow:

1. Select a `.pahina-backup` file and enter its passphrase.
2. Select **Validate backup**.
3. Review its creation time, schema revision, PostgreSQL versions, archive size, and per-table record counts.
4. Download a new safety backup of the current database. This issues a short-lived safety token.
5. Re-enter step-up authentication and type `RESTORE DATABASE`.
6. Select **Replace database** and accept the final warning.

While restoring, controls are disabled and the page warns the administrator not to refresh or retry. On success, every user is signed out and the administrator is sent to sign-in with a success notice.

If PostgreSQL client tools are missing or incompatible, the page remains readable but disables backup actions and shows a deployment-focused error.

## Backup file format

The external file uses an application-specific binary envelope rather than exposing a raw PostgreSQL archive.

The envelope contains:

- A fixed magic value and format version.
- Scrypt parameters and a random salt.
- A random 96-bit AES-GCM nonce.
- AES-256-GCM ciphertext and authentication tag.

The encrypted payload is a small length-prefixed record stream containing exactly two logical records:

- A UTF-8 JSON manifest.
- The raw bytes of the PostgreSQL custom archive.

This deliberately avoids ZIP/TAR extraction and its path-handling risks.

The manifest records:

- Backup format version and UTC creation time.
- Application identifier.
- Current Alembic revision.
- PostgreSQL server and client versions.
- SHA-256 digest and byte size of `database.dump`.
- Record counts for the application's tables.
- Count of active administrators.

Scrypt derives the 256-bit key from the passphrase using a fresh random salt. AES-GCM supplies confidentiality and tamper detection. Header fields required to interpret the file are authenticated as associated data. A nonce is generated independently for every file and is never reused with a derived key. The implementation uses a streaming `Cipher` GCM context and temporary files so a 250 MB archive is not duplicated in application memory.

Initial Scrypt settings are `n=32768`, `r=8`, `p=1`, with a 32-byte derived key. The format stores these parameters so they can evolve, but the backend accepts only bounded, supported values to prevent malicious resource-exhaustion files.

Passphrases, encryption keys, plaintext archives, database URLs, and database credentials must never enter logs.

## Backup generation

The backend creates a private temporary directory and runs:

```text
pg_dump --format=custom --no-owner --no-privileges --exclude-table=public.system_security_state --file=<temporary path>
```

Connection details are parsed from `DATABASE_URL` and passed through libpq environment variables. Passwords are never placed in command-line arguments.

After `pg_dump` succeeds, the service calculates metadata and the archive digest, writes and encrypts the record stream in chunks, streams the encrypted temporary file to the response, and deletes all temporary files in a `finally` cleanup path.

The backend enforces configurable archive and operation limits. Version one defaults to 250 MB and 300 seconds. The deployment's HTTP and worker timeouts must exceed the operation timeout. Automatic client retries are disabled for these endpoints.

## Restore validation

Validation happens before maintenance mode and before any database mutation:

1. Enforce upload size and filename-independent content checks.
2. Verify the magic value and supported envelope version.
3. Bound Scrypt parameters before deriving a key.
4. Decrypt and authenticate the payload. A wrong passphrase or modified file returns one generic validation error.
5. Parse exactly the two bounded, length-prefixed records and reject trailing or malformed data.
6. Verify the dump digest and declared size.
7. Require the expected application identifier and exact current Alembic revision.
8. Require at least one active administrator in the authenticated manifest.
9. Run `pg_restore --list` to verify that PostgreSQL recognizes the custom archive.

A successful inspection returns a short-lived, signed restore token bound to the authenticated administrator, the file digest, and the validation time. The browser retains the selected `File`; the server does not retain it. Final restore uploads and validates the same file again, then checks that its digest matches the restore token.

## Restore safety and execution

The download performed in step 4 returns a short-lived safety token bound to the administrator, current backup digest, and issue time. Restore accepts safety tokens for 15 minutes. This proves the administrator downloaded a recoverable pre-restore copy shortly before replacement.

The final restore request requires:

- A valid restore token for the uploaded file.
- A valid recent safety token.
- The exact confirmation phrase.
- Successful step-up authentication.
- A fresh authorization check against the current database confirming an active administrator.

The application then obtains an exclusive PostgreSQL advisory lock used for maintenance operations. Normal API requests attempt the matching shared lock and return HTTP 503 with a maintenance response while restore owns the exclusive lock. This coordinates all application workers without relying on process-local state.

Restore runs with:

```text
pg_restore --clean --if-exists --single-transaction --no-owner --no-privileges --dbname=<target>
```

`--single-transaction` makes object replacement all-or-nothing; a restore error leaves the existing database intact. The service enforces the timeout, captures bounded diagnostic output, cleans temporary files, and releases the advisory lock on every exit path.

The application must use a database role permitted to drop and recreate its application objects. It must not be a PostgreSQL superuser.

## Session invalidation

Add a one-row system security state containing an authentication epoch and a persistent maintenance flag. This operational row is excluded from the PostgreSQL archive, so restoring user data cannot roll security state backward. New access and refresh tokens include the epoch, and token verification compares it with the current value.

Before native restore, the backend sets the persistent maintenance flag. After `pg_restore` succeeds, it rotates the authentication epoch and clears that flag in one small transaction before releasing maintenance mode. This invalidates every token issued before the restore, including tokens whose user records happen to match restored data. If finalization fails, the flag remains set and all ordinary API requests stay closed even if the advisory-lock connection is lost. The restore response is allowed to finish only after finalization, then the frontend clears local auth state and redirects to sign-in.

The epoch and maintenance flag are security metadata and are intentionally not treated as user data from the archive.

## Step-up authentication

- Password-based administrators re-enter their current password.
- Google-only administrators provide a fresh Google credential that the backend verifies for the same account.
- Backup passphrases are never treated as account authentication.

Step-up proofs are short-lived and single-purpose. The backend checks current account state and role again when consuming them.

## API shape

All routes live under `/api/admin/backups` and use the strict administrator guard.

- `GET /capabilities` — reports feature availability, PostgreSQL tool/server versions, limits, and any safe deployment error.
- `POST /export` — validates step-up authentication, creates an encrypted download, and returns a safety token in a response header.
- `POST /inspect` — accepts multipart file and passphrase, returns authenticated metadata and a short-lived restore token.
- `POST /restore` — accepts the file, passphrase, restore token, safety token, confirmation phrase, and step-up proof; performs guarded replacement.

Sensitive form fields are sent only in request bodies over HTTPS. Responses use `Cache-Control: no-store`. The frontend never saves passphrases to storage or React Query caches.

## Backend structure

Keep subprocess, cryptography, and HTTP concerns separate:

- `backup_routes.py` — request parsing, authorization, response streaming, and error mapping.
- `backup_service.py` — orchestration, manifest creation, validation, dump, and restore.
- `backup_envelope.py` — versioned encryption/decryption and strict payload parsing.
- `postgres_tools.py` — version checks, environment construction, subprocess execution, timeouts, and bounded diagnostics.
- `maintenance.py` — advisory lock helpers and maintenance response behavior.
- `security_state.py` — authentication epoch lookup and rotation.

Configuration includes the maximum upload/archive bytes, operation timeout, PostgreSQL binary directory override, token signing secret, safety-token lifetime, and bounded Scrypt policy.

## Failure behavior

- Wrong passphrase or tampering: generic `invalid backup or passphrase`; no distinction that creates an oracle.
- Unsupported format or schema revision: reject before maintenance mode with an actionable message.
- Missing/incompatible PostgreSQL tools: disable actions via capabilities and return service unavailable if called directly.
- Dump failure: no download is returned; temporary material is deleted.
- Restore failure or timeout: PostgreSQL rolls back the single transaction, maintenance mode ends, and current data remains available.
- Browser/network interruption: the server operation remains bounded; the frontend does not retry automatically. The administrator can sign in and inspect application state before taking another action.
- Session epoch rotation failure after a successful native restore: keep maintenance lock, retry the small update, and report an operational incident rather than reopening with stale sessions.

## Audit and observability

Write structured server logs for capability failures, export, validation, and restore. Include actor ID, operation, file digest prefix, result, duration, PostgreSQL exit code, and a request correlation ID. Never include secrets, database connection strings, complete uploaded filenames, or archive contents.

External application logs are the audit source because restoring the database would overwrite an audit table stored inside that database.

## Testing

### Backend unit tests

- Envelope round trip, wrong passphrase, tampering, invalid magic/version, bounded Scrypt values, and oversized payloads.
- Strict payload entry validation and archive digest mismatch.
- Command construction, connection environment, timeout handling, bounded output, and proof that secrets do not enter arguments/logs.
- Manifest creation and exact-revision enforcement.
- Safety/restore token binding, expiry, and replay protection where applicable.
- Strict administrator authorization, step-up authentication, confirmation phrase, and active-account recheck.
- Advisory lock acquisition/release and maintenance responses.
- Authentication epoch checks and rotation.

### PostgreSQL integration tests

Use a disposable PostgreSQL database, not SQLite:

- Create representative rows, export, mutate, restore, and verify exact restored data.
- Verify sequences, constraints, indexes, and relationships.
- Force a restore error and verify the original database remains intact.
- Verify other requests receive maintenance responses while the exclusive lock is held.
- Verify pre-restore tokens are rejected after epoch rotation.

### Frontend tests

- Admin-only navigation and route protection.
- Download form validation and no passphrase persistence.
- Inspect/preview flow and incompatible backup errors.
- Safety backup requirement, confirmation phrase, and destructive-action states.
- Maintenance/progress handling, no automatic retries, and logout after success.

## Deployment requirements

- Install compatible `pg_dump` and `pg_restore` binaries in every backend runtime.
- Use a `pg_dump` client version that supports the database server and verify compatibility in `/capabilities`.
- Grant the application database role ownership/DDL permissions for its own objects without granting superuser access.
- Set HTTPS, request-size, proxy, and worker timeouts consistently with configured backup limits.
- Supply a dedicated backup-token signing secret.
- Monitor free temporary disk space and backup/restore duration.

## Acceptance criteria

- An active administrator can download a passphrase-encrypted backup containing all database tables and no Cloudinary files.
- A librarian or ordinary user cannot call any backup endpoint.
- A valid same-revision backup can fully replace the database only after validation, a fresh safety download, step-up authentication, and explicit confirmation.
- A wrong passphrase, modified file, foreign archive, different revision, or zero-admin backup is rejected before mutation.
- A failed native restore leaves the previous database intact.
- Concurrent application requests receive a maintenance response during replacement.
- All existing sessions are invalid after a successful restore.
- No backup files or passphrases are retained by the application.

