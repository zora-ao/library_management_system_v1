from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.borrow import Borrow
from app.models.book import Book

borrows_bp = Blueprint("borrow", __name__, url_prefix="/api/borrow")

BORROW_DURATION_DAYS = 14

@borrows_bp.post("/")
@jwt_required()
def borrow_book():

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

    db.session.add(book)
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