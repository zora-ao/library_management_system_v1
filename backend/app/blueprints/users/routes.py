from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.middleware.auth import admin_required
from app.models import User
from app.extensions import db

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

@users_bp.get("")
@admin_required()
def get_users():

  users = User.query.order_by(User.created_at.desc()).all()

  return jsonify([user.to_dict() for user in users]), 200

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