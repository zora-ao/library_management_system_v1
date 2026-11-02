# Admin Database Backups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an administrator-only page that downloads passphrase-encrypted PostgreSQL backups and safely restores a validated backup as an all-or-nothing database replacement.

**Architecture:** Flask services will isolate the encrypted envelope, PostgreSQL subprocesses, operation tokens, maintenance locking, and backup orchestration behind a small administrator blueprint. React will use uncached local component state for passphrases/files and a staged restore flow; successful restore rotates a database authentication epoch and signs everyone out.

**Tech Stack:** Flask 3, Flask-SQLAlchemy, Flask-JWT-Extended, Alembic, PostgreSQL `pg_dump`/`pg_restore`, psycopg2, cryptography 50, itsdangerous, React 19, TypeScript, Axios, Tailwind, Vitest, Python unittest.

**Spec:** `docs/superpowers/specs/2026-11-02-admin-database-backups-design.md`

## Global Constraints

- Back up database records only; retain Cloudinary URLs but never download Cloudinary files.
- Use a PostgreSQL custom archive with `--no-owner --no-privileges --exclude-table=public.system_security_state`; restore with `--clean --if-exists --single-transaction --no-owner --no-privileges`.
- Use the `PAHINA_BACKUP\0` version-1 envelope, Scrypt `n=32768, r=8, p=1`, a 32-byte key, and streaming AES-256-GCM with a fresh 16-byte salt and 12-byte nonce.
- Default maximum file size is 262,144,000 bytes (250 MiB), operation timeout is 300 seconds, and safety/restore tokens expire after 900 seconds.
- Require matching passphrases of 12–1024 characters; never log or cache passphrases, plaintext archives, database URLs, credentials, or encryption keys.
- Compare the sorted revision values in the target database's `alembic_version` table exactly; do not infer compatibility from migration filenames.
- Only an active current `admin` may use these endpoints; `librarian` access is forbidden.
- Keep the existing uncommitted navigation changes intact and stage only task-owned files in each commit.

## Review Focus

- A hostile envelope declaring extreme Scrypt values or record lengths must be rejected before expensive allocation; Task 3 tests both cases.
- Database passwords containing URL-escaped characters must reach libpq only through the child environment and never command arguments or diagnostics; Task 4 tests this.
- A second request arriving during restore must receive 503, while the restore request itself must not deadlock on its own shared lock; Task 5 tests both paths.
- A valid archive whose manifest has another schema-revision set or zero active administrators must be rejected before `pg_restore`; Task 6 tests both cases.
- If native restore succeeds but authentication-epoch rotation fails, maintenance must remain closed and the operation must not report success; Task 7 tests this incident path.

---

## File Structure

### Backend

- `app/models/system_security_state.py` — singleton authentication epoch and fail-closed maintenance model.
- `app/security_state.py` — epoch reads/rotation and JWT callbacks.
- `app/services/backup_envelope.py` — versioned streaming encryption and strict parsing.
- `app/services/postgres_tools.py` — safe PostgreSQL client discovery and subprocess calls.
- `app/services/backup_security.py` — step-up verification and signed operation tokens.
- `app/maintenance.py` — shared/exclusive PostgreSQL advisory lock protocol.
- `app/services/backup_service.py` — manifest, export, inspection, and restore orchestration.
- `app/blueprints/backups/routes.py` — administrator HTTP contract and temporary-file lifecycle.
- `migrations/versions/f6d7e8a9b0c1_add_system_security_state.py` — security-state schema and initial epoch.
- Focused tests in `backend/tests/test_security_state.py`, `test_backup_envelope.py`, `test_postgres_tools.py`, `test_backup_security.py`, `test_maintenance.py`, `test_backup_service.py`, and `test_backup_routes.py`.

### Frontend

- `features/backups/types.ts` and `api.ts` — typed, uncached backup HTTP operations.
- `features/backups/components/StepUpControl.tsx` — password or fresh Google proof input.
- `features/backups/components/BackupDownloadCard.tsx` — encrypted download flow.
- `features/backups/components/BackupRestoreCard.tsx` — inspect, safety-download, confirm, and restore stages.
- `pages/adminPage/DataBackupsPage.tsx` — capabilities state and page composition.
- `routes/AdminRoute.tsx` — administrator-only client route boundary.
- Co-located Vitest tests for API behavior, page workflow, route boundary, and navigation.

### Operations

- `backend/.env.example` and `README.md` — binary, permission, secret, limit, timeout, and integration-test requirements.
- `backend/tests/integration/test_backup_restore_postgres.py` — opt-in real PostgreSQL round trip and rollback proof.

---

### Task 1: Authentication epoch foundation

**Files:**
- Create: `backend/app/models/system_security_state.py`
- Create: `backend/app/security_state.py`
- Create: `backend/migrations/versions/f6d7e8a9b0c1_add_system_security_state.py`
- Create: `backend/tests/test_security_state.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/services/auth_service.py`
- Modify: `backend/app/__init__.py`

**Interfaces:**
- Produces: `get_auth_epoch() -> str`, `rotate_auth_epoch() -> str`, `configure_jwt_security(jwt: JWTManager) -> None`, and `AuthService.issue_access_token(user: User) -> str`.
- Persists: singleton row `system_security_state(id=1, auth_epoch: String(36), maintenance_mode: Boolean, restore_started_at: DateTime | None, updated_at)`; this operational table is excluded from backup archives.

- [ ] **Step 1: Write failing epoch tests**

Add tests named `test_issued_token_contains_current_auth_epoch`, `test_epoch_mismatch_revokes_token`, `test_inactive_user_token_is_revoked`, `test_role_change_revokes_old_claim`, and `test_rotate_auth_epoch_changes_singleton_value`. Assert matching tokens reach `/api/auth/me`, stale/inactive/role-stale tokens return 401, and rotation changes the UUID string.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_security_state -v`

Expected: FAIL because the model and epoch helpers do not exist.

- [ ] **Step 3: Add the model, migration, and JWT callbacks**

Create the singleton row in migration `f6d7e8a9b0c1` with `down_revision = "a1b2c3d4e5f6"`. Register a `token_in_blocklist_loader` that rejects missing/mismatched epochs, inactive/missing users, and token roles that no longer match the current user role; return the existing JSON 401 shape from JWT error callbacks.

- [ ] **Step 4: Route all login issuance through the epoch-aware helper**

Implement `AuthService.issue_access_token(user)` and use it in password and Google login paths; preserve existing response keys (`token` for password and `access_token` for Google).

- [ ] **Step 5: Run security and existing auth tests**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_security_state backend.tests.test_config_and_cors backend.tests.test_user_settings_routes -v`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/app/models/system_security_state.py backend/app/models/__init__.py backend/app/security_state.py backend/app/services/auth_service.py backend/app/__init__.py backend/migrations/versions/f6d7e8a9b0c1_add_system_security_state.py backend/tests/test_security_state.py
git commit -m "feat: add authentication epoch security state"
```

### Task 2: Step-up authentication and operation tokens

**Files:**
- Create: `backend/app/services/backup_security.py`
- Create: `backend/tests/test_backup_security.py`
- Modify: `backend/app/services/auth_service.py`
- Modify: `backend/app/config.py`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: current `User`, Google ID-token verifier, and `BACKUP_TOKEN_SIGNING_KEY`.
- Produces: `StepUpProof(method: Literal["password", "google"], credential: str)`, `verify_step_up(user_id: UUID, proof: StepUpProof) -> User`, `issue_operation_token(kind: Literal["safety", "restore"], user_id: UUID, digest: str) -> str`, and `verify_operation_token(token: str, kind: str, user_id: UUID, digest: str | None, max_age: int) -> dict`.

- [ ] **Step 1: Write failing security-service tests**

Test current-password success/failure, Google `sub` and email matching without login/account mutation, inactive/non-admin rejection, wrong token kind/user/digest, modified signatures, and 900-second expiry.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_backup_security -v`

Expected: FAIL because `backup_security` is missing.

- [ ] **Step 3: Extract non-mutating Google identity verification**

Add `AuthService.verify_google_credential(token: str) -> dict` containing the existing issuer/audience/email checks. Keep `google_auth` behavior unchanged by calling this helper before its account lookup/link logic.

- [ ] **Step 4: Implement step-up and signed bound tokens**

Use `itsdangerous.URLSafeTimedSerializer` with salt `pahina-backup-operations-v1`. Accept only password proof for password accounts and Google proof for accounts with `google_id`; use constant public error messages and UUID `jti` values.

- [ ] **Step 5: Add exact configuration defaults**

Add `BACKUP_TOKEN_SIGNING_KEY`, `BACKUP_SAFETY_TOKEN_MAX_AGE_SECONDS=900`, and `BACKUP_RESTORE_TOKEN_MAX_AGE_SECONDS=900`; document that the signing key is required outside tests and must differ from `JWT_SECRET_KEY`.

- [ ] **Step 6: Run the focused tests**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_backup_security backend.tests.test_config_and_cors -v`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend/app/services/backup_security.py backend/app/services/auth_service.py backend/app/config.py backend/.env.example backend/tests/test_backup_security.py
git commit -m "feat: add backup step-up security"
```

### Task 3: Encrypted backup envelope

**Files:**
- Create: `backend/app/services/backup_envelope.py`
- Create: `backend/tests/test_backup_envelope.py`
- Modify: `backend/app/config.py`

**Interfaces:**
- Produces: immutable `BackupManifest(format_version, application, created_at, schema_revisions, postgres_server_version, postgres_client_version, dump_sha256, dump_bytes, table_counts, active_admin_count)` and `EnvelopePolicy(max_bytes=262144000, scrypt_n=32768, scrypt_r=8, scrypt_p=1)`.
- Produces: `encrypt_backup(manifest: BackupManifest, dump_path: Path, output_path: Path, passphrase: str, policy: EnvelopePolicy) -> str` returning the file SHA-256, and `decrypt_backup(input_path: Path, dump_path: Path, passphrase: str, policy: EnvelopePolicy) -> BackupManifest`.

- [ ] **Step 1: Write failing envelope tests**

Test round-trip manifest/dump bytes, distinct salt/nonce/ciphertext for the same input, wrong passphrase, one-byte tampering, invalid magic/version, 11- and 1025-character passphrases, oversized input, extreme Scrypt headers, declared record lengths over policy, truncated tag, and trailing plaintext records.

- [ ] **Step 2: Run and confirm failure**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_backup_envelope -v`

Expected: FAIL because `backup_envelope` is missing.

- [ ] **Step 3: Implement the fixed version-1 record format**

Use magic `b"PAHINA_BACKUP\x00"`, version byte `1`, fixed-width bounded KDF/header fields authenticated as AAD, then encrypted `uint32 manifest_length + canonical JSON + uint64 dump_length + dump bytes`; append the 16-byte GCM tag. Stream in 1 MiB chunks to private temporary files and parse plaintext only after `finalize_with_tag` authenticates it.

- [ ] **Step 4: Map all crypto/format failures to one public exception**

Expose `InvalidBackupError("Invalid backup or passphrase")`; retain safe internal exception chaining without recording secret material.

- [ ] **Step 5: Add bounded envelope configuration**

Add `BACKUP_SCRYPT_N=32768`, `BACKUP_SCRYPT_R=8`, and `BACKUP_SCRYPT_P=1`; construct `EnvelopePolicy` from these trusted server values while still rejecting hostile file-header parameters outside the supported version-1 bounds.

- [ ] **Step 6: Run the focused tests**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_backup_envelope -v`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend/app/services/backup_envelope.py backend/app/config.py backend/tests/test_backup_envelope.py
git commit -m "feat: add encrypted backup envelope"
```

### Task 4: Safe PostgreSQL tooling adapter

**Files:**
- Create: `backend/app/services/postgres_tools.py`
- Create: `backend/tests/test_postgres_tools.py`
- Modify: `backend/app/config.py`

**Interfaces:**
- Produces: `PostgresToolConfig(database_url: str, binary_dir: Path | None, timeout_seconds: int=300)` and `ToolCapabilities(available, pg_dump_version, pg_restore_version, server_version, reason)`.
- Produces: `check_capabilities(config) -> ToolCapabilities`, `create_custom_dump(config, output_path: Path) -> None`, `validate_custom_dump(config, dump_path: Path) -> None`, and `restore_custom_dump(config, dump_path: Path) -> None`.

- [ ] **Step 1: Write failing subprocess tests**

Mock `subprocess.run` and assert exact dump/validate/restore arguments, 300-second timeout, bounded stderr, nonzero/timeout errors, missing binaries, client major older than server, optional binary directory, and passwords—including percent-escaped values—present only as `PGPASSWORD` in the child environment.

- [ ] **Step 2: Run and confirm failure**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_postgres_tools -v`

Expected: FAIL because `postgres_tools` is missing.

- [ ] **Step 3: Implement URL parsing and capability checks**

Use `sqlalchemy.engine.make_url`; map host, port, database, username, decoded password, and supported SSL query values to libpq environment variables. Reject non-PostgreSQL URLs. Parse numeric major versions and require `pg_dump` major greater than or equal to the server major.

- [ ] **Step 4: Implement the three native commands**

Use argument arrays only. Dump with `pg_dump --format=custom --no-owner --no-privileges --exclude-table=public.system_security_state --file <path>` so operational security state survives replacement; validate with `pg_restore --list <path>`; restore with `pg_restore --clean --if-exists --single-transaction --no-owner --no-privileges --dbname <database> <path>`.

- [ ] **Step 5: Add PostgreSQL tool configuration**

Add `BACKUP_MAX_BYTES=262144000`, `BACKUP_OPERATION_TIMEOUT_SECONDS=300`, and optional `BACKUP_PG_BIN_DIR`.

- [ ] **Step 6: Run the focused tests**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_postgres_tools backend.tests.test_config_and_cors -v`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend/app/services/postgres_tools.py backend/app/config.py backend/tests/test_postgres_tools.py
git commit -m "feat: add safe PostgreSQL backup commands"
```

### Task 5: Cross-worker maintenance lock

**Files:**
- Create: `backend/app/maintenance.py`
- Create: `backend/tests/test_maintenance.py`
- Modify: `backend/app/__init__.py`

**Interfaces:**
- Produces: `install_maintenance_guard(app: Flask) -> None` and `exclusive_maintenance_lock(database_url: str) -> ContextManager[None]`.
- Lock key: fixed signed 64-bit integer `0x504148494E41` (`PAHINA`); normal `/api` requests use `pg_try_advisory_xact_lock_shared`, while endpoint `backups.restore_backup` is excluded and takes the session-level exclusive lock on a dedicated psycopg2 connection.

- [ ] **Step 1: Write failing lock tests**

Assert normal API requests continue only when the persistent flag is false and the shared try-lock succeeds; return 503 plus `Retry-After: 5` and `Cache-Control: no-store` when either check fails; public static/non-API paths and non-PostgreSQL test applications do not query advisory locks; the restore endpoint bypasses the shared guard; and the exclusive context always unlocks/closes after success or exception.

- [ ] **Step 2: Run and confirm failure**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_maintenance -v`

Expected: FAIL because `maintenance` is missing.

- [ ] **Step 3: Implement and register the lock protocol**

Read `system_security_state.maintenance_mode`, then use the request's SQLAlchemy transaction for shared locks and a direct psycopg2 connection for the exclusive session lock. Return a generic maintenance response on database/flag/lock-check failure rather than allowing an uncoordinated request.

- [ ] **Step 4: Run the focused tests**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_maintenance -v`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/maintenance.py backend/app/__init__.py backend/tests/test_maintenance.py
git commit -m "feat: add database restore maintenance lock"
```

### Task 6: Backup export and inspection service

**Files:**
- Create: `backend/app/services/backup_service.py`
- Create: `backend/tests/test_backup_service.py`

**Interfaces:**
- Consumes: Tasks 3–5 services and Flask configuration.
- Produces: `BackupArtifact(path: Path, file_digest: str, filename: str, manifest: BackupManifest)`, `InspectedBackup(path: Path, file_digest: str, manifest: BackupManifest)`, and `BackupService.capabilities()`, `create_backup(passphrase: str, workspace: Path)`, `inspect_backup(encrypted_path: Path, passphrase: str, workspace: Path)`.

- [ ] **Step 1: Write failing manifest/export tests**

Mock PostgreSQL tools and assert the manifest uses application `pahina-library`, sorted live `alembic_version` rows, server/client versions, SHA-256/size, counts for `users`, `students`, `books`, `categories`, `borrows`, `favorites`, `reviews`, and active-admin count. Assert the filename uses UTC `pahina-backup-<timestamp>.pahina-backup`.

- [ ] **Step 2: Write failing inspection rejection tests**

Assert inspection validates `pg_restore --list`, rejects application mismatch, any different sorted revision set, dump digest/size mismatch, and `active_admin_count == 0` before restore is callable.

- [ ] **Step 3: Run and confirm failure**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_backup_service -v`

Expected: FAIL because `backup_service` is missing.

- [ ] **Step 4: Implement capabilities, manifest queries, export, and inspect**

Use SQLAlchemy identifier objects from known metadata—not user-provided names—for counts. Keep all artifacts inside the caller-owned private workspace; do not delete them in the service because the route owns streaming/cleanup lifetime.

- [ ] **Step 5: Run the focused tests**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_backup_service -v`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/app/services/backup_service.py backend/tests/test_backup_service.py
git commit -m "feat: create and inspect database backups"
```

### Task 7: Guarded restore and administrator API

**Files:**
- Create: `backend/app/blueprints/backups/__init__.py`
- Create: `backend/app/blueprints/backups/routes.py`
- Create: `backend/tests/test_backup_routes.py`
- Modify: `backend/app/services/backup_service.py`
- Modify: `backend/tests/test_backup_service.py`
- Modify: `backend/app/__init__.py`

**Interfaces:**
- Adds: `BackupService.restore_backup(inspected: InspectedBackup, expected_digest: str) -> None`.
- Adds routes: `GET /api/admin/backups/capabilities`, `POST /export`, `POST /inspect`, and `POST /restore` with the request/response fields fixed by the design spec.

- [ ] **Step 1: Write failing route authorization and contract tests**

Assert missing/student/librarian/stale/inactive credentials are rejected; capabilities has `no-store`; export returns attachment plus `X-Backup-Safety-Token`; inspect returns manifest plus digest-bound restore token; malformed/oversized multipart input is rejected; and temporary directories are removed after streamed response close or exceptions.

- [ ] **Step 2: Write failing restore-order tests**

Assert this order: revalidate file → verify restore token/digest → verify recent safety token → require `RESTORE DATABASE` → verify step-up/current admin → set persistent maintenance flag → acquire exclusive lock → call native restore → remove SQLAlchemy sessions/dispose engine → rotate epoch and clear the flag atomically. Assert no native restore occurs on any failed prerequisite, every failure before native success clears a flag set by this attempt, and finalization failure after native success leaves it set.

- [ ] **Step 3: Add the post-restore incident test**

Make native restore succeed and epoch rotation fail; assert success is not returned, a critical structured log is emitted without secrets, and `maintenance_mode` remains true after the advisory context exits. Implement bounded finalization retries; recovery is another authenticated restore attempt or an operator-run epoch rotation plus flag clear.

- [ ] **Step 4: Run and confirm failure**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_backup_routes backend.tests.test_backup_service -v`

Expected: FAIL because routes and restore orchestration are absent.

- [ ] **Step 5: Implement restore orchestration**

Re-run envelope/native validation in the final request, compare its digest with the restore token, then follow the tested order. Emit structured logs containing actor ID, operation, digest prefix, result, duration, exit code, and correlation ID only.

- [ ] **Step 6: Implement and register the blueprint**

Use `administrator_required()` for claim-level rejection plus `verify_step_up` for a fresh database-backed active-admin check. Set `Cache-Control: no-store`, expose `X-Backup-Safety-Token` and `Content-Disposition` through CORS, and ensure Axios-visible public messages contain no subprocess details.

- [ ] **Step 7: Run the backend suite**

Run: `backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v`

Expected: all backend unit tests PASS.

- [ ] **Step 8: Commit**

```powershell
git add backend/app/blueprints/backups backend/app/services/backup_service.py backend/app/__init__.py backend/tests/test_backup_routes.py backend/tests/test_backup_service.py
git commit -m "feat: add guarded database backup API"
```

### Task 8: Typed frontend backup API

**Files:**
- Create: `frontend/src/features/backups/types.ts`
- Create: `frontend/src/features/backups/api.ts`
- Create: `frontend/src/features/backups/api.test.ts`

**Interfaces:**
- Produces: `getBackupCapabilities()`, `downloadBackup(input: ExportInput) -> Promise<{ blob: Blob; filename: string; safetyToken: string }>`, `inspectBackup(input: InspectInput) -> Promise<InspectResult>`, and `restoreBackup(input: RestoreInput) -> Promise<{ message: string }>`.
- Types include `StepUpInput`, `BackupManifest`, `BackupCapabilities`, `InspectResult`, and exact multipart fields from Task 7.

- [ ] **Step 1: Write failing API tests**

Mock the Axios instance and assert export uses `responseType: "blob"`, parses quoted/unquoted content-disposition safely, requires the safety-token header, uses `FormData` for inspect/restore, never adds passphrases to URLs, and makes exactly one Axios call per user action.

- [ ] **Step 2: Run and confirm failure**

Run: `npm.cmd --prefix frontend test -- src/features/backups/api.test.ts`

Expected: FAIL because the feature API is missing.

- [ ] **Step 3: Implement the typed API**

Do not use React Query or browser storage for files, tokens, passphrases, or Google credentials. Let the browser set multipart boundaries; use the existing authenticated Axios instance.

- [ ] **Step 4: Run the focused tests**

Run: `npm.cmd --prefix frontend test -- src/features/backups/api.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/features/backups/types.ts frontend/src/features/backups/api.ts frontend/src/features/backups/api.test.ts
git commit -m "feat: add database backup client API"
```

### Task 9: Admin backup page and staged workflow

**Files:**
- Create: `frontend/src/features/backups/components/StepUpControl.tsx`
- Create: `frontend/src/features/backups/components/BackupDownloadCard.tsx`
- Create: `frontend/src/features/backups/components/BackupRestoreCard.tsx`
- Create: `frontend/src/pages/adminPage/DataBackupsPage.tsx`
- Create: `frontend/src/pages/adminPage/DataBackupsPage.test.tsx`

**Interfaces:**
- Consumes: Task 8 API, `useAuth()`, Google Login credential callback, shared UI primitives, and `logout()`.
- Produces: page-local states `idle | validating | ready | restoring | complete`; no sensitive state leaves mounted components.

- [ ] **Step 1: Write failing download-flow tests**

Assert the page explains database-only scope and unrecoverable passphrases; capabilities errors disable actions; mismatched/short passphrases block export; password and Google accounts render the correct step-up control; success downloads the server filename and retains the safety token only in component memory.

- [ ] **Step 2: Write failing restore-flow tests**

Assert file/passphrase validation shows authenticated metadata and table counts; restore stays disabled until a fresh safety download, `RESTORE DATABASE`, and step-up proof; wrong-revision/invalid errors reset readiness; buttons stay disabled while pending; no automatic retry occurs; successful restore calls `logout()` and navigates to `/login?restored=1`.

- [ ] **Step 3: Run and confirm failure**

Run: `npm.cmd --prefix frontend test -- src/pages/adminPage/DataBackupsPage.test.tsx`

Expected: FAIL because the page is missing.

- [ ] **Step 4: Implement the focused components and page**

Use local controlled inputs, clear credential fields after each attempt and on unmount, revoke generated object URLs, show the final destructive action in `ConfirmDialog`, and render progress copy without pretending native subprocess progress percentages are available.

- [ ] **Step 5: Run the focused tests**

Run: `npm.cmd --prefix frontend test -- src/pages/adminPage/DataBackupsPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/features/backups/components frontend/src/pages/adminPage/DataBackupsPage.tsx frontend/src/pages/adminPage/DataBackupsPage.test.tsx
git commit -m "feat: build admin data backups workflow"
```

### Task 10: Administrator routing, navigation, and restore notice

**Files:**
- Create: `frontend/src/routes/AdminRoute.tsx`
- Create: `frontend/src/routes/AdminRoute.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/NavContent.tsx`
- Modify: `frontend/src/components/layout/NavContent.test.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/LoginRestoreNotice.test.tsx`

**Interfaces:**
- Produces: `<AdminRoute />` rendering `<Outlet />` only when `user.role === "admin"`, otherwise `<Navigate to="/dashboard" replace />`.
- Adds: `/backups`, admin sidebar item `Data Backups`, and post-restore sign-in notice.

- [ ] **Step 1: Write failing access and navigation tests**

Assert admins reach the outlet and see `Data Backups`; librarians are redirected and never see the link; the direct link remains correct in collapsed/mobile navigation; `/login?restored=1` shows “Database restored. Sign in again to continue.” and ordinary login does not.

- [ ] **Step 2: Run and confirm failure**

Run: `npm.cmd --prefix frontend test -- src/routes/AdminRoute.test.tsx src/components/layout/NavContent.test.tsx src/pages/LoginRestoreNotice.test.tsx`

Expected: FAIL for the new route/link/notice assertions.

- [ ] **Step 3: Implement the route boundary and navigation**

Nest `/backups` under `<AdminRoute />` inside the authenticated layout. Add a suitable Lucide database/archive icon and preserve the already-approved direct Users link without reintroducing a dropdown.

- [ ] **Step 4: Add the one-time restore notice**

Read the query parameter in `LoginPage`; render the notice without putting restored data in navigation state or storage.

- [ ] **Step 5: Run the focused tests**

Run: `npm.cmd --prefix frontend test -- src/routes/AdminRoute.test.tsx src/components/layout/NavContent.test.tsx src/pages/LoginRestoreNotice.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/routes/AdminRoute.tsx frontend/src/routes/AdminRoute.test.tsx frontend/src/App.tsx frontend/src/components/layout/NavContent.tsx frontend/src/components/layout/NavContent.test.tsx frontend/src/pages/LoginPage.tsx frontend/src/pages/LoginRestoreNotice.test.tsx
git commit -m "feat: expose admin data backups page"
```

### Task 11: PostgreSQL round-trip proof and deployment documentation

**Files:**
- Create: `backend/tests/integration/__init__.py`
- Create: `backend/tests/integration/test_backup_restore_postgres.py`
- Modify: `backend/.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete backend backup API and `TEST_DATABASE_URL` pointing to a disposable PostgreSQL database whose database name contains `test`.
- Produces: opt-in destructive integration coverage and deployment checklist.

- [ ] **Step 1: Write the guarded integration tests**

Skip when `TEST_DATABASE_URL` or PostgreSQL binaries are absent; hard-fail before mutation if the database name lacks `test`. Test representative related rows/sequences/indexes, export → mutate → restore exactness, forced invalid restore rollback, maintenance 503 during an exclusive lock, and rejection of the pre-restore JWT after epoch rotation.

- [ ] **Step 2: Run the integration test against a disposable PostgreSQL database**

Run: `backend\.venv\Scripts\python.exe -m unittest backend.tests.integration.test_backup_restore_postgres -v`

Expected: PASS when configured, otherwise explicit SKIP with the missing prerequisite.

- [ ] **Step 3: Document production requirements**

Document `pg_dump`/`pg_restore` installation and compatibility, application-object ownership without superuser, `BACKUP_TOKEN_SIGNING_KEY`, all limits/timeouts, HTTPS/request-size settings, temporary disk monitoring, exact-revision restriction, Cloudinary exclusion, and the disposable integration-test command.

- [ ] **Step 4: Run complete verification**

Run:

```powershell
backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
git diff --check
```

Expected: new tests PASS; any pre-existing unrelated failures must be documented with the exact failing test/lint/build output and must not be hidden by changing unrelated code.

- [ ] **Step 5: Perform final security review**

Inspect the final diff for secrets in arguments/logs, unsafe temporary-file permissions or cleanup gaps, unbounded attacker-controlled values, missing `no-store`, librarian access, retry behavior, and any restore path that can clear persistent maintenance after native success but before epoch rotation.

- [ ] **Step 6: Commit documentation and integration coverage**

```powershell
git add backend/tests/integration backend/.env.example README.md
git commit -m "test: verify database backup recovery"
```

