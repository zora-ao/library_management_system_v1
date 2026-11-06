# Backup Export Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce synchronous backup preparation time and make remaining delays diagnosable without changing backup compatibility or restore security.

**Architecture:** Keep the existing PostgreSQL custom-format, single-file encrypted envelope. Add a validated low compression setting at the native-tool boundary, calculate the encrypted artifact digest during the existing write, and instrument server phases with monotonic timing while the frontend accurately describes the synchronous wait.

**Tech Stack:** Python 3, Flask, PostgreSQL `pg_dump`, Cryptography AES-GCM, React, TypeScript, Vitest, unittest

**Spec:** `docs/superpowers/specs/2026-11-05-backup-export-performance-design.md`

## Global Constraints

- Preserve the version-one `.pahina-backup` format, manifest, Scrypt parameters, AES-GCM protection, tokens, authentication, inspection, and restore behavior.
- Default `BACKUP_PG_COMPRESSION_LEVEL` to `1`; accept only integer levels from `0` through `9`.
- Never log passphrases, credentials, database URLs, passwords, tokens, or raw backup contents.
- Keep dump-to-manifest size and SHA-256 verification before encryption.
- Keep the export request synchronous; do not imply that the frontend receives live backend phase progress.
- Do not remove before/after database consistency checks.

## Review Focus

- Environment values are strings: `"0"` and `"9"` must work, while whitespace, booleans, floats, and values outside `0..9` must fail safely.
- PostgreSQL command arguments must remain shell-free and must not expose the decoded password or database URL.
- A write or encryption failure must remove a partial envelope exactly as before.
- Incremental artifact hashing must include the header, every ciphertext chunk, final ciphertext, and GCM tag in exact file order.
- Timing instrumentation must execute on successful exports without changing error propagation or leaking sensitive values.

---

### Task 1: Configurable low-compression PostgreSQL dumps

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/services/postgres_tools.py`
- Modify: `backend/app/services/backup_service.py`
- Modify: `backend/tests/test_postgres_tools.py`
- Modify: `backend/tests/test_backup_service.py`
- Modify: `backend/.env.example`
- Modify: `README.md`

**Interfaces:**
- Produces: `PostgresToolConfig.compression_level` carrying the configured integer or environment string.
- Produces: native dump argument `--compress=<validated-level>`.
- Preserves: `create_custom_dump(config, output_path) -> None` and all existing connection/security behavior.

- [ ] **Step 1: Write failing compression tests**

Add tests that assert the environment-backed config defaults to `"1"`, `BackupService._postgres_config()` propagates an overridden level, the dump command includes `--compress=1`, and each of `-1`, `10`, `1.5`, `True`, `" 1 "`, and `"fast"` raises `PostgresToolError` before `subprocess.run` is called. Confirm explicit string boundaries `"0"` and `"9"` are accepted.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_postgres_tools tests.test_backup_service -v`

Expected: failures show no compression setting, no propagation, and no compression argument or validation.

- [ ] **Step 3: Implement configuration and validation**

Add `BACKUP_PG_COMPRESSION_LEVEL` with environment default `"1"`. Extend `PostgresToolConfig` and add a focused validator that returns a canonical integer for actual non-boolean integers or digit-only strings from `0` through `9`; otherwise raise `PostgresToolError("PostgreSQL backup compression level must be an integer from 0 to 9")`. Validate it in capabilities and dump creation, and pass `--compress=<level>` as one list argument.

- [ ] **Step 4: Document the setting**

Add `BACKUP_PG_COMPRESSION_LEVEL=1` to `.env.example` and explain in the README that lower values prepare faster but produce larger backup files.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_postgres_tools tests.test_backup_service -v`

Expected: all PostgreSQL tool and backup service tests pass.

- [ ] **Step 6: Commit**

```powershell
git add backend/app/config.py backend/app/services/postgres_tools.py backend/app/services/backup_service.py backend/tests/test_postgres_tools.py backend/tests/test_backup_service.py backend/.env.example README.md
git commit -m "perf: lower backup dump compression"
```

### Task 2: Hash encrypted artifacts during envelope writing

**Files:**
- Modify: `backend/app/services/backup_envelope.py`
- Modify: `backend/tests/test_backup_envelope.py`

**Interfaces:**
- Preserves: `encrypt_backup(manifest, dump_path, output_path, passphrase, policy) -> str`.
- Changes internally: returned SHA-256 is accumulated from exactly the bytes written instead of rereading `output_path`.
- Preserves: the independent pre-encryption dump size and digest check.

- [ ] **Step 1: Write a failing no-reread regression test**

Add `test_encrypt_returns_digest_without_reopening_completed_output`. Allow `_sha256_file` to hash only the input dump and raise if called for the encrypted output. Assert encryption succeeds and the returned digest equals an independent SHA-256 of the completed output. Keep the existing mismatched-dump rejection test or add it if absent.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_backup_envelope.BackupEnvelopeTests.test_encrypt_returns_digest_without_reopening_completed_output -v`

Expected: FAIL because `encrypt_backup` currently calls `_sha256_file(output_path)` after writing.

- [ ] **Step 3: Implement incremental output hashing**

Create one local write helper inside `encrypt_backup` that writes bytes and updates a SHA-256 object. Route the header, each `encryptor.update(...)` result, `encryptor.finalize()`, and tag through it in file order, then return `hexdigest()`. Preserve partial-file cleanup on every exception.

- [ ] **Step 4: Run envelope tests and verify GREEN**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_backup_envelope -v`

Expected: all envelope tests pass, including round-trip, tamper, bounds, mismatch, and no-reread coverage.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/services/backup_envelope.py backend/tests/test_backup_envelope.py
git commit -m "perf: hash backup envelopes while writing"
```

### Task 3: Export phase timing and accurate pending copy

**Files:**
- Modify: `backend/app/services/backup_service.py`
- Modify: `backend/tests/test_backup_service.py`
- Modify: `frontend/src/features/backups/components/BackupDownloadCard.tsx`
- Modify: `frontend/src/pages/adminPage/DataBackupsPage.test.tsx`
- Add: `docs/superpowers/specs/2026-11-05-backup-export-performance-design.md`
- Add: `docs/superpowers/plans/2026-11-05-backup-export-performance.md`

**Interfaces:**
- Produces: structured log event `backup_creation_timing` with nonnegative integer fields `metadata_before_ms`, `native_dump_ms`, `metadata_after_ms`, `encryption_ms`, and `total_ms`.
- Preserves: `BackupService.create_backup(passphrase, workspace) -> BackupArtifact`.
- Updates: pending download copy to state that the PostgreSQL archive is being created and encrypted before download begins.

- [ ] **Step 1: Write failing timing and frontend tests**

Add a service test that patches the monotonic clock with deterministic increasing values, creates a backup, and asserts one `backup_creation_timing` log with the five exact nonnegative integer duration fields and no secret values. Add a frontend test using a deferred download promise that clicks Download and asserts the pending copy appears until the promise resolves.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_backup_service -v`

Run: `cd frontend; npm.cmd test -- src/pages/adminPage/DataBackupsPage.test.tsx`

Expected: backend fails because no timing event exists; frontend fails because the accurate pending copy does not exist.

- [ ] **Step 3: Implement monotonic phase timing**

Use `time.perf_counter()` in `create_backup`. Measure metadata before the dump, native dump, metadata after the dump, and encryption. Emit one `current_app.logger.info("backup_creation_timing", extra={...})` after successful artifact creation with the event name and five exact millisecond fields. Keep all existing exceptions and cleanup behavior unchanged.

- [ ] **Step 4: Implement accurate pending text**

While the download promise is pending, render `Creating the PostgreSQL archive and encrypting it before download begins…` on the button. Do not add fabricated percentages or phase state.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_backup_service -v`

Run: `cd frontend; npm.cmd test -- src/pages/adminPage/DataBackupsPage.test.tsx`

Expected: all focused backend and frontend tests pass.

- [ ] **Step 6: Run complete verification**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest discover -s tests -v`

Expected: all runnable backend tests pass; the PostgreSQL integration class may skip if `TEST_DATABASE_URL` is unset.

Run: `cd frontend; npm.cmd test`

Expected: all frontend tests pass.

Run: `cd frontend; npm.cmd run build`

Expected: TypeScript and Vite build successfully.

- [ ] **Step 7: Review and commit**

Run `git diff --check` and inspect the complete implementation against the spec.

```powershell
git add backend/app/services/backup_service.py backend/tests/test_backup_service.py frontend/src/features/backups/components/BackupDownloadCard.tsx frontend/src/pages/adminPage/DataBackupsPage.test.tsx docs/superpowers/specs/2026-11-05-backup-export-performance-design.md docs/superpowers/plans/2026-11-05-backup-export-performance.md
git commit -m "perf: instrument backup preparation"
```
