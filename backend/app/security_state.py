import uuid
from datetime import datetime, timezone
from uuid import UUID

from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import update

from app.extensions import db
from app.models.system_security_state import SystemSecurityState
from app.models.user import User


def _security_state() -> SystemSecurityState:
  state = db.session.get(SystemSecurityState, 1)
  if state is None:
    raise RuntimeError("System security state is not initialized")
  return state


def get_auth_epoch() -> str:
  return _security_state().auth_epoch


def rotate_auth_epoch() -> str:
  state = _security_state()
  state.auth_epoch = str(uuid.uuid4())
  db.session.commit()
  return state.auth_epoch


def begin_restore_maintenance() -> None:
  result = db.session.execute(
    update(SystemSecurityState)
    .where(
      SystemSecurityState.id == 1,
      SystemSecurityState.maintenance_mode.is_(False),
    )
    .values(
      maintenance_mode=True,
      restore_started_at=datetime.now(timezone.utc),
    )
  )
  if result.rowcount != 1:
    db.session.rollback()
    raise RuntimeError("Database restore is already in progress")
  db.session.commit()


def clear_restore_maintenance() -> None:
  state = _security_state()
  state.maintenance_mode = False
  state.restore_started_at = None
  db.session.commit()


def finalize_restore_security() -> str:
  state = _security_state()
  state.auth_epoch = str(uuid.uuid4())
  state.maintenance_mode = False
  state.restore_started_at = None
  db.session.commit()
  return state.auth_epoch


def configure_jwt_security(jwt_manager) -> None:
  @jwt_manager.token_in_blocklist_loader
  def token_is_revoked(_jwt_header, jwt_payload):
    try:
      identity = UUID(str(jwt_payload.get("sub") or get_jwt_identity()))
      user = db.session.get(User, identity)
      state = db.session.get(SystemSecurityState, 1)
    except (TypeError, ValueError):
      return True

    if user is None or state is None or not user.is_active:
      return True

    token_role = str(jwt_payload.get("role", "")).lower()
    return (
      jwt_payload.get("auth_epoch") != state.auth_epoch
      or token_role != user.role.lower()
    )

  @jwt_manager.revoked_token_loader
  def revoked_token(_jwt_header, _jwt_payload):
    return jsonify({"message": "Authentication required"}), 401
