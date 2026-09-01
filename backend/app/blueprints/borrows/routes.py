from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import Borrow, Book
from app.middleware.auth import admin_required
from app.services.borrow_service import BorrowService

borrows_bp = Blueprint("borrow", __name__, url_prefix="/api/borrows")

# for librarian/admin 
@borrows_bp.get("/admin/all")
@admin_required()
def get_all_borrows_admin():
  borrows = BorrowService.get_all_borrows_admin()
  return jsonify([borrow.to_dict() for borrow in borrows]), 200

# getting borrowed history
@borrows_bp.get("/history")
@jwt_required()
def get_borrowed_history():
  user_id = get_jwt_identity()

  history = BorrowService.get_borrowed_history(user_id)

  return jsonify([borrow.to_dict() for borrow in history]), 200

# Getting the borrowed books
@borrows_bp.get("/me")
@jwt_required()
def get_borrowed_books():

  user_id = get_jwt_identity()

  # Get the user's active borrowed books 
  active_borrows = BorrowService.get_user_active_borrows(user_id)

  if not active_borrows:
    return jsonify({
      "message": "You don't have an active borrowed books",
      "borrowed_book": []
    }), 200
  
  result = [borrow.to_dict() for borrow in active_borrows]

  return jsonify({
    "count": len(result),
    "borrowed_books": result
  }), 200

# For borrowing book
@borrows_bp.post("")
@jwt_required()
def borrow_book():
  BORROW_DURATION_DAYS = 14

  user_id = get_jwt_identity()
  data = request.get_json()

  if data is None:
    return jsonify({
      "message": "Request body must be JSON"
    }), 400

  book_id = data.get("book_id")

  if not book_id:
    return jsonify({
      "message": "Book id is required"
    }), 400

  try:
    borrow = BorrowService.borrow_book(user_id, book_id)
    return jsonify({
      "message": "Book borrowed successfully",
      "borrow": borrow.to_dict()
    }), 201

  except ValueError as e:
    return jsonify({ "message": str(e) }), 400
  except Exception:
    return jsonify({"message": "Something went wrong"}), 500

# Returning book
@borrows_bp.put("/<uuid:id>/return")
@jwt_required()
def return_book(id):

  user_id = get_jwt_identity()

  try:
    borrow = BorrowService.return_book(id, user_id)

    return jsonify({
      "message": "Book returned successfully"
    }), 200
  except PermissionError as e:
    return jsonify({ "message": str(e) }), 403
  except ValueError as e:
    # check then match if not found or already returned
    status_code = 404 if "not found" in str(e) else 400
    return jsonify({ "message": str(e) }), status_code
  except Exception as e:
    return jsonify({ "message": "Something went wrong" }), 500