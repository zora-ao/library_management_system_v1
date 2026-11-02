from dataclasses import asdict
from pathlib import Path
import tempfile
from uuid import UUID

from flask import Blueprint, current_app, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity

from app.middleware.auth import administrator_required
from app.services.backup_envelope import InvalidBackupError
from app.services.backup_security import (
  StepUpProof,
  issue_operation_token,
  verify_operation_token,
  verify_step_up,
)
from app.services.backup_service import BackupService, BackupServiceError
from app.services.postgres_tools import PostgresToolError


backups_bp = Blueprint("backups", __name__, url_prefix="/api/admin/backups")
UPLOAD_CHUNK_BYTES = 1024 * 1024


@backups_bp.after_request
def prevent_backup_response_caching(response):
  response.headers["Cache-Control"] = "no-store"
  return response


def _current_user_id() -> UUID:
  return UUID(str(get_jwt_identity()))


def _save_bounded_upload(upload, destination: Path) -> None:
  if upload is None or not upload.filename:
    raise ValueError("A backup file is required")
  maximum = int(current_app.config.get("BACKUP_MAX_BYTES", 262_144_000))
  total = 0
  with destination.open("wb") as output:
    while True:
      chunk = upload.stream.read(UPLOAD_CHUNK_BYTES)
      if not chunk:
        break
      total += len(chunk)
      if total > maximum:
        raise ValueError("Backup file exceeds the configured size limit")
      output.write(chunk)


def _error_response(error):
  if isinstance(error, PermissionError):
    return jsonify({"message": str(error)}), 403
  if isinstance(error, (ValueError, InvalidBackupError, BackupServiceError, PostgresToolError)):
    return jsonify({"message": str(error)}), 400
  current_app.logger.exception(
    "backup_operation_failed",
    extra={"event": "backup_operation_failed"},
  )
  return jsonify({"message": "Backup operation failed"}), 500


def _cleanup_stream(iterable, workspace):
  try:
    yield from iterable
  finally:
    close = getattr(iterable, "close", None)
    if close is not None:
      close()
    workspace.cleanup()


@backups_bp.get("/capabilities")
@administrator_required()
def backup_capabilities():
  return jsonify(asdict(BackupService.capabilities()))


@backups_bp.post("/export")
@administrator_required()
def export_backup():
  workspace = None
  try:
    data = request.get_json(silent=True) or {}
    passphrase = data.get("passphrase", "")
    if not isinstance(passphrase, str) or len(passphrase) < 12:
      raise ValueError("Passphrase must be at least 12 characters")
    if passphrase != data.get("confirm_passphrase"):
      raise ValueError("Passphrase confirmation does not match")
    step_up = data.get("step_up") or {}
    user_id = _current_user_id()
    verify_step_up(
      user_id,
      StepUpProof(step_up.get("method", ""), step_up.get("credential", "")),
    )

    workspace = tempfile.TemporaryDirectory(prefix="pahina-backup-export-")
    artifact = BackupService.create_backup(passphrase, Path(workspace.name))
    safety_token = issue_operation_token("safety", user_id, artifact.file_digest)
    response = send_file(
      artifact.path,
      as_attachment=True,
      download_name=artifact.filename,
      mimetype="application/octet-stream",
    )
    response.headers["X-Backup-Safety-Token"] = safety_token
    response.response = _cleanup_stream(response.response, workspace)
    current_app.logger.info(
      "backup_export_completed",
      extra={"event": "backup_export_completed", "user_id": str(user_id)},
    )
    return response
  except Exception as error:
    if workspace is not None:
      workspace.cleanup()
    return _error_response(error)


@backups_bp.post("/inspect")
@administrator_required()
def inspect_backup():
  try:
    passphrase = request.form.get("passphrase", "")
    with tempfile.TemporaryDirectory(prefix="pahina-backup-inspect-") as workspace_name:
      workspace = Path(workspace_name)
      encrypted_path = workspace / "selected.pahina-backup"
      _save_bounded_upload(request.files.get("backup"), encrypted_path)
      inspected = BackupService.inspect_backup(encrypted_path, passphrase, workspace)
      restore_token = issue_operation_token(
        "restore", _current_user_id(), inspected.file_digest
      )
      return jsonify({
        "manifest": inspected.manifest.to_dict(),
        "restore_token": restore_token,
      })
  except Exception as error:
    return _error_response(error)


@backups_bp.post("/restore")
@administrator_required()
def restore_backup():
  try:
    if request.form.get("confirmation") != "RESTORE DATABASE":
      raise ValueError("Type RESTORE DATABASE to confirm")
    user_id = _current_user_id()
    with tempfile.TemporaryDirectory(prefix="pahina-backup-restore-") as workspace_name:
      workspace = Path(workspace_name)
      encrypted_path = workspace / "selected.pahina-backup"
      _save_bounded_upload(request.files.get("backup"), encrypted_path)
      inspected = BackupService.inspect_backup(
        encrypted_path,
        request.form.get("passphrase", ""),
        workspace,
      )
      verify_operation_token(
        request.form.get("restore_token", ""),
        kind="restore",
        user_id=user_id,
        digest=inspected.file_digest,
        max_age=current_app.config.get("BACKUP_RESTORE_TOKEN_MAX_AGE_SECONDS", 900),
      )
      verify_operation_token(
        request.form.get("safety_token", ""),
        kind="safety",
        user_id=user_id,
        digest=None,
        max_age=current_app.config.get("BACKUP_SAFETY_TOKEN_MAX_AGE_SECONDS", 900),
      )
      verify_step_up(
        user_id,
        StepUpProof(
          request.form.get("step_up_method", ""),
          request.form.get("step_up_credential", ""),
        ),
      )
      BackupService.restore_backup(inspected, inspected.file_digest)

    current_app.logger.warning(
      "backup_restore_completed",
      extra={"event": "backup_restore_completed", "user_id": str(user_id)},
    )
    return jsonify({"message": "Database restored successfully"})
  except Exception as error:
    return _error_response(error)
