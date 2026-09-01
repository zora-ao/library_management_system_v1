from flask import Blueprint, request, jsonify, current_app
from google.oauth2 import id_token
from google.auth.transport import requests
from app.models import User
from app.extensions import db
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.services.auth_service import AuthService

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
    return jsonify({ "message": "Google authentication failed" }), 500

# getting user 
@auth_bp.get("/me")
@jwt_required()
def me():

  user_id = int(get_jwt_identity())
  try:
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
  except Exception:
    return jsonify({ "message": "Failed to login user" }), 500


# --------register---------
@auth_bp.post("/register")
def register():

  data = request.get_json() or {}

  username = data.get("username", "").strip()
  email = data.get("email", "").strip().lower()
  password = data.get("password", "")
  role = data.get("role", "student").strip().lower()

  if not all([email, username, password, role]):
    return jsonify({
      "message": "All fields are required"
    }), 400

  try:
    AuthService.register_user(username, email, password, role)
    return jsonify({ "message": "User created successfully" }), 201
  except ValueError as e:
    return jsonify({ "message": str(e) }), 409
  except Exception:
    return jsonify({ "message": "Failed to create user" }), 500