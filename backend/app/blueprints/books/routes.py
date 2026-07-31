from flask import Blueprint, jsonify, request
from app.models.book import Book
from app.extensions import db
from flask_jwt_extended import jwt_required

books_bp = Blueprint("book", __name__, url_prefix="/api/books")

# For deleting a book
@books_bp.delete("/<int:id>")
@jwt_required()
def delete_book(id):

  book = db.session.get(Book, id)

  if not book:
    return jsonify({
      "message": "Book not found"
    }), 404

  db.session.delete(book)
  db.session.commit()

  return jsonify({
    "message": "Book deleted successfully"
  }), 200


# For updating a book
@books_bp.put("/<int:id>")
@jwt_required()
def update_book(id):

  book = db.session.get(Book, id)

  if not book:
    return jsonify({
      "message": "Book not found"
    }), 404

  data = request.get_json()

  book.isbn = data.get("isbn", book.isbn)
  book.title = data.get("title", book.title)
  book.author = data.get("author", book.author)
  book.category = data.get("category", book.category)
  book.quantity = data.get("quantity", book.quantity)

  db.session.commit()

  return jsonify({
    "message": "Book updated successfully"
  }), 220


# For creating a book
@books_bp.post("/")
@jwt_required()
def create_book():

  data = request.get_json()

  if data is None:
    return jsonify({
      "message": "Request body must be JSON"
    }), 400

  isbn = data.get("isbn")
  title = data.get("title")
  author = data.get("author")
  category = data.get("category")
  quantity = data.get("quantity")

  if not all([title, author]):
    return jsonify({
      "message": "Title and Author fields are required"
    }), 400

  existing_book = Book.query.filter_by(
    isbn=isbn
  ).first()

  if existing_book:
    return jsonify({
      "message": "Book ISBN already exist"
    }), 409

  book = Book(
    isbn=isbn,
    title=title,
    author=author,
    category=category,
    quantity=quantity,
    available=quantity
  )

  try:
    db.session.add(book)
    db.session.commit()
  except Exception:
    db.session.rollback()
    return jsonify({
      "message": "Something went wrong"
    }), 500

  return jsonify({
    "message": "Book created successfully"
  }), 201
  

# For getting a single book
@books_bp.get("/<int:id>")
@jwt_required()
def get_book(id):

  book = db.session.get(Book, id)

  if not book:
    return jsonify({
      "message": "Book not found"
    }), 404

  return jsonify(book.to_dict()), 200

@books_bp.get("/")
@jwt_required()
def get_books():

  books = Book.query.all()

  books_list = []

  for book in books:
    books_list.append(book.to_dict())

  return jsonify(books_list), 200

