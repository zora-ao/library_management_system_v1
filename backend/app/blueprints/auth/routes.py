from uuid import UUID

from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.rate_limits import (
  GOOGLE_PER_IP,
  LOGIN_PER_ACCOUNT,
  LOGIN_PER_IP,
  REGISTER_PER_IP,
  limiter,
  login_account_key,
)
from app.services.auth_service import (
  AuthService,
  RegistrationConflictError,
  RegistrationValidationError,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _json_object():
  data = request.get_json(silent=True)
  return data if isinstance(data, dict) else None


# google oauth
@auth_bp.post("/google")
@limiter.limit(GOOGLE_PER_IP)
def google_auth():
  data = _json_object() or {}
  token = data.get("token")

  if not isinstance(token, str) or not token.strip():
    return jsonify({
      "message": "Token is required"
    }), 400

  try:
    result = AuthService.google_auth(token)
    return jsonify(result), 200
  except PermissionError as e:
    return jsonify({ "message": str(e) }), 403
  except ValueError as e:
    return jsonify({ "message": str(e) }), 400
  except Exception:
    current_app.logger.exception("Google authentication failed")
    return jsonify({ "message": "Google authentication failed" }), 500

# getting user 
@auth_bp.get("/me")
@jwt_required()
def me():

  try:
    user_id = UUID(str(get_jwt_identity()))
    user = AuthService.get_current_user(user_id)
    return jsonify({ "user": user.to_dict() }), 200
  except ValueError as e:
    return jsonify({ "message": str(e) }), 404


# -------login------------
@auth_bp.post("/login")
@limiter.limit(LOGIN_PER_IP)
@limiter.limit(LOGIN_PER_ACCOUNT, key_func=login_account_key)
def login():

  data = _json_object() or {}

  email = data.get("email")
  password = data.get("password")

  if not isinstance(email, str) or not isinstance(password, str) or not email.strip() or not password:
    return jsonify({
      "message": "Email and password required"
    }), 400

  email = email.strip().lower()

  try:
    result = AuthService.login_user(email, password)
    return jsonify({
      "message": "Login successfully",
      "token": result["token"],
      "user": result["user"]
    }), 200
  except PermissionError as e:
    return jsonify({ "message": str(e) }), 403
  except ValueError as e:
    return jsonify({ "message": str(e) }), 400
  except Exception:
    current_app.logger.exception("Login failed")
    return jsonify({ "message": "Failed to login user" }), 500


# --------register---------
@auth_bp.post("/register")
@limiter.limit(REGISTER_PER_IP)
def register():

  data = _json_object()

  if data is None:
    return jsonify({
      "message": "Request body must be a JSON object"
    }), 400

  try:
    AuthService.register_user(
      data.get("username", ""),
      data.get("email", ""),
      data.get("password", ""),
    )
    return jsonify({ "message": "User created successfully" }), 201
  except RegistrationValidationError as e:
    return jsonify({ "message": str(e) }), 400
  except RegistrationConflictError as e:
    return jsonify({ "message": str(e) }), 409
  except Exception:
    current_app.logger.exception("Registration failed")
    return jsonify({ "message": "Failed to create user" }), 500
