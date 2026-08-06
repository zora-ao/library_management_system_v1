from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.borrow import Borrow
from app.models.book import Book

borrows_bp = Blueprint("borrow", __name__, url_prefix="/api/borrow")

# Getting the borrowed books
@borrows_bp.get("/me")
@jwt_required()
def get_borrowed_books():

  user_id = int(get_jwt_identity())

  active_borrows = Borrow.query.filter_by(
    user_id=user_id,
    returned_at=None
  ).all()

  if not active_borrows:
    return jsonify({
      "message": "You don't have an active borrowed books",
      "borrowed_book": []
    }), 200

  result = []

  for borrow in active_borrows:
    book = db.session.get(Book, borrow.book_id)
    if book:
      result.append(book.to_dict())


  return jsonify({
    "count": len(result),
    "borrowed_books": result
  }), 200


# Returning book
@borrows_bp.post("/<int:id>/return")
@jwt_required()
def return_book(id):

  user_id = int(get_jwt_identity())
  borrow = db.session.get(Borrow, id)

  if borrow is None:
    return jsonify({
      "message": "Borrow record not found"
    }), 404

  if borrow.user_id != user_id:
    return jsonify({
      "message": "Unauthorized"
    }), 403

  if borrow.returned_at is not None:
    return jsonify({
      "message": "Book has been already returned"
    }), 400

  book = db.session.get(Book, borrow.book_id)

  if book is None:
    return jsonify({
      "message": "Book not found"
    }), 404

  borrow.returned_at = datetime.now(timezone.utc)
  borrow.status = "returned"
  book.available += 1

  try:
    db.session.commit()
  except Exception:
    db.session.rollback()
    return jsonify({
      "message": "Something went wrong"
    }),500

  return jsonify({
    "message": "Book returned successfully",
    "borrow": borrow.to_dict()
  }), 200



# For borrowing book
@borrows_bp.post("/")
@jwt_required()
def borrow_book():
  BORROW_DURATION_DAYS = 14

  user_id = int(get_jwt_identity())
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

  book = db.session.get(Book, book_id)

  if not book:
    return jsonify({
      "message": "Book not found"
    }), 404

  if book.available <= 0:
    return jsonify({
      "message": "Book is currently out of stock"
    }), 400

  active_borrow = Borrow.query.filter_by(
    user_id=user_id,
    book_id=book_id,
    returned_at=None
  ).first()

  if active_borrow:
    return jsonify({
      "message": "You already borrowed this book"
    }), 400

  due_date = datetime.now(timezone.utc) + timedelta(days=BORROW_DURATION_DAYS)

  try:
    borrow = Borrow(
      user_id=user_id,
      book_id=book_id,
      due_date=due_date
    )

    book.available -= 1

    db.session.add(borrow)
    db.session.commit()

    return jsonify({
      "message": "Book borrowed successfully",
      "borrow": borrow.to_dict()
    }), 201

  except Exception:
    db.session.rollback()
    return jsonify({
      "message": "Something went wrong"
    }), 500