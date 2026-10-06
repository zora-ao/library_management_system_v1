from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.middleware.auth import admin_required
from app.models import User, Student
from app.extensions import db
from app.utils.cloudinary import upload_avatar, delete_avatar

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

# update current logged in user profile
@users_bp.put("/me")
@jwt_required()
def update_current_user():
  user_id = get_jwt_identity()
  user = User.query.get_or_404(user_id)
  data = request.form
  avatar_file = request.files.get("avatar")
  old_avatar_url = None

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


  if user.role == "student":
    student_data = data.get("student")

    if not user.student:
      user.student = Student(
          enrollment_status="Enrolled"
      )

    student_number = data.get("student_number")

    if student_number is not None:
      student_number = student_number.strip()

      existing_student = Student.query.filter(
          Student.student_number == student_number,
          Student.user_id != user.id
      ).first()

      if existing_student:
          return jsonify({
              "message": "Student number already in use"
          }), 400
      
      user.student.student_number = student_number or None


    if "course" in data:
        user.student.course = data.get("course", "").strip() or None

    if "year_level" in data:
            user.student.year_level = data.get("year_level", "").strip() or None

  if avatar_file:
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if avatar_file.mimetype not in allowed_types:
        return jsonify({
            "message": "Only JPEG, PNG, and WebP images are allowed"
        }), 400

    old_avatar_url = user.avatar_url

    avatar_url = upload_avatar(avatar_file)

    if not avatar_url:
        return jsonify({
            "message": "Failed to upload avatar"
        }), 500

    user.avatar_url = avatar_url

  db.session.commit()

  if old_avatar_url and old_avatar_url != user.avatar_url:
    delete_avatar(old_avatar_url)

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

# admin or librarian for activating / deactivating an account
@users_bp.put("<uuid:id>/active")
@admin_required()
def set_user_active(id):
  data = request.get_json() or {}
  is_active = data.get("is_active")

  if not isinstance(is_active, bool):
    return jsonify({
      "message": "is_active must be a boolean"
    }), 400

  if str(get_jwt_identity()) == str(id):
    return jsonify({
      "message": "You cannot change your own account status"
    }), 403

  target_user = User.query.get_or_404(id)
  target_user.is_active = is_active

  db.session.commit()

  return jsonify(target_user.to_dict()), 200

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

  actor_role = get_jwt().get("role", "").lower()
  actor_id = str(get_jwt_identity())

  if actor_id == str(id):
    return jsonify({
      "message": "You cannot change your own role"
    }), 403

  target_user = User.query.get_or_404(id)

  if actor_role != "admin" and (new_role == "admin" or target_user.role == "admin"):
    return jsonify({
      "message": "Only admins can grant or change the admin role"
    }), 403

  target_user.role = new_role

  db.session.commit()

  return jsonify(target_user.to_dict()), 200