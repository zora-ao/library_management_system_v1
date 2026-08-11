from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.models.book import Book
from app.models.borrow import Borrow
from app.extensions import db
from app.utils.cloudinary import upload_book_cover, delete_book_cover


books_bp = Blueprint("book", __name__, url_prefix="/api/books")

# For deleting a book
@books_bp.delete("/<int:id>")
@jwt_required()
def delete_book(id):

  book = db.session.get(Book, id)

  if not book or book.is_deleted:
    return jsonify({
      "message": "Book not found"
    }), 404

  active_book = Borrow.query.filter_by(
    book_id=id,
    status="borrowed"
  ).first()

  if active_book:
    return jsonify({
      "message": "Cannot delete book, currently borrowed"
    }), 400

  book.is_deleted = True

  if book.image_url:
    delete_book_cover(book.image_url)
    book.image_url = None

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

  book.isbn = request.form.get("isbn", book.isbn)
  book.title = request.form.get("title", book.title)
  book.author = request.form.get("author", book.author)
  book.category = request.form.get("category", book.category)
  book.total_copies = request.form.get("total_copies", book.total_copies, type=int)
  book.description = request.form.get("description", book.description)
  book.pages = request.form.get("pages", book.pages, type=int)

  if "image" in request.files and request.files["image"].filename != "":
    try:
      image_file = request.files["image"]
      book.image_url = upload_book_cover(image_file)
    except Exception as e:
      return jsonify({
        "message": f"Image upload failed: {str(e)}"
      }), 500
  
  db.session.commit()

  return jsonify({
    "message": "Book updated successfully",
    "book": book.to_dict()
  }), 200


# For creating a book
@books_bp.post("")
@jwt_required()
def create_book():

  isbn = request.form.get("isbn")
  title = request.form.get("title")
  author = request.form.get("author")
  category = request.form.get("category")
  total_copies = request.form.get("total_copies", default=1, type=int)
  description = request.form.get("description")
  pages = request.form.get("pages", type=int)

  if not all([title, author]):
    return jsonify({
      "message": "Title and Author fields are required"
    }), 400

  if isbn:
    existing_book = Book.query.filter_by(
      isbn=isbn
    ).first()

    if existing_book:
      return jsonify({
        "message": "Book ISBN already exist"
      }), 409

  image_url = None
  if "image" in request.files and request.files["image"].filename != "":
    try:
      image_file = request.files["image"]
      image_url = upload_book_cover(image_file)
    except Exception as e:
      return jsonify({
          "message": f"Image upload failed: {str(e)}"
        }), 500


  book = Book(
    isbn=isbn,
    title=title,
    author=author,
    category=category,
    total_copies=total_copies,
    available_copies=total_copies,
    description=description,
    pages=pages,
    image_url=image_url
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
    "message": "Book created successfully",
    "book": book.to_dict()
  }), 201
  

# For getting a single book
@books_bp.get("/<int:id>")
@jwt_required()
def get_book(id):

  book = db.session.get(Book, id)

  if not book or book.is_deleted:
    return jsonify({
      "message": "Book not found"
    }), 404

  return jsonify(book.to_dict()), 200

@books_bp.get("")
@jwt_required()
def get_books():

  books = Book.query.filter_by(is_deleted=False).all()

  books_list = []

  for book in books:
    books_list.append(book.to_dict())

  return jsonify(books_list), 200

