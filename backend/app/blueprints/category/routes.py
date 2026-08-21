from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models import Category, Book
from app.extensions import db

from app.middleware.auth import admin_required

category_bp = Blueprint("categories", __name__, url_prefix="/api/categories")

# deleting category
@category_bp.delete("/<uuid:id>")
@admin_required()
def delete_category(id):

  category = db.session.get(Category, id)

  if not category:
    return jsonify({
      "message": "Category not found"
    }), 404

  linked_books = Book.query.filter_by(category_id=id, is_deleted=False).first()
  if linked_books:
    return jsonify({
      "message": "Cannot delete category while books are assigned to it. Reassign or delete the books first."
    }), 400

  try:
    db.session.delete(category)
    db.session.commit()
  except Exception:
    db.session.rollback()
    return jsonify({
      "message": "Failed to delete the category"
    }), 500

  return jsonify({
    "message": "Category deleted successfully"
  }), 200

# updating category
@category_bp.put("/<uuid:id>")
@admin_required()
def update_category(id):

  category = db.session.get(Category, id)

  if not category:
    return jsonify({
      "message": "Category not found"
    }), 404

  data = request.get_json() or {}
  raw_name = data.get("name").strip()

  try:
    # setter
    category.name = raw_name

    db.session.commit()
    return jsonify({
      "message": "Category updated successfully"
    }), 200

  except ValueError as e:
    db.session.rollback()
    return jsonify({
      "message": str(e)
    }), 400

  except Exception:
    db.session.rollback()
    return jsonify({"message": "Failed to update category"}), 500
  

@category_bp.get("")
@jwt_required()
def get_category():
  categories = Category.query.order_by(Category._name.asc()).all()
  return jsonify([cat.to_dict() for cat in categories]), 200

@category_bp.post("")
@jwt_required()
def create_category():

  data = request.get_json() or {}

  if data is None:
    return jsonify({
      "message": "Request body must be JSON"
    }), 400

  raw_name = data.get("name").strip()

  try:
    category = Category(name=raw_name)

    existing = Category.query.filter(
      db.func.lower(Category._name) == category.name.lower()
    ).first()

    if existing:
      return jsonify(existing.to_dict()), 200

    db.session.add(category)
    db.session.commit()

    return jsonify({
      "message": "Category created successfully",
      "category": category.to_dict()
    }), 201

  except ValueError as e:
    db.session.rollback()
    return jsonify({"message": str(e)}), 400
  except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to create category"}), 500
