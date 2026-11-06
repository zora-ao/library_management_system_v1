from uuid import UUID

from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.auth_service import (
  AuthService,
  RegistrationConflictError,
  RegistrationValidationError,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# google oauth
@auth_bp.post("/google")
def google_auth():
  data = request.get_json()
  token = data.get("token")

  if not token:
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
def login():

  data = request.get_json() or {}

  email = data.get("email", "").strip().lower()
  password = data.get("password")

  if not email or not password:
    return jsonify({
      "message": "Email and password required"
    }), 400

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
  except Exception as e:
    return jsonify({ "message": f"Failed to login user: {e}" }), 500


# --------register---------
@auth_bp.post("/register")
def register():

  data = request.get_json(silent=True)

  if not isinstance(data, dict):
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
