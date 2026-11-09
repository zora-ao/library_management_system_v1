from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from uuid import UUID

from app.middleware.auth import admin_required
from app.services.book_service import BookService, DuplicateReviewError


books_bp = Blueprint("book", __name__, url_prefix="/api/books")


@books_bp.get("/favorites")
@jwt_required()
def get_user_favorites():
  user_id = get_jwt_identity()
  books = BookService.get_user_favorites(user_id)
  return jsonify([book.to_dict() for book in books]), 200


@books_bp.post("/<uuid:id>/favorite")
@jwt_required()
def add_favorite(id):
  user_id = get_jwt_identity()
  try:
    favorite = BookService.add_favorite(user_id=user_id, book_id=id)
    return jsonify({
      "message": "Book added to favorites",
      "favorite": favorite.to_dict(),
    }), 201
  except LookupError as e:
    return jsonify({"message": str(e)}), 404


@books_bp.delete("/<uuid:id>/favorite")
@jwt_required()
def remove_favorite(id):
  user_id = get_jwt_identity()
  BookService.remove_favorite(user_id=user_id, book_id=id)
  return jsonify({"message": "Book removed from favorites"}), 200


@books_bp.get("/admin/catalog")
@admin_required()
def get_staff_catalog():
  try:
    state = request.args.get("state", "active")
    books = BookService.get_staff_catalog(state)
    return jsonify([book.to_dict() for book in books]), 200
  except ValueError as e:
    return jsonify({"message": str(e)}), 400

# get related books by category or author books
@books_bp.get("/<uuid:id>/related")
@jwt_required()
def get_related_books(id):
  try:
    related = BookService.get_related_books(book_id=id, limit=5)
    return jsonify([ book.to_dict() for book in related ]), 200
  except ValueError as e:
    return jsonify({"message": str(e)}), 400
  except Exception:
    logging.exception("Failed to load related books for %s", id)
    return jsonify({"message": "Could not load related books"}), 500

# get all reviews
@books_bp.get("/<uuid:id>/reviews")
@jwt_required()
def get_book_reviews(id):

  try:
    reviews = BookService.get_book_reviews(id)

    return jsonify({
      "reviews": [review.to_dict() for review in reviews]
    }), 200
  
  except LookupError:
    return jsonify({
      "message": "Book not found"
    }), 404

  except Exception:
    logging.exception("Failed to get reviews for book %s", id)
    return jsonify({
      "message": "Failed to get book reviews"
    }), 500

# get book review stat
@books_bp.get("/<uuid:id>/reviews/stats")
@jwt_required()
def get_book_review_stats(id):
  try:
    stats = BookService.get_book_reviews_stats(id)

    return jsonify(stats), 200

  except Exception:
    logging.exception("Failed to get review stats for book %s", id)
    return jsonify({
      "message": "Failed to get the book review stats"
    }), 500

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
  except LookupError as e:
    return jsonify({"message": str(e)}), 404
  except DuplicateReviewError as e:
    return jsonify({"message": str(e)}), 409

# For restoring a book
@books_bp.put("/restore/<uuid:id>")
@admin_required()
def restore_book(id):
  try:
    book = BookService.restore_book(id)
    return jsonify({"message": "Book successfully restored", "book": book.to_dict()}), 200
  except LookupError as e:
    return jsonify({"message": str(e)}), 404

  
# For deleting a book
@books_bp.delete("/<uuid:id>")
@admin_required()
def delete_book(id):
  try:
    book = BookService.archive_book(id)
    return jsonify({"message": "Book archived successfully", "book": book.to_dict()}), 200
  except ValueError as e:
    return jsonify({"message": str(e)}), 400
  except LookupError as e:
    return jsonify({"message": str(e)}), 404


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
  except Exception:
    logging.exception("Failed to create book")
    return jsonify({"message": "Failed to create book"}), 500
  

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

  search_query = request.args.get("search", "").strip()[:200]
  category_id = request.args.get("category_id", "").strip() or None
  if category_id is not None:
    try:
      category_id = UUID(category_id)
    except ValueError:
      return jsonify({"message": "Invalid category ID"}), 400
  page = max(request.args.get("page", 1, type=int) or 1, 1)
  limit = request.args.get("limit", BookService.DEFAULT_PAGE_SIZE, type=int) or BookService.DEFAULT_PAGE_SIZE
  limit = min(max(limit, 1), BookService.MAX_PAGE_SIZE)

  paginated_books = BookService.get_paginated_books(
    search_query=search_query,
    category_id=category_id,
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
