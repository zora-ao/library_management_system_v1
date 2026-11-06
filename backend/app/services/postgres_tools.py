from dataclasses import dataclass
import os
from pathlib import Path
import re
import subprocess

import psycopg2
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


MAX_DIAGNOSTIC_BYTES = 4096
SSL_MODES = {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}


class PostgresToolError(RuntimeError):
  def __init__(self, message: str, *, exit_code: int | None = None, diagnostic: str = ""):
    super().__init__(message)
    self.exit_code = exit_code
    self.diagnostic = diagnostic[-MAX_DIAGNOSTIC_BYTES:]


@dataclass(frozen=True)
class PostgresToolConfig:
  database_url: str
  binary_dir: Path | None = None
  timeout_seconds: int = 300
  compression_level: int | str = "1"


@dataclass(frozen=True)
class ToolCapabilities:
  available: bool
  pg_dump_version: str | None = None
  pg_restore_version: str | None = None
  server_version: str | None = None
  reason: str | None = None


@dataclass(frozen=True)
class _ConnectionParts:
  host: str
  port: int
  database: str
  username: str
  password: str
  sslmode: str | None


def _connection_parts(database_url: str) -> _ConnectionParts:
  try:
    url = make_url(database_url)
  except (ArgumentError, TypeError, ValueError) as exc:
    raise PostgresToolError("A valid PostgreSQL database URL is required") from exc
  if url.get_backend_name() not in ("postgresql", "postgres"):
    raise PostgresToolError("PostgreSQL is required for database backups")
  if not all((url.host, url.database, url.username)):
    raise PostgresToolError("The PostgreSQL database URL is incomplete")
  sslmode = url.query.get("sslmode")
  if sslmode is not None and sslmode not in SSL_MODES:
    raise PostgresToolError("The PostgreSQL SSL mode is unsupported")
  return _ConnectionParts(
    host=url.host,
    port=url.port or 5432,
    database=url.database,
    username=url.username,
    password=url.password or "",
    sslmode=sslmode,
  )


def _libpq_environment(parts: _ConnectionParts) -> dict[str, str]:
  environment = os.environ.copy()
  environment.update({
    "PGHOST": parts.host,
    "PGPORT": str(parts.port),
    "PGDATABASE": parts.database,
    "PGUSER": parts.username,
    "PGPASSWORD": parts.password,
  })
  if parts.sslmode:
    environment["PGSSLMODE"] = parts.sslmode
  return environment


def _binary(config: PostgresToolConfig, name: str) -> str:
  if config.binary_dir is None:
    return name
  suffix = ".exe" if os.name == "nt" else ""
  return str(Path(config.binary_dir) / f"{name}{suffix}")


def _safe_diagnostic(text: str, config: PostgresToolConfig, parts: _ConnectionParts) -> str:
  safe = text or ""
  for secret in (config.database_url, parts.password):
    if secret:
      safe = safe.replace(secret, "[redacted]")
  return safe[-MAX_DIAGNOSTIC_BYTES:]


def _run(
  config: PostgresToolConfig,
  args: list[str],
  operation: str,
  *,
  discard_stdout: bool = False,
) -> subprocess.CompletedProcess:
  parts = _connection_parts(config.database_url)
  try:
    result = subprocess.run(
      args,
      env=_libpq_environment(parts),
      stdout=subprocess.DEVNULL if discard_stdout else subprocess.PIPE,
      stderr=subprocess.PIPE,
      text=True,
      timeout=config.timeout_seconds,
      check=False,
    )
  except FileNotFoundError as exc:
    raise PostgresToolError("PostgreSQL client tools are not installed") from exc
  except subprocess.TimeoutExpired as exc:
    raise PostgresToolError(f"{operation} timed out") from exc
  except OSError as exc:
    raise PostgresToolError(f"{operation} could not start") from exc

  if result.returncode != 0:
    raise PostgresToolError(
      f"{operation} failed",
      exit_code=result.returncode,
      diagnostic=_safe_diagnostic(result.stderr, config, parts),
    )
  return result


def _version_number(output: str) -> str:
  match = re.search(r"(?:PostgreSQL\)?\s+)(\d+(?:\.\d+)?)", output)
  if not match:
    raise PostgresToolError("PostgreSQL client version could not be determined")
  return match.group(1)


def _client_version(config: PostgresToolConfig, binary_name: str) -> str:
  result = _run(
    config,
    [_binary(config, binary_name), "--version"],
    "PostgreSQL client version check",
  )
  return _version_number(result.stdout)


def _read_server_version(config: PostgresToolConfig) -> str:
  _connection_parts(config.database_url)
  try:
    with psycopg2.connect(config.database_url, connect_timeout=10) as connection:
      with connection.cursor() as cursor:
        cursor.execute("SHOW server_version")
        row = cursor.fetchone()
  except psycopg2.Error as exc:
    raise PostgresToolError("PostgreSQL server version could not be determined") from exc
  if not row or not row[0]:
    raise PostgresToolError("PostgreSQL server version could not be determined")
  return _version_number(f"PostgreSQL {row[0]}")


def _major(version: str) -> int:
  return int(version.split(".", 1)[0])


def _compression_level(value: int | str) -> int:
  if type(value) is int:
    level = value
  elif isinstance(value, str) and value in tuple(str(level) for level in range(10)):
    level = int(value)
  else:
    raise PostgresToolError(
      "PostgreSQL backup compression level must be an integer from 0 to 9"
    )
  if not 0 <= level <= 9:
    raise PostgresToolError(
      "PostgreSQL backup compression level must be an integer from 0 to 9"
    )
  return level


def check_capabilities(config: PostgresToolConfig) -> ToolCapabilities:
  try:
    _compression_level(config.compression_level)
    dump_version = _client_version(config, "pg_dump")
    restore_version = _client_version(config, "pg_restore")
    server_version = _read_server_version(config)
    if _major(dump_version) < _major(server_version):
      return ToolCapabilities(
        available=False,
        pg_dump_version=dump_version,
        pg_restore_version=restore_version,
        server_version=server_version,
        reason="pg_dump is older than PostgreSQL server",
      )
    if _major(dump_version) != _major(restore_version):
      return ToolCapabilities(
        available=False,
        pg_dump_version=dump_version,
        pg_restore_version=restore_version,
        server_version=server_version,
        reason="pg_dump and pg_restore major versions do not match",
      )
    return ToolCapabilities(
      available=True,
      pg_dump_version=dump_version,
      pg_restore_version=restore_version,
      server_version=server_version,
    )
  except PostgresToolError as exc:
    return ToolCapabilities(available=False, reason=str(exc))


def create_custom_dump(config: PostgresToolConfig, output_path: Path) -> None:
  compression_level = _compression_level(config.compression_level)
  _run(
    config,
    [
      _binary(config, "pg_dump"),
      "--format=custom",
      f"--compress={compression_level}",
      "--no-owner",
      "--no-privileges",
      "--exclude-table=public.system_security_state",
      "--file",
      str(output_path),
    ],
    "Database backup",
  )


def validate_custom_dump(config: PostgresToolConfig, dump_path: Path) -> None:
  _run(
    config,
    [_binary(config, "pg_restore"), "--list", str(dump_path)],
    "Backup validation",
    discard_stdout=True,
  )


def restore_custom_dump(config: PostgresToolConfig, dump_path: Path) -> None:
  parts = _connection_parts(config.database_url)
  _run(
    config,
    [
      _binary(config, "pg_restore"),
      "--clean",
      "--if-exists",
      "--single-transaction",
      "--no-owner",
      "--no-privileges",
      "--dbname",
      parts.database,
      str(dump_path),
    ],
    "Database restore",
  )
