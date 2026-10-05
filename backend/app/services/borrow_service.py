from datetime import datetime, timezone, timedelta
from uuid import UUID

from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import Borrow, Book


class BorrowService:
    BORROW_DURATION = 14

    @staticmethod
    def _parse_uuid(val, param_name="ID"):
        if isinstance(val, str):
            try:
                return UUID(val)
            except ValueError:
                raise ValueError(f"Invalid {param_name} format")
        return val

    @staticmethod
    def get_all_borrows_admin():
        return Borrow.query.options(
            joinedload(Borrow.book)
        ).order_by(Borrow.created_at.desc()).all()

    @staticmethod
    def get_borrowed_history(user_id):
        user_id = BorrowService._parse_uuid(user_id, "User ID")
        return (
            Borrow.query.filter_by(user_id=user_id)
            .filter(Borrow.status.in_([Borrow.STATUS_RETURNED, Borrow.STATUS_REJECTED]))
            .order_by(Borrow.returned_at.desc())
            .all()
        )

    @staticmethod
    def get_user_active_borrows(user_id):
        user_id = BorrowService._parse_uuid(user_id, "User ID")
        return (
            Borrow.query.options(joinedload(Borrow.book))
            .filter_by(user_id=user_id)
            .filter(Borrow.status.in_([Borrow.STATUS_PENDING_BORROW, Borrow.STATUS_BORROWED, Borrow.STATUS_PENDING_RETURN]))
            .all()
        )

    @staticmethod
    def request_borrow(user_id, book_id):
        user_id = BorrowService._parse_uuid(user_id, "User ID")
        book_id = BorrowService._parse_uuid(book_id, "Book ID")

        book = db.session.get(Book, book_id)
        if not book:
            raise ValueError("Book not found")

        if book.available_copies <= 0:
            raise ValueError("Book currently out of stock")

        # Prevent duplicate active requests or holds on the same book
        existing_active = Borrow.query.filter_by(user_id=user_id, book_id=book_id)\
            .filter(Borrow.status.in_([Borrow.STATUS_PENDING_BORROW, Borrow.STATUS_BORROWED, Borrow.STATUS_PENDING_RETURN]))\
            .first()

        if existing_active:
            raise ValueError("You already have an active request or borrow for this book")

        try:
            borrow = Borrow(
                user_id=user_id,
                book_id=book_id,
                status=Borrow.STATUS_PENDING_BORROW
            )
            db.session.add(borrow)
            db.session.commit()
            db.session.refresh(borrow)
            return borrow
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def request_return(borrow_id, user_id):
        borrow_id = BorrowService._parse_uuid(borrow_id, "Borrow ID")
        user_id = BorrowService._parse_uuid(user_id, "User ID")

        borrow = db.session.get(Borrow, borrow_id)
        if not borrow:
            raise ValueError("Borrow record not found")

        if str(borrow.user_id) != str(user_id):
            raise PermissionError("Unauthorized")

        if borrow.status != Borrow.STATUS_BORROWED:
            raise ValueError("Only active borrowed books can be marked for return")

        try:
            borrow.status = Borrow.STATUS_PENDING_RETURN
            db.session.commit()
            db.session.refresh(borrow)
            return borrow
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def approve_borrow_request(borrow_id):
        """Librarian approves the borrow request when physical pickup occurs."""
        borrow_id = BorrowService._parse_uuid(borrow_id, "Borrow ID")
        borrow = db.session.get(Borrow, borrow_id)

        if not borrow:
            raise ValueError("Borrow record not found")

        if borrow.status != Borrow.STATUS_PENDING_BORROW:
            raise ValueError("Only pending requests can be approved for borrow")

        book = db.session.get(Book, borrow.book_id)
        if not book or book.available_copies <= 0:
            raise ValueError("Book is out of stock and cannot be borrowed")

        try:
            book.decrement_available()
            borrow.status = Borrow.STATUS_BORROWED
            borrow.borrowed_at = datetime.now(timezone.utc)
            borrow.due_date = datetime.now(timezone.utc) + timedelta(days=BorrowService.BORROW_DURATION)

            db.session.commit()
            return borrow
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def reject_borrow_request(borrow_id):
        """Librarian rejects a pending borrow request."""
        borrow_id = BorrowService._parse_uuid(borrow_id, "Borrow ID")
        borrow = db.session.get(Borrow, borrow_id)

        if not borrow:
            raise ValueError("Borrow record not found")

        if borrow.status != Borrow.STATUS_PENDING_BORROW:
            raise ValueError("Only pending requests can be rejected")

        try:
            borrow.status = Borrow.STATUS_REJECTED
            db.session.commit()
            return borrow
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def approve_return_request(borrow_id):
        """Librarian confirms physical receipt of returned book."""
        borrow_id = BorrowService._parse_uuid(borrow_id, "Borrow ID")
        borrow = db.session.get(Borrow, borrow_id)

        if not borrow:
            raise ValueError("Borrow record not found")

        if borrow.status != Borrow.STATUS_PENDING_RETURN:
            raise ValueError("Borrow record is not pending return confirmation")

        book = db.session.get(Book, borrow.book_id)

        try:
            borrow.status = Borrow.STATUS_RETURNED
            borrow.returned_at = datetime.now(timezone.utc)

            if book:
                book.increment_available()

            db.session.commit()
            return borrow
        except Exception:
            db.session.rollback()
            raise
