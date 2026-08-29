from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.middleware.auth import admin_required
from app.services.book_service import BookService


books_bp = Blueprint("book", __name__, url_prefix="/api/books")

# get related books
@books_bp.get("<uuid:id>/related")
@jwt_required()
def get_related_books(id):
  try:
    related = BookService.get_related_books(book_id=id, limit=5)
    return jsonify([ book.to_dict() for book in related ]), 200
  except ValueError as e:
    return jsonify({"message": f"Failed to fetch related books: {str(e)}"}), 500

# add review
@books_bp.post("/<uuid:id>/reviews")
@jwt_required()
def add_review(id):
  data = request.get_json() or {}

  user_id = get_jwt_identity()
  rating = data.get("rating", 5)
  comment = data.get("comment", "")

  try:
    review = BookService.add_review(
      book_id=id,
      user_id=user_id,
      rating=rating,
      comment=comment
    )

    return jsonify(review.to_dict()), 201
  except ValueError as e:
    return jsonify({"message": str(e)}), 400

# For restoring a book
@books_bp.put("/restore/<uuid:id>")
@admin_required()
def restore_book(id):
  book = BookService.restore_book(id)
  if not book:
      return jsonify({"message": "Book not found or not deleted"}), 404
  return jsonify({"message": "Book successfully restored", "book": book.to_dict()}), 200

  
# For deleting a book
@books_bp.delete("/<uuid:id>")
@admin_required()
def delete_book(id):
  success, message = BookService.delete_book(id)
  status_code = 200 if success else (400 if "borrowed" in message else 404)
  return jsonify({"message": message}), status_code


# For updating a book
@books_bp.put("/<uuid:id>")
@admin_required()
def update_book(id):

  try:
    book = BookService.update_book(id, request.form, request.files.get("image"))
    if not book:
        return jsonify({"message": "Book not found"}), 404
    return jsonify({"message": "Book updated successfully", "book": book.to_dict()}), 200
  except FileExistsError as e:
    # for image file
    return jsonify({"message": str(e)}), 409
  except ValueError as e:
    return jsonify({"message": str(e)}), 400


# For creating a book
@books_bp.post("")
@admin_required()
def create_book(): 
  try:
    book = BookService.create_book(request.form, request.files.get("image"))
    return jsonify({"message": "Book created successfully", "book": book.to_dict()}), 201
  except ValueError as e:
    return jsonify({"message": str(e)}), 400
  except FileExistsError as e:
    # this one is for the image file
    return jsonify({"message": str(e)}), 409
  except Exception as e:
    return jsonify({"message": f"Server error: {str(e)}"}), 500
  

# For getting a single book
@books_bp.get("/<uuid:id>")
@jwt_required()
def get_book(id):
  # Find the book and load its category
  book = BookService.get_book_by_id(id)
  if not book:
      return jsonify({"message": "Book not found"}), 404
  return jsonify(book.to_dict()), 200


@books_bp.get("")
def get_books():

  search_query = request.args.get("search", "").strip()
  page = request.args.get("page", 1, type=int)
  limit = request.args.get("limit", 10, type=int)

  paginated_books = BookService.get_paginated_books(
    search_query=search_query,
    page=page,
    limit=limit
  )

  return jsonify({
    "books": [book.to_dict() for book in paginated_books.items],
    "pagination": {
      "total_items": paginated_books.total,
      "total_pages": paginated_books.pages,
      "current_page": paginated_books.page,
      "per_page": paginated_books.per_page,
      "has_next": paginated_books.has_next,
      "has_prev": paginated_books.has_prev
    }
  }), 200
