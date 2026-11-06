from datetime import datetime, timezone
from uuid import UUID

from app.models import Book, Review, Category, Borrow, Favorite
from app.utils.cloudinary import upload_book_cover
from app.extensions import db
from sqlalchemy.orm import joinedload

class BookService:
    # for encapsulating book related

    @staticmethod
    def _parse_book_integer(raw_value, label, *, minimum):
        if isinstance(raw_value, bool) or not isinstance(raw_value, (str, int)):
            raise ValueError(f"{label} must be a whole number")

        if isinstance(raw_value, str):
            normalized_value = raw_value.strip()
            if not normalized_value:
                raise ValueError(f"{label} must be a whole number")
            try:
                value = int(normalized_value)
            except ValueError as error:
                raise ValueError(f"{label} must be a whole number") from error
        else:
            value = raw_value

        if value < minimum:
            if label == "Total copies":
                raise ValueError("Total copies must be 1 or greater")
            raise ValueError("Pages must be greater than 0")

        return value

    @staticmethod
    def _parse_uuid(val, param_name="ID"):
        if isinstance(val, str):
            try:
                return UUID(val)
            except ValueError:
                raise ValueError(f"Invalid {param_name} format")
        return val

    @staticmethod
    def get_user_favorites(user_id):
        user_id = BookService._parse_uuid(user_id, "User ID")
        favorites = (
            Favorite.query.join(Book, Favorite.book_id == Book.id)
            .options(
                joinedload(Favorite.book).joinedload(Book.category),
                joinedload(Favorite.book).joinedload(Book.reviews),
            )
            .filter(Favorite.user_id == user_id, Book.is_deleted == False)
            .order_by(Favorite.created_at.desc(), Favorite.id.desc())
            .all()
        )
        return [fav.book for fav in favorites if fav.book]

    @staticmethod
    def add_favorite(user_id, book_id):
        user_id = BookService._parse_uuid(user_id, "User ID")
        book_id = BookService._parse_uuid(book_id, "Book ID")

        book = db.session.get(Book, book_id)
        if not book or book.is_deleted:
            raise LookupError("Book not found")

        existing = Favorite.query.filter_by(user_id=user_id, book_id=book_id).first()
        if existing:
            return existing

        favorite = Favorite(user_id=user_id, book_id=book_id)
        db.session.add(favorite)
        db.session.commit()
        return favorite

    @staticmethod
    def remove_favorite(user_id, book_id):
        user_id = BookService._parse_uuid(user_id, "User ID")
        book_id = BookService._parse_uuid(book_id, "Book ID")

        favorite = Favorite.query.filter_by(user_id=user_id, book_id=book_id).first()
        if not favorite:
            return False

        db.session.delete(favorite)
        db.session.commit()
        return True

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
    def get_paginated_books(search_query="", category_id=None,  page=1, limit=10):
        # Added joinedload(Book.reviews) to load reviews for rating calculation
        query = Book.query.options(
            joinedload(Book.category), 
            joinedload(Book.reviews)
        ).filter(Book.is_deleted == False)

        # Filter by category if passed
        if category_id:
            query = query.filter(Book.category_id == category_id)

        if search_query:
            query = query.filter(
                Book.title.ilike(f"%{search_query}%") |
                Book.author.ilike(f"%{search_query}%")
            )
        return query.paginate(page=page, per_page=limit, error_out=False)

    @staticmethod
    def get_staff_catalog(state="active"):
        if state not in {"active", "archived"}:
            raise ValueError("Invalid catalog state")

        query = Book.query.options(
            joinedload(Book.category),
            joinedload(Book.reviews),
        )
        if state == "active":
            return query.filter(Book.is_deleted == False).order_by(
                Book.created_at.desc(), Book.id.desc()
            ).all()

        return query.filter(Book.is_deleted == True).order_by(
            Book.archived_at.desc(), Book.id.desc()
        ).all()

    @staticmethod
    def create_book(form_data, image_file=None):
        title = form_data.get("title")
        author = form_data.get("author")
        isbn = form_data.get("isbn")

        if not title or not author:
            raise ValueError("Title and Author fields are required")

        if isbn and Book.query.filter_by(isbn=isbn).first():
            raise FileExistsError("Book ISBN already exists")

        total_copies = 1
        if "total_copies" in form_data:
            total_copies = BookService._parse_book_integer(
                form_data.get("total_copies"), "Total copies", minimum=1
            )

        raw_pages = form_data.get("pages")
        pages = None
        if raw_pages is not None and not (
            isinstance(raw_pages, str) and not raw_pages.strip()
        ):
            pages = BookService._parse_book_integer(
                raw_pages, "Pages", minimum=1
            )

        category_id = BookService.get_or_create_category(form_data.get("category_name"))
        image_url = upload_book_cover(image_file) if image_file and image_file.filename != "" else None

        book = Book(
            isbn=isbn,
            title=title,
            author=author,
            category_id=category_id,
            total_copies=total_copies,
            available_copies=total_copies,
            description=form_data.get("description"),
            pages=pages,
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

        new_total = None
        if "total_copies" in form_data:
            new_total = BookService._parse_book_integer(
                form_data.get("total_copies"), "Total copies", minimum=1
            )

        pages_supplied = "pages" in form_data
        new_pages = book.pages
        if pages_supplied:
            raw_pages = form_data.get("pages")
            if raw_pages is None or (
                isinstance(raw_pages, str) and not raw_pages.strip()
            ):
                new_pages = None
            else:
                new_pages = BookService._parse_book_integer(
                    raw_pages, "Pages", minimum=1
                )

        if new_total is not None and new_total != book.total_copies:
            book.adjust_total_copies(new_total)

        if new_isbn and new_isbn != book.isbn:
            book.isbn = new_isbn

        book.title = form_data.get("title", book.title)
        book.author = form_data.get("author", book.author)
        book.description = form_data.get("description", book.description)
        if pages_supplied:
            book.pages = new_pages

        category_input = form_data.get("category_name")
        if category_input:
            book.category_id = BookService.get_or_create_category(category_input)

        if image_file and image_file.filename != "":
            book.image_url = upload_book_cover(image_file)

        db.session.commit()
        return book

    @staticmethod
    def archive_book(book_id):
        try:
            book = Book.query.filter_by(id=book_id, is_deleted=False).with_for_update().first()
            if not book:
                raise LookupError("Book not found")

            blocking_statuses = [
                Borrow.STATUS_PENDING_BORROW,
                Borrow.STATUS_READY_FOR_PICKUP,
                Borrow.STATUS_BORROWED,
                Borrow.STATUS_OVERDUE,
                Borrow.STATUS_PENDING_RETURN,
            ]
            active_borrow = Borrow.query.filter_by(book_id=book_id).filter(
                Borrow.status.in_(blocking_statuses)
            ).first()
            if active_borrow:
                raise ValueError("Cannot archive book with active circulation")

            book.is_deleted = True
            book.archived_at = datetime.now(timezone.utc)
            db.session.commit()
            db.session.refresh(book)
            return book
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def delete_book(book_id):
        """Compatibility wrapper for callers using the previous service name."""
        try:
            BookService.archive_book(book_id)
            return True, "Book archived successfully"
        except LookupError as error:
            return False, str(error)
        except ValueError as error:
            return False, str(error)

    @staticmethod
    def restore_book(book_id):
        try:
            book = Book.query.filter_by(id=book_id, is_deleted=True).with_for_update().first()
            if not book:
                raise LookupError("Book not found")

            book.is_deleted = False
            book.archived_at = None
            db.session.commit()
            db.session.refresh(book)
            return book
        except Exception:
            db.session.rollback()
            raise

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
