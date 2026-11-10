"""Recover the database from an encrypted backup, even when the app cannot run.

The admin page can only restore while the app works: someone has to log in,
and the restore checks the live schema version first. This script needs
neither, so it also recovers from the cases the page cannot:

  * the users table (or every account) was deleted, so nobody can log in
  * alembic_version or system_security_state was dropped
  * every table was dropped, or DATABASE_URL points at a brand-new empty database

Steps:
  1. Decrypt the backup and check it belongs to this app, is intact, holds an
     active administrator, and was made by a schema version this code knows.
  2. Recreate system_security_state if it is missing (backups exclude it).
  3. Put the app in maintenance mode, wait for in-flight requests, and restore
     every table in the backup in one transaction (nothing changes on failure).
  4. Sign everyone out, leave maintenance mode, and run any newer migrations.

Usage (from backend/):
    .venv/Scripts/python.exe scripts/recover_database.py path/to/file.pahina-backup

It targets DATABASE_URL (backend/.env unless set in the environment), shows
which database that is, and asks you to type its name before changing it.
The passphrase is prompted for, or read from PAHINA_BACKUP_PASSPHRASE.
"""

import argparse
import getpass
import os
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from alembic.config import Config as AlembicConfig  # noqa: E402
from alembic.script import ScriptDirectory  # noqa: E402
from flask_migrate import upgrade  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.maintenance import exclusive_maintenance_lock  # noqa: E402
from app.security_state import finalize_restore_security  # noqa: E402
from app.services.backup_envelope import InvalidBackupError, decrypt_backup  # noqa: E402
from app.services.backup_service import APPLICATION_ID, BackupService, _sha256_file  # noqa: E402
from app.services.postgres_tools import (  # noqa: E402
  PostgresToolError,
  check_capabilities,
  restore_custom_dump,
  validate_custom_dump,
)


MIGRATIONS_DIR = BACKEND_DIR / "migrations"
PASSPHRASE_ENV = "PAHINA_BACKUP_PASSPHRASE"

# Same shape as migrations f6d7e8a9b0c1 + f7a8b9c0d1e2 (no id sequence).
SECURITY_STATE_DDL = """
CREATE TABLE IF NOT EXISTS public.system_security_state (
  id SMALLINT NOT NULL,
  auth_epoch VARCHAR(36) NOT NULL,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  restore_started_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT system_security_state_pkey PRIMARY KEY (id),
  CONSTRAINT ck_system_security_state_singleton CHECK (id = 1)
)
"""
SECURITY_STATE_ROW = """
INSERT INTO public.system_security_state (id, auth_epoch, maintenance_mode)
VALUES (1, gen_random_uuid()::text, false)
ON CONFLICT (id) DO NOTHING
"""

TABLES_TO_REPORT = ("users", "books", "categories", "borrows", "reviews", "favorites")


class RecoveryError(Exception):
  pass


def describe_target(database_url: str) -> tuple[str, str]:
  url = make_url(database_url)
  if url.get_backend_name() not in ("postgresql", "postgres"):
    raise RecoveryError("DATABASE_URL must point at PostgreSQL")
  return url.host or "localhost", url.database or ""


def known_revisions() -> set[str]:
  config = AlembicConfig()
  config.set_main_option("script_location", str(MIGRATIONS_DIR))
  return {script.revision for script in ScriptDirectory.from_config(config).walk_revisions()}


def decrypt_and_check(backup_file: Path, passphrase: str, workspace: Path):
  dump_path = workspace / "recovery.dump"
  try:
    manifest = decrypt_backup(backup_file, dump_path, passphrase, BackupService._envelope_policy())
  except InvalidBackupError as error:
    raise RecoveryError("Could not open the backup: wrong passphrase or not a Pahina backup") from error

  if manifest.application != APPLICATION_ID:
    raise RecoveryError("This backup was made by a different application")
  if dump_path.stat().st_size != manifest.dump_bytes or _sha256_file(dump_path) != manifest.dump_sha256:
    raise RecoveryError("The backup's database archive is damaged")
  if manifest.active_admin_count < 1:
    raise RecoveryError("The backup has no active administrator, so nobody could log in after recovery")
  unknown = sorted(set(manifest.schema_revisions) - known_revisions())
  if unknown:
    raise RecoveryError(
      f"The backup was made by a newer version of the app (schema {', '.join(unknown)}); "
      "deploy that version of the code first"
    )
  validate_custom_dump(BackupService._postgres_config(), dump_path)
  return manifest, dump_path


def ensure_security_state() -> bool:
  existed = db.session.execute(
    text("SELECT to_regclass('public.system_security_state') IS NOT NULL")
  ).scalar()
  db.session.execute(text(SECURITY_STATE_DDL))
  db.session.execute(text(SECURITY_STATE_ROW))
  db.session.commit()
  return not existed


def set_maintenance(enabled: bool) -> None:
  db.session.execute(
    text(
      "UPDATE public.system_security_state SET maintenance_mode = :enabled, "
      "restore_started_at = CASE WHEN :enabled THEN now() ELSE NULL END WHERE id = 1"
    ),
    {"enabled": enabled},
  )
  db.session.commit()


def report_counts() -> None:
  for table in TABLES_TO_REPORT:
    count = db.session.execute(text(f"SELECT count(*) FROM public.{table}")).scalar()
    print(f"    {table:<12} {count}")
  admins = db.session.execute(
    text("SELECT count(*) FROM public.users WHERE lower(role) = 'admin' AND is_active")
  ).scalar()
  print(f"    {'admins':<12} {admins} active")


def recover(backup_file: Path, assume_yes: bool) -> None:
  app = create_app()
  with app.app_context():
    database_url = app.config.get("SQLALCHEMY_DATABASE_URI") or ""
    host, database = describe_target(database_url)
    print(f"Target database: {database} on {host}")

    capabilities = check_capabilities(BackupService._postgres_config())
    if not capabilities.available:
      raise RecoveryError(f"PostgreSQL tools are not usable: {capabilities.reason}")

    passphrase = os.environ.get(PASSPHRASE_ENV) or getpass.getpass("Backup passphrase: ")

    with tempfile.TemporaryDirectory(prefix="pahina-recovery-") as workspace_name:
      manifest, dump_path = decrypt_and_check(backup_file, passphrase, Path(workspace_name))
      print(f"Backup created {manifest.created_at}, schema {', '.join(manifest.schema_revisions)}")
      for table, count in sorted(manifest.table_counts.items()):
        print(f"    {table:<16} {count} rows")

      if not assume_yes:
        print(f"\nThis replaces every table in the backup on '{database}' and signs everyone out.")
        if input(f"Type the database name ({database}) to continue: ").strip() != database:
          raise RecoveryError("Cancelled; nothing was changed")

      if ensure_security_state():
        print("Recreated the missing system_security_state table")
      set_maintenance(True)
      print("Maintenance mode on; waiting for in-flight requests to finish...")
      restored = False
      try:
        with exclusive_maintenance_lock(database_url):
          print("Restoring tables...")
          restore_custom_dump(BackupService._postgres_config(), dump_path)
          restored = True
      finally:
        db.session.remove()
        db.engine.dispose()
        if not restored:
          set_maintenance(False)
          print("Restore failed; the database was left unchanged and maintenance mode is off")

    finalize_restore_security()
    print("Signed everyone out and turned maintenance mode off")
    # finalize_restore_security reads the row back after committing, which opens a
    # transaction holding a lock on system_security_state. Close it, or a migration
    # that alters that table waits on this session forever.
    db.session.remove()

    upgrade(directory=str(MIGRATIONS_DIR))
    current = db.session.execute(text("SELECT version_num FROM alembic_version")).scalars().all()
    print(f"Schema is at {', '.join(current)}")

    print("Recovered:")
    report_counts()


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
  parser.add_argument("backup_file", type=Path, help="the .pahina-backup file downloaded from the admin page")
  parser.add_argument("--yes", action="store_true", help="skip the confirmation prompt")
  args = parser.parse_args()

  if not args.backup_file.is_file():
    print(f"Backup file not found: {args.backup_file}", file=sys.stderr)
    return 2
  try:
    recover(args.backup_file, args.yes)
  except (RecoveryError, PostgresToolError) as error:
    detail = getattr(error, "diagnostic", "")
    print(f"Recovery failed: {error}", file=sys.stderr)
    if detail:
      print(detail, file=sys.stderr)
    return 1
  print("Done. Log in with an administrator account from the backup.")
  return 0


if __name__ == "__main__":
  sys.exit(main())
