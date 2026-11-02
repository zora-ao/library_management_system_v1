from contextlib import contextmanager

from flask import jsonify, request
import psycopg2
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.extensions import db
from app.models import SystemSecurityState


MAINTENANCE_LOCK_KEY = 0x504148494E41
RESTORE_ENDPOINT = "backups.restore_backup"


def _is_postgresql(database_url: str | None) -> bool:
  if not database_url:
    return False
  try:
    return make_url(database_url).get_backend_name() in ("postgresql", "postgres")
  except (TypeError, ValueError):
    return False


def _maintenance_response():
  response = jsonify({"message": "Database maintenance is in progress"})
  response.status_code = 503
  response.headers["Retry-After"] = "5"
  response.headers["Cache-Control"] = "no-store"
  return response


def install_maintenance_guard(app) -> None:
  if not _is_postgresql(app.config.get("SQLALCHEMY_DATABASE_URI")):
    return

  @app.before_request
  def require_shared_maintenance_access():
    if not request.path.startswith("/api") or request.endpoint == RESTORE_ENDPOINT:
      return None
    try:
      state = db.session.get(SystemSecurityState, 1)
      if state is None or state.maintenance_mode:
        return _maintenance_response()
      acquired = db.session.execute(
        text("SELECT pg_try_advisory_xact_lock_shared(:lock_key)"),
        {"lock_key": MAINTENANCE_LOCK_KEY},
      ).scalar()
      if not acquired:
        return _maintenance_response()
    except Exception:
      db.session.rollback()
      return _maintenance_response()
    return None


@contextmanager
def exclusive_maintenance_lock(database_url: str):
  connection = psycopg2.connect(database_url, connect_timeout=10)
  connection.autocommit = True
  cursor = connection.cursor()
  locked = False
  try:
    cursor.execute("SELECT pg_advisory_lock(%s)", (MAINTENANCE_LOCK_KEY,))
    locked = True
    yield
  finally:
    if locked:
      try:
        cursor.execute("SELECT pg_advisory_unlock(%s)", (MAINTENANCE_LOCK_KEY,))
      except psycopg2.Error:
        pass
    cursor.close()
    connection.close()
