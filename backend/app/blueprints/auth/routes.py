from flask import Blueprint, request, jsonify, current_app
from google.oauth2 import id_token
from google.auth.transport import requests
from app.models import User
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

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
    google_client_id = current_app.config["GOOGLE_CLIENT_ID"]

    id_info = id_token.verify_oauth2_token(
      token, requests.Request(), google_client_id
    )

    email = id_info["email"]
    google_id = id_info["sub"]
    avatar = id_info.get("picture", "")
    name = id_info.get("name", "")
    default_username = name if name else email.split("@")[0]

    # find or create user
    user = User.query.filter(
      (User.email == email) | (User.google_id == google_id)
    ).first()

    if not user:
      user = User(
        email=email,
        username= default_username, 
        google_id=google_id,
        role="student",
        avatar_url=avatar,
      )
      db.session.add(user)
      db.session.commit()
    elif not user.google_id:
      user.google_id = google_id
      db.session.commit()

    # issue the jwt token
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
      "access_token": access_token,
      "user": user.to_dict()
    }), 200

  except ValueError as e:
    print(f"\n[GOOGLE OAUTH VERIFICATION ERROR]: {e}\n")
    return jsonify({"message": f"Invalid token: {e}"}), 401

# getting user 
@auth_bp.get("/me")
@jwt_required()
def me():

  user_id = int(get_jwt_identity())
  user = db.session.get(User, user_id)

  if not user or not user.is_active:
    return {
      "message": "User not found or inactive"
    }, 404

  return jsonify({
    "user": user.to_dict()
  }), 200


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

  user = User.query.filter_by(email=email).first()

  if not user or not user.check_password(password):
    return jsonify({
      "message": "Invalid email and password"
    }), 401

  if not user.is_active:
    return jsonify({
      "message": "Account is deactivated"
    }), 403

  # generate jwt with custom claims for roles
  access_token = create_access_token(
    identity=str(user.id),
    additional_claims={"role": user.role, "username": user.username}
  )

  return jsonify({
    "message": "Login successfully",
    "token": access_token,
    "user": user.to_dict()
  }), 200


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

  if User.query.filter((User.email == email) | (User.username == username)).first():
    return jsonify({
      "message": "Username or password already exist"
    }), 409

  try:
    new_user = User(
      username=username,
      email=email,
      password=password,
      role=role
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
      "message": "User registered successfully"
    }), 201
  except Exception as e:
    db.session.rollback()
    return jsonify({
      "message": "Registration failed", "error": str(e)
    })