from app.models import Book, Review, Category, Borrow
from app.utils.cloudinary import upload_book_cover
from app.extensions import db
from sqlalchemy.orm import joinedload

class BookService:
    # for encapsulating book related

    @staticmethod
    def get_book_reviews(book_id):

        book = db.session.get(Book, book_id)
        if not book or book.is_deleted:
            raise LookupError("Book not found")

        reviews = Review.query.filter(
            Review.book_id == book_id
        ).order_by(Review.created_at.desc()).all()

        return reviews

    @staticmethod
    def get_book_reviews_stats(book_id):
        reviews = Review.query.filter(Review.book_id == book_id).all()
        total_reviews = len(reviews)

        if total_reviews == 0:
            return {
                "average_rating": 0.0,
                "total_reviews": 0
            }

        avr_rating = sum(review.rating for review in reviews) / total_reviews

        return {
            "average_rating": round(avr_rating, 1),
            "total_reviews": total_reviews
        }

    @staticmethod
    def get_or_create_category(category_input: str):
        if not category_input or not category_input.strip():
            return None 

        clean_name = category_input.strip()
        existing_category = Category.query.filter(
            db.func.lower(Category._name) == clean_name.lower()
        ).first()

        if existing_category:
            return existing_category.id

        new_category = Category(name=clean_name)
        db.session.add(new_category)
        db.session.flush()
        return new_category.id

    @staticmethod
    def get_book_by_id(book_id, include_deleted=False):
        query = Book.query.options(joinedload(Book.category), joinedload(Book.reviews)) 
        if not include_deleted:
            query = query.filter(Book.is_deleted == False)
        return query.filter(Book.id == book_id).first()

    @staticmethod
    def get_paginated_books(search_query="", page=1, limit=10):
        query = Book.query.options(joinedload(Book.category)).filter(Book.is_deleted == False)
        if search_query:
            query = query.filter(
                Book.title.ilike(f"%{search_query}%") |
                Book.author.ilike(f"%{search_query}%")
            )
        return query.paginate(page=page, per_page=limit, error_out=False)

    @staticmethod
    def create_book(form_data, image_file=None):
        title = form_data.get("title")
        author = form_data.get("author")
        isbn = form_data.get("isbn")

        if not title or not author:
            raise ValueError("Title and Author fields are required")

        if isbn and Book.query.filter_by(isbn=isbn).first():
            raise FileExistsError("Book ISBN already exists")

        category_id = BookService.get_or_create_category(form_data.get("category_name"))
        image_url = upload_book_cover(image_file) if image_file and image_file.filename != "" else None

        book = Book(
            isbn=isbn,
            title=title,
            author=author,
            category_id=category_id,
            total_copies=form_data.get("total_copies", default=1, type=int),
            available_copies=form_data.get("total_copies", default=1, type=int),
            description=form_data.get("description"),
            pages=form_data.get("pages", type=int),
            image_url=image_url
        )
        db.session.add(book)
        db.session.commit()
        return book

    @staticmethod
    def update_book(book_id, form_data, image_file=None):
        book = Book.query.filter_by(id=book_id, is_deleted=False).first()
        if not book:
            return None

        new_isbn = form_data.get("isbn")
        if new_isbn and new_isbn != book.isbn:
            if Book.query.filter(Book.isbn == new_isbn, Book.id != book_id).first():
                raise FileExistsError("Book ISBN already exists")
            book.isbn = new_isbn

        book.title = form_data.get("title", book.title)
        book.author = form_data.get("author", book.author)
        book.description = form_data.get("description", book.description)
        book.pages = form_data.get("pages", book.pages, type=int)

        new_total = form_data.get("total_copies", type=int)
        if new_total is not None and new_total != book.total_copies:
            book.adjust_total_copies(new_total)

        category_input = form_data.get("category_name")
        if category_input:
            book.category_id = BookService.get_or_create_category(category_input)

        if image_file and image_file.filename != "":
            book.image_url = upload_book_cover(image_file)

        db.session.commit()
        return book

    @staticmethod
    def delete_book(book_id):
        book = db.session.get(Book, book_id)
        if not book or book.is_deleted:
            return False, "Book not found"

        if Borrow.query.filter_by(book_id=book_id, status="borrowed").first():
            return False, "Cannot delete book, currently borrowed"

        book.is_deleted = True
        db.session.commit()
        return True, "Book deleted successfully"

    @staticmethod
    def restore_book(book_id):
        book = db.session.get(Book, book_id)
        if not book or not book.is_deleted:
            return None

        book.is_deleted = False
        db.session.commit()
        return book

    @staticmethod
    def get_related_books(book_id, limit = 5):
        book = Book.query.get_or_404(book_id)
        related = Book.query.filter(
        (Book.category_id == book.category_id) | (Book.author == book.author),
        Book.id != book.id,
        Book.is_deleted == False
        ).limit(limit).all()

        return related

    @staticmethod
    def add_review(book_id, user_id, rating, comment):
        if not (1 <= rating <= 5):
            raise ValueError("Rating must be between 1 and 5")

        review = Review(
        book_id = book_id,
        user_id = user_id,
        rating = rating,
        comment = comment
        )

        db.session.add(review)
        db.session.commit()

        return review