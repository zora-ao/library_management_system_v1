from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Category, Book
from app.extensions import db
from app.services.category_service import CategoryService

from app.middleware.auth import admin_required

category_bp = Blueprint("categories", __name__, url_prefix="/api/categories")

# deleting category 
@category_bp.delete("/<uuid:id>")
@admin_required()
def delete_category(id):

  try:
    res = CategoryService.delete_category(id)
    return jsonify(res), 200
  except ValueError as e:
    status_code = 404 if "not found" in str(e).lower() else 400
    return jsonify({ "message": str(e) }), status_code
  except Exception:
    return jsonify({ "message": "Failed to delete category" }), 500

# updating category
@category_bp.put("/<uuid:id>")
@admin_required()
def update_category(id):

  data = request.get_json() or {}
  raw_name = data.get("name")

  try:
    res = CategoryService.update_category(id, raw_name)
    return jsonify(res), 200
  except ValueError as e:
    return jsonify({ "message": str(e) }), 400
  except Exception:
    return jsonify({ "message": "Failed to updated category" }), 500

@category_bp.get("")
@jwt_required()
def get_category():
  categories = CategoryService.get_all_categories()

  return jsonify([cat.to_dict() for cat in categories]), 200

@category_bp.post("")
@jwt_required()
def create_category():

  data = request.get_json() or {}
  raw_name = data.get("name")

  try:
    res_data = CategoryService.create_category(raw_name)
    return jsonify(res_data), 201
  except ValueError as e:
    return jsonify({ "message": str(e) }), 400
  except Exception:
    return jsonify({ "message": "Failed to create category" }), 500
  
  