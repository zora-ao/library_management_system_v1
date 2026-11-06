import uuid
from datetime import datetime, timezone
from uuid import UUID

from flask import g, has_request_context, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import update
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.system_security_state import SystemSecurityState
from app.models.user import User
from app.performance import measure_authentication


_REQUEST_SECURITY_STATE_KEY = "_security_state"
_REQUEST_AUTHENTICATED_USER_KEY = "_authenticated_user"
_REQUEST_CACHE_OWNER_KEY = "_security_cache_request"


def _ensure_request_cache_owner() -> None:
  if not has_request_context():
    return

  current_request = request._get_current_object()
  if getattr(g, _REQUEST_CACHE_OWNER_KEY, None) is current_request:
    return

  g.pop(_REQUEST_SECURITY_STATE_KEY, None)
  g.pop(_REQUEST_AUTHENTICATED_USER_KEY, None)
  setattr(g, _REQUEST_CACHE_OWNER_KEY, current_request)


def cache_security_state_for_request(state: SystemSecurityState) -> None:
  if has_request_context():
    _ensure_request_cache_owner()
    setattr(g, _REQUEST_SECURITY_STATE_KEY, state)


def _clear_request_security_state() -> None:
  if has_request_context():
    _ensure_request_cache_owner()
    g.pop(_REQUEST_SECURITY_STATE_KEY, None)


def _security_state() -> SystemSecurityState:
  if has_request_context():
    _ensure_request_cache_owner()
    cached = getattr(g, _REQUEST_SECURITY_STATE_KEY, None)
    if cached is not None:
      return cached

  state = db.session.get(SystemSecurityState, 1)
  if state is None:
    raise RuntimeError("System security state is not initialized")
  cache_security_state_for_request(state)
  return state


def get_authenticated_user(user_id) -> User | None:
  if has_request_context():
    _ensure_request_cache_owner()
    cached = getattr(g, _REQUEST_AUTHENTICATED_USER_KEY, None)
    if cached is not None and cached.id == user_id:
      return cached

  user = db.session.get(User, user_id)
  if user is not None and has_request_context():
    _ensure_request_cache_owner()
    setattr(g, _REQUEST_AUTHENTICATED_USER_KEY, user)
  return user


def get_auth_epoch() -> str:
  return _security_state().auth_epoch


def rotate_auth_epoch() -> str:
  state = _security_state()
  state.auth_epoch = str(uuid.uuid4())
  db.session.commit()
  return state.auth_epoch


def begin_restore_maintenance() -> None:
  _clear_request_security_state()
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
    _clear_request_security_state()
    raise RuntimeError("Database restore is already in progress")
  db.session.commit()
  _clear_request_security_state()


def clear_restore_maintenance() -> None:
  _clear_request_security_state()
  state = _security_state()
  state.maintenance_mode = False
  state.restore_started_at = None
  db.session.commit()


def finalize_restore_security() -> str:
  _clear_request_security_state()
  state = _security_state()
  state.auth_epoch = str(uuid.uuid4())
  state.maintenance_mode = False
  state.restore_started_at = None
  db.session.commit()
  return state.auth_epoch


def configure_jwt_security(jwt_manager) -> None:
  @jwt_manager.token_in_blocklist_loader
  def token_is_revoked(_jwt_header, jwt_payload):
    with measure_authentication():
      try:
        identity = UUID(str(jwt_payload.get("sub") or get_jwt_identity()))
        user = db.session.get(
          User,
          identity,
          options=[joinedload(User.student)],
        )
        state = _security_state()
      except (RuntimeError, TypeError, ValueError):
        return True

      if user is None or state is None or not user.is_active:
        return True

      token_role = str(jwt_payload.get("role", "")).lower()
      revoked = (
        jwt_payload.get("auth_epoch") != state.auth_epoch
        or token_role != user.role.lower()
      )
      if not revoked and has_request_context():
        _ensure_request_cache_owner()
        setattr(g, _REQUEST_AUTHENTICATED_USER_KEY, user)
      return revoked

  @jwt_manager.revoked_token_loader
  def revoked_token(_jwt_header, _jwt_payload):
    return jsonify({"message": "Authentication required"}), 401
