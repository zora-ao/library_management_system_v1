from dataclasses import dataclass
from typing import Literal
import uuid
from uuid import UUID

from flask import current_app
from itsdangerous import BadData, URLSafeTimedSerializer

from app.extensions import db
from app.models import User
from app.services.auth_service import AuthService


OperationKind = Literal["safety", "restore"]
StepUpMethod = Literal["password", "google"]


@dataclass(frozen=True)
class StepUpProof:
  method: StepUpMethod
  credential: str


def _serializer() -> URLSafeTimedSerializer:
  signing_key = current_app.config.get("BACKUP_TOKEN_SIGNING_KEY")
  if not signing_key:
    raise RuntimeError("Backup token signing is not configured")
  if signing_key == current_app.config.get("JWT_SECRET_KEY"):
    raise RuntimeError("Backup token signing key must differ from JWT signing key")
  return URLSafeTimedSerializer(
    signing_key,
    salt="pahina-backup-operations-v1",
  )


def verify_step_up(user_id: UUID, proof: StepUpProof) -> User:
  try:
    normalized_user_id = UUID(str(user_id))
  except (TypeError, ValueError) as exc:
    raise PermissionError("Administrator access required") from exc

  user = db.session.get(User, normalized_user_id)
  if user is None or not user.is_active or not user.is_admin():
    raise PermissionError("Administrator access required")

  credential = proof.credential.strip() if proof.credential else ""
  if not credential:
    raise ValueError("Step-up authentication failed")

  if user.google_id:
    if proof.method != "google":
      raise ValueError("Step-up authentication failed")
    identity = AuthService.verify_google_credential(credential)
    identity_email = str(identity.get("email", "")).strip().lower()
    if identity.get("sub") != user.google_id or identity_email != user.email.lower():
      raise ValueError("Step-up authentication failed")
  elif proof.method != "password" or not user.check_password(credential):
    raise ValueError("Step-up authentication failed")

  return user


def issue_operation_token(
  kind: OperationKind,
  user_id: UUID,
  digest: str,
) -> str:
  if kind not in ("safety", "restore"):
    raise ValueError("Unsupported backup operation token kind")
  return _serializer().dumps({
    "kind": kind,
    "user_id": str(user_id),
    "digest": digest,
    "jti": str(uuid.uuid4()),
  })


def verify_operation_token(
  token: str,
  *,
  kind: OperationKind,
  user_id: UUID,
  digest: str | None,
  max_age: int,
) -> dict:
  try:
    payload = _serializer().loads(token, max_age=max_age)
  except (BadData, TypeError, ValueError) as exc:
    raise ValueError("Invalid or expired backup operation token") from exc

  if (
    payload.get("kind") != kind
    or payload.get("user_id") != str(user_id)
    or (digest is not None and payload.get("digest") != digest)
    or not payload.get("jti")
  ):
    raise ValueError("Invalid or expired backup operation token")

  return payload
