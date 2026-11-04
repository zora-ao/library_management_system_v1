from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
from pathlib import Path
import time

from flask import current_app
from sqlalchemy import func, select, text

from app.extensions import db
from app.maintenance import exclusive_maintenance_lock
from app.models import User
from app.security_state import (
  begin_restore_maintenance,
  clear_restore_maintenance,
  finalize_restore_security,
)
from app.services.backup_envelope import (
  BackupManifest,
  EnvelopePolicy,
  decrypt_backup,
  encrypt_backup,
)
from app.services.postgres_tools import (
  PostgresToolConfig,
  ToolCapabilities,
  check_capabilities,
  create_custom_dump,
  restore_custom_dump,
  validate_custom_dump,
)


APPLICATION_ID = "pahina-library"
DATA_TABLES = (
  "users",
  "students",
  "books",
  "categories",
  "borrows",
  "favorites",
  "reviews",
)
HASH_CHUNK_BYTES = 1024 * 1024


class BackupServiceError(RuntimeError):
  pass


class BackupCompatibilityError(BackupServiceError):
  pass


class RestoreFinalizationError(BackupServiceError):
  pass


@dataclass(frozen=True)
class BackupArtifact:
  path: Path
  file_digest: str
  filename: str
  manifest: BackupManifest


@dataclass(frozen=True)
class InspectedBackup:
  path: Path
  file_digest: str
  manifest: BackupManifest


def _sha256_file(path: Path) -> str:
  digest = hashlib.sha256()
  with path.open("rb") as handle:
    for chunk in iter(lambda: handle.read(HASH_CHUNK_BYTES), b""):
      digest.update(chunk)
  return digest.hexdigest()


class BackupService:
  @staticmethod
  def _postgres_config() -> PostgresToolConfig:
    binary_dir = current_app.config.get("BACKUP_PG_BIN_DIR")
    return PostgresToolConfig(
      database_url=current_app.config.get("SQLALCHEMY_DATABASE_URI") or "",
      binary_dir=Path(binary_dir) if binary_dir else None,
      timeout_seconds=current_app.config.get("BACKUP_OPERATION_TIMEOUT_SECONDS", 300),
      compression_level=current_app.config.get("BACKUP_PG_COMPRESSION_LEVEL", "1"),
    )

  @staticmethod
  def _envelope_policy() -> EnvelopePolicy:
    return EnvelopePolicy(
      max_bytes=current_app.config.get("BACKUP_MAX_BYTES", 262_144_000),
      scrypt_n=current_app.config.get("BACKUP_SCRYPT_N", 32768),
      scrypt_r=current_app.config.get("BACKUP_SCRYPT_R", 8),
      scrypt_p=current_app.config.get("BACKUP_SCRYPT_P", 1),
    )

  @staticmethod
  def capabilities() -> ToolCapabilities:
    signing_key = current_app.config.get("BACKUP_TOKEN_SIGNING_KEY")
    if not signing_key:
      return ToolCapabilities(available=False, reason="Backup token signing is not configured")
    if signing_key == current_app.config.get("JWT_SECRET_KEY"):
      return ToolCapabilities(
        available=False,
        reason="Backup token signing key must differ from JWT signing key",
      )
    return check_capabilities(BackupService._postgres_config())

  @staticmethod
  def _schema_revisions() -> tuple[str, ...]:
    revisions = db.session.execute(
      text("SELECT version_num FROM alembic_version ORDER BY version_num")
    ).scalars().all()
    return tuple(sorted(str(revision) for revision in revisions))

  @staticmethod
  def _table_counts() -> dict[str, int]:
    counts = {}
    for table_name in DATA_TABLES:
      table = db.metadata.tables.get(table_name)
      if table is None:
        raise BackupServiceError(f"Application table is missing: {table_name}")
      counts[table_name] = db.session.execute(
        select(func.count()).select_from(table)
      ).scalar_one()
    return counts

  @staticmethod
  def _active_admin_count() -> int:
    return db.session.execute(
      select(func.count())
      .select_from(User)
      .where(func.lower(User.role) == "admin", User.is_active.is_(True))
    ).scalar_one()

  @staticmethod
  def create_backup(passphrase: str, workspace: Path) -> BackupArtifact:
    workspace = Path(workspace)
    capabilities = BackupService.capabilities()
    if not capabilities.available:
      raise BackupServiceError(capabilities.reason or "Database backups are unavailable")

    started_at = time.perf_counter()
    dump_path = workspace / "database.dump"
    before = (
      BackupService._schema_revisions(),
      BackupService._table_counts(),
      BackupService._active_admin_count(),
    )
    metadata_before_done = time.perf_counter()
    create_custom_dump(BackupService._postgres_config(), dump_path)
    native_dump_done = time.perf_counter()
    after = (
      BackupService._schema_revisions(),
      BackupService._table_counts(),
      BackupService._active_admin_count(),
    )
    metadata_after_done = time.perf_counter()
    if before != after:
      dump_path.unlink(missing_ok=True)
      raise BackupServiceError("Database changed while the backup was being created")
    dump_bytes = dump_path.stat().st_size
    if dump_bytes > BackupService._envelope_policy().max_bytes:
      dump_path.unlink(missing_ok=True)
      raise BackupServiceError("Database backup exceeds the configured size limit")
    dump_digest = _sha256_file(dump_path)
    created_at = datetime.now(timezone.utc)
    manifest = BackupManifest(
      format_version=1,
      application=APPLICATION_ID,
      created_at=created_at.isoformat().replace("+00:00", "Z"),
      schema_revisions=before[0],
      postgres_server_version=capabilities.server_version or "unknown",
      postgres_client_version=capabilities.pg_dump_version or "unknown",
      dump_sha256=dump_digest,
      dump_bytes=dump_bytes,
      table_counts=before[1],
      active_admin_count=before[2],
    )
    filename = f"pahina-backup-{created_at.strftime('%Y%m%dT%H%M%SZ')}.pahina-backup"
    encrypted_path = workspace / filename
    file_digest = encrypt_backup(
      manifest,
      dump_path,
      encrypted_path,
      passphrase,
      BackupService._envelope_policy(),
    )
    encryption_done = time.perf_counter()
    to_milliseconds = lambda seconds: int(round(seconds * 1000))
    timings = {
      "metadata_before_ms": to_milliseconds(metadata_before_done - started_at),
      "native_dump_ms": to_milliseconds(native_dump_done - metadata_before_done),
      "metadata_after_ms": to_milliseconds(metadata_after_done - native_dump_done),
      "encryption_ms": to_milliseconds(encryption_done - metadata_after_done),
      "total_ms": to_milliseconds(encryption_done - started_at),
    }
    current_app.logger.info(
      (
        "backup_creation_timing metadata_before_ms=%d native_dump_ms=%d "
        "metadata_after_ms=%d encryption_ms=%d total_ms=%d"
      ),
      timings["metadata_before_ms"],
      timings["native_dump_ms"],
      timings["metadata_after_ms"],
      timings["encryption_ms"],
      timings["total_ms"],
      extra={
        "event": "backup_creation_timing",
        **timings,
      },
    )
    return BackupArtifact(
      path=encrypted_path,
      file_digest=file_digest,
      filename=filename,
      manifest=manifest,
    )

  @staticmethod
  def inspect_backup(
    encrypted_path: Path,
    passphrase: str,
    workspace: Path,
  ) -> InspectedBackup:
    encrypted_path = Path(encrypted_path)
    dump_path = Path(workspace) / "inspected-database.dump"
    manifest = decrypt_backup(
      encrypted_path,
      dump_path,
      passphrase,
      BackupService._envelope_policy(),
    )
    if manifest.application != APPLICATION_ID:
      raise BackupCompatibilityError("Backup was created by a different application")
    if tuple(sorted(manifest.schema_revisions)) != BackupService._schema_revisions():
      raise BackupCompatibilityError("Backup schema revision does not match this deployment")
    if manifest.active_admin_count < 1:
      raise BackupCompatibilityError("Backup does not contain an active administrator")
    if (
      dump_path.stat().st_size != manifest.dump_bytes
      or _sha256_file(dump_path) != manifest.dump_sha256
    ):
      raise BackupCompatibilityError("Backup database archive failed validation")
    validate_custom_dump(BackupService._postgres_config(), dump_path)
    return InspectedBackup(
      path=dump_path,
      file_digest=_sha256_file(encrypted_path),
      manifest=manifest,
    )

  @staticmethod
  def restore_backup(inspected: InspectedBackup, expected_digest: str) -> None:
    if inspected.file_digest != expected_digest:
      raise BackupCompatibilityError("Backup selection changed before restore")

    begin_restore_maintenance()
    native_succeeded = False
    try:
      database_url = current_app.config.get("SQLALCHEMY_DATABASE_URI") or ""
      with exclusive_maintenance_lock(database_url):
        restore_custom_dump(BackupService._postgres_config(), inspected.path)
        native_succeeded = True

        db.session.remove()
        db.engine.dispose()
        last_error = None
        for _attempt in range(3):
          try:
            finalize_restore_security()
            return
          except Exception as exc:
            last_error = exc
            db.session.rollback()
            db.session.remove()

        current_app.logger.critical(
          "backup_restore_finalization_failed",
          extra={"event": "backup_restore_finalization_failed"},
        )
        raise RestoreFinalizationError(str(last_error)) from last_error
    except Exception:
      if not native_succeeded:
        try:
          clear_restore_maintenance()
        except Exception:
          current_app.logger.critical(
            "backup_restore_maintenance_clear_failed",
            extra={"event": "backup_restore_maintenance_clear_failed"},
          )
      raise
