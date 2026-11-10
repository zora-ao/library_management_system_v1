from sqlalchemy.orm import joinedload

from app.exceptions import ValidationError
from app.extensions import db
from app.models import Borrow, Book
from app.services.base_service import BaseService


class BorrowService(BaseService):
    BORROW_DURATION = 14

    ACTIVE_STATUSES = (
        Borrow.STATUS_PENDING_BORROW,
        Borrow.STATUS_READY_FOR_PICKUP,
        Borrow.STATUS_BORROWED,
        Borrow.STATUS_PENDING_RETURN,
    )

    @staticmethod
    def get_all_borrows_admin():
        return Borrow.query.options(
            joinedload(Borrow.book),
            joinedload(Borrow.user),
        ).order_by(Borrow.created_at.desc()).all()

    @staticmethod
    def get_borrowed_history(user_id):
        user_id = BorrowService._parse_uuid(user_id, "User ID")
        return (
            Borrow.query.options(
                joinedload(Borrow.book),
                joinedload(Borrow.user),
            )
            .filter_by(user_id=user_id)
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
            .filter(Borrow.status.in_(BorrowService.ACTIVE_STATUSES))
            .all()
        )

    @staticmethod
    def _apply(borrow, change=None):
        """Run ``change`` and save the borrow, or undo everything on failure."""
        try:
            if change is not None:
                change()
            db.session.commit()
            db.session.refresh(borrow)
            return borrow
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def request_borrow(user_id, book_id):
        user_id = BorrowService._parse_uuid(user_id, "User ID")
        book_id = BorrowService._parse_uuid(book_id, "Book ID")

        book = BorrowService._get_or_404(Book, book_id, "Book", for_update=True)

        if book.available_copies <= 0:
            raise ValidationError("Book currently out of stock")

        # Prevent duplicate active requests or holds on the same book
        existing_active = Borrow.query.filter_by(user_id=user_id, book_id=book_id)\
            .filter(Borrow.status.in_(BorrowService.ACTIVE_STATUSES))\
            .first()

        if existing_active:
            raise ValidationError("You already have an active request or borrow for this book")

        borrow = Borrow(
            user_id=user_id,
            book_id=book_id,
            status=Borrow.STATUS_PENDING_BORROW
        )
        db.session.add(borrow)
        return BorrowService._apply(borrow)

    @staticmethod
    def approve_borrow_request(borrow_id):
        """Reserve an available copy for an approved request."""
        borrow_id = BorrowService._parse_uuid(borrow_id, "Borrow ID")
        borrow = BorrowService._get_or_404(Borrow, borrow_id, "Borrow record", for_update=True)

        book = db.session.get(Book, borrow.book_id, with_for_update=True)
        if borrow.status == Borrow.STATUS_PENDING_BORROW and (not book or book.available_copies <= 0):
            raise ValidationError("Book is out of stock and cannot be borrowed")

        return BorrowService._apply(borrow, lambda: borrow.approve(book))

    @staticmethod
    def confirm_borrow_pickup(borrow_id):
        """Start the loan clock after staff hands the reserved book to the student."""
        borrow_id = BorrowService._parse_uuid(borrow_id, "Borrow ID")
        borrow = BorrowService._get_or_404(Borrow, borrow_id, "Borrow record", for_update=True)

        return BorrowService._apply(
            borrow, lambda: borrow.confirm_pickup(BorrowService.BORROW_DURATION)
        )

    @staticmethod
    def reject_borrow_request(borrow_id, reason):
        """Librarian rejects a pending borrow request."""
        if not isinstance(reason, str) or not reason.strip():
            raise ValidationError("Rejection reason is required")

        borrow_id = BorrowService._parse_uuid(borrow_id, "Borrow ID")
        borrow = BorrowService._get_or_404(Borrow, borrow_id, "Borrow record", for_update=True)

        return BorrowService._apply(borrow, lambda: borrow.reject(reason))

    @staticmethod
    def approve_return_request(borrow_id):
        """Librarian confirms physical receipt of returned book."""
        borrow_id = BorrowService._parse_uuid(borrow_id, "Borrow ID")
        borrow = BorrowService._get_or_404(Borrow, borrow_id, "Borrow record", for_update=True)

        book = db.session.get(Book, borrow.book_id, with_for_update=True)
        return BorrowService._apply(borrow, lambda: borrow.mark_returned(book))
