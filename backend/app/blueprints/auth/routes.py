from flask import Blueprint, request, jsonify
from app.models.user import User
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.get("/me")
@jwt_required()
def me():

  user_id = int(get_jwt_identity())
  user = db.session.get(User, user_id)

  if user is None:
    return {
      "message": "User not found"
    }, 404

  return jsonify({
    "user": user.to_dict()
  }), 200


# -------login------------
@auth_bp.post("/login")
def login():

  data = request.get_json()

  if data is None:
    return {
      "message": "Request body must be JSON"
    }, 400

  student_number = data.get("student_number")
  password = data.get("password")

  if not all([student_number, password]):
    return {
      "message": "All fields are required"
    }, 400

  user = User.query.filter_by(
    student_number=student_number
  ).first()

  if user is None or not check_password_hash(user.password, password):
    return jsonify({
      "message": "Invalid Credentials"
    }), 401

  token = create_access_token(
    identity=str(user.id),
    additional_claims={
      "role": user.role
    }
  )

  return jsonify({
    "access_token": token,
    "token_type": "Bearer",
    "user": user.to_dict()
  }), 200



# --------register---------
@auth_bp.post("/register")
def register():

  data = request.get_json()

  if data is None:
    return {
      "message": "Request body must be JSON"
    }, 400

  student_number = data.get("student_number")
  first_name = data.get("first_name")
  last_name = data.get("last_name")
  password = data.get("password")
  course = data.get("course")

  if not all([student_number, first_name, last_name, password, course]):
    return {
      "message": "All fields are required"
    }, 400

  existing_user = User.query.filter_by(
    student_number=student_number
  ).first()

  if existing_user:
    return {
      "message": "Student number already exist"
    }, 409

  user = User(
    student_number=student_number,
    first_name=first_name,
    last_name=last_name,
    password=generate_password_hash(password),
    course=course,
  )

  try:
    db.session.add(user)
    db.session.commit()
  except Exception:
    db.session.rollback()
    return jsonify({
      "message": "Something went wrong"
    }), 500

  return jsonify({
    "message": "Account created successfully"
  }), 201