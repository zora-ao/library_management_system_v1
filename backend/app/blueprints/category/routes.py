from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Category
from app.extensions import db

category_bp = Blueprint("categories", __name__, url_prefix="/api/categories")

@category_bp.get("")
@jwt_required()
def get_category():
  categories = Category.query.order_by(Category.name.asc()).all()
  return jsonify([cat.to_dict() for cat in categories]), 200

@category_bp.post("")
@jwt_required()
def create_category():

  data = request.get_json() or {}

  if data is None:
    return jsonify({
      "message": "Request body must be JSON"
    }), 400

  category_name = data.get("category_name", "").strip()

  existing = Category.query.filter(
    db.func.lower(Category.name) == category_name.lower()
  ).first()

  if existing:
    return jsonify(existing.to_dict()), 200

  new_category = Category(name=category_name)
  db.session.add(new_category)
  db.session.commit()

  return jsonify(new_category.to_dict()), 201
  