from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.orm import joinedload

from app.models import Book, Borrow, Category
from app.extensions import db
from app.utils.cloudinary import upload_book_cover, delete_book_cover

from app.middleware.auth import admin_required


books_bp = Blueprint("book", __name__, url_prefix="/api/books")

# For getting or setting the category
def get_or_create_category(category_input):

  if not category_input or not category_input.strip():
    return None 

  clean_name = category_input.strip()

  existing_category = Category.query.filter(
    db.func.lower(Category._name) == clean_name.lower()
  ).first()

  if existing_category:
    return existing_category.category_id

  new_category = Category(name=clean_name)
  db.session.add(new_category)
  db.session.flush()

  return new_category.category_id

# For restoring a book
@books_bp.put("/<uuid:id>")
@admin_required()
def restore_book(id):
  book = db.session.get(Book, id)

  if not book or not book.is_deleted:
    return jsonify({
      "message": "Book not found or not deleted"
    }), 404

  book.is_deleted = False

  try:
    db.session.commit()
  except Exception:
    db.session.rollback()
    return jsonify({
      "message": "Failed to restore a book"
    }), 500

  return jsonify({
    "message": "Book successfully restored",
    "book": book.to_dict()
  }), 200

# For deleting a book
@books_bp.delete("/<uuid:id>")
@admin_required()
def delete_book(id):

  book = db.session.get(Book, id)

  if not book or book.is_deleted:
    return jsonify({
      "message": "Book not found"
    }), 404

  active_book = Borrow.query.filter_by(
    id=id,
    status="borrowed"
  ).first()

  if active_book:
    return jsonify({
      "message": "Cannot delete book, currently borrowed"
    }), 400

  book.is_deleted = True

  try:
      db.session.commit()
  except Exception:
      db.session.rollback()
      return jsonify({
          "message": "Failed to delete book"
      }), 500

  return jsonify({
      "message": "Book deleted successfully"
  }), 200


# For updating a book
@books_bp.put("/<uuid:id>")
@admin_required()
def update_book(id):

  book = db.session.get(Book, id)

  if not book or book.is_deleted:
      return jsonify({
        "message": "Book not found"
      }), 404

  new_isbn = request.form.get("isbn")
    # Check ISBN uniqueness if changed
  if new_isbn and new_isbn != book.isbn:
      existing_isbn = Book.query.filter(Book.isbn == new_isbn, Book.id != id).first()
      if existing_isbn:
          return jsonify({
              "message": "Book ISBN already exists"
          }), 409
      book.isbn = new_isbn

  book.title = request.form.get("title", book.title)
  book.author = request.form.get("author", book.author)
  book.description = request.form.get("description", book.description)
  book.pages = request.form.get("pages", book.pages, type=int)

  new_total = request.form.get("total_copies", type=int)
  if new_total is not None and new_total != book.total_copies:
    try:
      book.adjust_total_copies(new_total)
    except Exception as e:
      return jsonify({"message": str(e)}), 400


  category_input = request.form.get("category_name")
  if category_input:
    book.category_id = get_or_create_category(category_input)

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
@admin_required()
def create_book():

  isbn = request.form.get("isbn")
  title = request.form.get("title")
  author = request.form.get("author")
  total_copies = request.form.get("total_copies", default=1, type=int)
  description = request.form.get("description")
  pages = request.form.get("pages", type=int)

  if not all([title, author]):
    return jsonify({
      "message": "Title and Author fields are required"
    }), 400

  category_input = request.form.get("category_name")
  category_id = get_or_create_category(category_input)

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
    category_id=category_id,
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
@books_bp.get("/<uuid:id>")
@jwt_required()
def get_book(id):
  # Find the book and load its category
  book = Book.query.options(joinedload(Book.category)).filter_by(id=id, is_deleted=False).first()

  if not book or book.is_deleted:
    return jsonify({
      "message": "Book not found"
    }), 404

  return jsonify(book.to_dict()), 200

@books_bp.get("")
@jwt_required()
def get_books():

  search_query = request.args.get("search", "").strip()
  page = request.args.get("page", 1, type=int)
  limit = request.args.get("limit", 10, type=int)

  query = Book.query.options(joinedload(Book.category)).filter(Book.is_deleted == False)

  if search_query:
    query = query.filter(
      Book.title.ilike(f"%{search_query}%") |
      Book.author.ilike(f"%{search_query}%")
    )

  paginated_books = query.paginate(page=page, per_page=limit, error_out=False)


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
