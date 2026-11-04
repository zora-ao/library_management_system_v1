# Backup Export Performance Design

## Intent

Reduce the time administrators wait before a backup download begins, while preserving the existing encrypted `.pahina-backup` format, integrity checks, restore workflow, and administrator security requirements. Add enough timing evidence to identify whether future delays come from database inspection, `pg_dump`, encryption, or file transfer.

## Scope

- Add a validated `BACKUP_PG_COMPRESSION_LEVEL` setting with a default of `1` and pass it to `pg_dump` as `--compress=<level>`.
- Record structured durations for the metadata-before, native dump, metadata-after, encryption, and total export phases using a monotonic timer. Logs must not contain credentials, passphrases, database URLs, or token values.
- Calculate the encrypted backup's SHA-256 digest incrementally while writing the envelope, eliminating the final full reread of the encrypted output without weakening dump-to-manifest validation.
- Replace the generic pending button text with an accurate message explaining that the PostgreSQL archive is being created and encrypted before download begins.
- Document the compression setting in `backend/.env.example` and the project README.

## Non-goals

- No background job queue, polling endpoint, Server-Sent Events, or true live phase progress.
- No change to the encrypted file format, Scrypt parameters, AES-GCM protection, manifest contents, safety tokens, step-up authentication, or restore behavior.
- No directory-format or parallel PostgreSQL dump in this iteration.
- No removal of the before/after consistency checks or the dump-to-manifest digest verification.

## Approaches

1. **Balanced custom-format optimization — selected.** Keep the single-file custom dump, use low compression, remove one redundant encrypted-file read, add timing evidence, and clarify the waiting state. This is compatible with the current envelope and restore architecture.
2. **No compression.** This may generate the dump faster but can produce a much larger download, especially harmful over remote networks.
3. **Parallel directory-format dump.** This can help very large databases but requires packaging multiple files and redesigning validation, encryption, and restore handling.

## Design

`Config` will read `BACKUP_PG_COMPRESSION_LEVEL` from the environment, defaulting to the string `"1"`. `PostgresToolConfig` will carry the configured value, and the PostgreSQL tool boundary will canonicalize valid digit strings or integers to an integer. Capability checks and dump creation will reject booleans, non-integers, whitespace-padded values, or values outside `0` through `9` with a safe configuration error. `create_custom_dump` will add the exact argument `--compress=<level>` without invoking a shell.

`BackupService.create_backup` will use `time.perf_counter()` around each major phase and emit one structured completion log containing phase durations in milliseconds. Failed exports will continue through the existing error path; no secrets or raw connection values will be logged.

`encrypt_backup` will update a SHA-256 object for each header, ciphertext, and tag byte written, then return that digest. The existing pre-encryption check that the dump size and digest match the manifest remains unchanged.

The download card will continue using one synchronous request. Its pending copy will state that Pahina is creating the PostgreSQL archive and encrypting it before the download begins, rather than implying that network download is already in progress.

## Testing

- PostgreSQL tool tests will first fail until the configured compression argument is present and invalid levels are rejected.
- Service tests will verify compression configuration propagation and structured timing fields without asserting real elapsed speed.
- Envelope tests will verify that the incrementally returned digest equals an independently calculated SHA-256 of the finished file and that dump mismatch rejection remains intact.
- Frontend tests will verify the accurate pending message.
- The complete backend and frontend suites will be run after focused tests pass.

## Success Criteria

- New exports use compression level `1` by default and support an explicitly configured level from `0` to `9`.
- The encrypted output is not reread solely to calculate its returned file digest.
- Existing backup files, inspection, restore, and security behavior remain compatible.
- Logs identify the duration of each server-side export phase.
- Administrators see an accurate explanation while the synchronous export is being prepared.
