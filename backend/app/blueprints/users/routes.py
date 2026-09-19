from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middleware.auth import admin_required
from app.models import User, Student
from app.extensions import db

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

# update current logged in user profile
@users_bp.put("/me")
@jwt_required()
def update_current_user():
  user_id = get_jwt_identity()
  user = User.query.get_or_404(user_id)
  data = request.get_json() or {}

  if "username" in data:
    existing_user = User.query.filter(User.username == data["username"], User.id != user_id).first()
    if existing_user:
      return jsonify({
        "message": "Username already in use"
      }), 400

    user.username = data["username"]

  if "email" in data:
        existing_email = User.query.filter(User.email == data["email"], User.id != user.id).first()
        if existing_email:
            return jsonify({"message": "Email already in use"}), 400
        user.email = data["email"]

  if "phone" in data:
        user.phone = data["phone"]

  if "avatar_url" in data:
      user.avatar_url = data["avatar_url"]


  if user.role == "student" and "student" in data:
    student_data = data["student"] or {}

    if not user.student:
      user.student = Student(
          enrollment_status="Enrolled"
      )

    if "student_number" in student_data:
      student_number = student_data["student_number"].strip()

      existing_student = Student.query.filter(
          Student.student_number == student_number,
          Student.user_id != user.id
      ).first()

      if existing_student:
          return jsonify({
              "message": "Student number already in use"
          }), 400
      
      user.student.student_number = student_number

    if "course" in student_data:
        user.student.course = student_data["course"].strip()

    if "year_level" in student_data:
            user.student.year_level = student_data["year_level"].strip()
            
  db.session.commit()

  return jsonify({
    "message": "Profile updated successfully",
    "user": user.to_dict()
  }), 200


# admin or librarian for getting the users
@users_bp.get("")
@admin_required()
def get_users():

  users = User.query.order_by(User.created_at.desc()).all()

  return jsonify([user.to_dict() for user in users]), 200

# only applicable for librarian or admin
@users_bp.put("<uuid:id>/role")
@admin_required()
def update_user_role(id):
  data = request.get_json() or {}
  new_role = data.get("role")

  if new_role not in ["student", "librarian", "admin"]:
    return jsonify({
      "message": "Invalid role"
    }), 400

  target_user = User.query.get_or_404(id)
  target_user.role = new_role

  db.session.commit()

  return jsonify(target_user.to_dict()), 200