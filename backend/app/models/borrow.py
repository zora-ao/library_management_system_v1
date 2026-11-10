from datetime import datetime, timedelta, timezone
from sqlalchemy.dialects.postgresql import UUID
from app.exceptions import ValidationError
from app.models.base import BaseEntity
from app.models.schemas import BorrowDict
from app.extensions import db


class Borrow(BaseEntity):
    __tablename__ = "borrows"

    # Status Constants
    STATUS_PENDING_BORROW = "PENDING_BORROW"
    STATUS_READY_FOR_PICKUP = "READY_FOR_PICKUP"
    STATUS_BORROWED = "BORROWED"
    STATUS_PENDING_RETURN = "PENDING_RETURN"
    STATUS_RETURNED = "RETURNED"
    STATUS_REJECTED = "REJECTED"
    STATUS_OVERDUE = "OVERDUE"
    STATUSES = (
        STATUS_PENDING_BORROW,
        STATUS_READY_FOR_PICKUP,
        STATUS_BORROWED,
        STATUS_PENDING_RETURN,
        STATUS_RETURNED,
        STATUS_REJECTED,
        STATUS_OVERDUE,
    )

    # Loans still out with the student; a pending return stays overdue until
    # the librarian confirms it, matching the dashboard and Loans & Returns page.
    OVERDUE_ELIGIBLE_STATUSES = (STATUS_BORROWED, STATUS_PENDING_RETURN)

    __table_args__ = (
        db.Index("ix_borrows_user_id_status", "user_id", "status"),
        db.Index("ix_borrows_book_id_status", "book_id", "status"),
        db.Index("ix_borrows_status", "status"),
    )

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
    book_id = db.Column(UUID(as_uuid=True), db.ForeignKey("books.id"), nullable=False)

    # Nullable until approved by librarian
    borrowed_at = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    returned_at = db.Column(db.DateTime, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    status = db.Column(
        "status",
        db.String(100),
        db.ForeignKey("borrow_statuses.code", name="fk_borrows_status_borrow_statuses", onupdate="CASCADE"),
        default=STATUS_PENDING_BORROW,
        nullable=False,
    )

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def __init__(self, user_id: UUID, book_id: UUID, due_date: datetime = None, status: str = STATUS_PENDING_BORROW):
        self.user_id = user_id
        self.book_id = book_id
        self.due_date = due_date
        self.status = status

    def is_overdue(self) -> bool:
        if self.status not in self.OVERDUE_ELIGIBLE_STATUSES or not self.due_date:
            return False
        due = self.due_date.replace(tzinfo=timezone.utc) if self.due_date.tzinfo is None else self.due_date
        return datetime.now(timezone.utc) > due

    # ---- Lifecycle (encapsulation) ------------------------------------
    # Every status change goes through one of these methods, which check
    # that the move is allowed from the current status. Services ask the
    # borrow to change ("tell, don't ask") instead of editing `status`.
    #
    #   PENDING_BORROW -> READY_FOR_PICKUP -> BORROWED -> RETURNED
    #   PENDING_BORROW -> REJECTED

    RETURNABLE_STATUSES = (STATUS_PENDING_RETURN, STATUS_BORROWED, STATUS_OVERDUE)

    def _require_status(self, allowed: tuple[str, ...], message: str) -> None:
        if self.status not in allowed:
            raise ValidationError(message)

    def approve(self, book) -> None:
        """Reserve one copy of ``book`` for this request."""
        self._require_status(
            (self.STATUS_PENDING_BORROW,),
            "Only requests that are waiting can be approved for borrow",
        )
        book.decrement_available()
        self.status = self.STATUS_READY_FOR_PICKUP
        self.approved_at = datetime.now(timezone.utc)
        self.borrowed_at = None
        self.due_date = None

    def confirm_pickup(self, loan_days: int) -> None:
        """Start the loan clock once the student collects the book."""
        self._require_status(
            (self.STATUS_READY_FOR_PICKUP,),
            "Only requests ready for pickup can be confirmed",
        )
        now = datetime.now(timezone.utc)
        self.status = self.STATUS_BORROWED
        self.borrowed_at = now
        self.due_date = now + timedelta(days=loan_days)

    def reject(self, reason: str) -> None:
        """Decline a waiting request with a reason shown to the student."""
        if not isinstance(reason, str) or not reason.strip():
            raise ValidationError("Rejection reason is required")
        self._require_status(
            (self.STATUS_PENDING_BORROW,),
            "Only requests that are waiting can be rejected",
        )
        self.status = self.STATUS_REJECTED
        self.rejection_reason = reason.strip()

    def mark_returned(self, book=None) -> None:
        """Check the book back in and release its copy."""
        self._require_status(
            self.RETURNABLE_STATUSES,
            "Borrow record is not waiting for return confirmation",
        )
        self.status = self.STATUS_RETURNED
        self.returned_at = datetime.now(timezone.utc)
        if book is not None:
            book.increment_available()

    @staticmethod
    def _isoformat_utc(value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()

    def to_dict(self) -> BorrowDict:
        overdue = self.is_overdue()
        # Only a plain loan is relabelled OVERDUE; a pending return keeps its
        # status so staff still see the return request, with is_overdue set.
        status = self.STATUS_OVERDUE if overdue and self.status == self.STATUS_BORROWED else self.status
        return {
            "id": str(self.id) if self.id else None,
            "user_id": str(self.user_id) if self.user_id else None,
            "user_name": self.user.username if getattr(self, "user", None) else None,
            "user_email": self.user.email if getattr(self, "user", None) else None,
            "book_id": str(self.book_id) if self.book_id else None,
            "book_title": self.book.title if getattr(self, "book", None) and getattr(self.book, "title", None) else "Unknown",
            "book_image": self.book.image_url if getattr(self, "book", None) else None,
            "author": self.book.author if getattr(self, "book", None) else None,
            "book_available_copies": self.book.available_copies if getattr(self, "book", None) else None,
            "borrowed_at": self._isoformat_utc(self.borrowed_at),
            "due_date": self._isoformat_utc(self.due_date),
            "approved_at": self._isoformat_utc(self.approved_at),
            "rejection_reason": self.rejection_reason,
            "status": status,
            "is_overdue": overdue,
            "returned_at": self._isoformat_utc(self.returned_at),
            "created_at": self._isoformat_utc(self.created_at)
        }
