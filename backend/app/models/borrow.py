from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseEntity
from app.extensions import db


class Borrow(BaseEntity):
    __tablename__ = "borrows"

    # Status Constants
    STATUS_PENDING_BORROW = "PENDING_BORROW"
    STATUS_BORROWED = "BORROWED"
    STATUS_PENDING_RETURN = "PENDING_RETURN"
    STATUS_RETURNED = "RETURNED"
    STATUS_REJECTED = "REJECTED"
    STATUS_OVERDUE = "OVERDUE"

    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
    book_id = db.Column(UUID(as_uuid=True), db.ForeignKey("books.id"), nullable=False)

    # Nullable until approved by librarian
    borrowed_at = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    returned_at = db.Column(db.DateTime, nullable=True)

    status = db.Column("status", db.String(100), default=STATUS_PENDING_BORROW, nullable=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def __init__(self, user_id: UUID, book_id: UUID, due_date: datetime = None, status: str = STATUS_PENDING_BORROW):
        self.user_id = user_id
        self.book_id = book_id
        self.due_date = due_date
        self.status = status

    def is_overdue(self) -> bool:
        if self.status != self.STATUS_BORROWED or not self.due_date:
            return False
        due = self.due_date.replace(tzinfo=timezone.utc) if self.due_date.tzinfo is None else self.due_date
        return datetime.now(timezone.utc) > due

    def marked_as_returned(self):
        """Safely handles book return confirmation."""
        if self.status == self.STATUS_RETURNED:
            raise ValueError("It is already marked as returned")

        self.returned_at = datetime.now(timezone.utc)
        self.status = self.STATUS_RETURNED

    def to_dict(self):
        return {
            "id": str(self.id) if self.id else None,
            "user_id": str(self.user_id) if self.user_id else None,
            "user_name": self.user.username if getattr(self, "user", None) else None,
            "user_email": self.user.email if getattr(self, "user", None) else None,
            "book_id": str(self.book_id) if self.book_id else None,
            "book_title": self.book.title if getattr(self, "book", None) and getattr(self.book, "title", None) else "Unknown",
            "book_image": self.book.image_url if getattr(self, "book", None) else None,
            "author": self.book.author if getattr(self, "book", None) else None,
            "borrowed_at": self.borrowed_at.isoformat() if self.borrowed_at else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.STATUS_OVERDUE if self.is_overdue() else self.status,
            "is_overdue": self.is_overdue(),
            "returned_at": self.returned_at.isoformat() if self.returned_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }