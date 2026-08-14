from datetime import datetime, timezone
from app.models.base import BaseEntity
from app.extensions import db

class Borrow(BaseEntity): # Inheritance
  __tablename__ = "borrow_records"

  borrow_id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
  book_id = db.Column(db.Integer, db.ForeignKey("books.book_id"), nullable=False)
  borrowed_at = db.Column(db.DateTime, default=db.func.now(), nullable=False)
  due_date = db.Column(db.DateTime, nullable=False)
  returned_at = db.Column(db.DateTime, nullable=True)

  # Encapsulation
  _status = db.Column("status", db.String(100), default="borrowed", nullable=False)

  # Constructor
  def __init__(self, user_id: int, book_id: int, due_date: datetime, status: str = "borrowed"):
    self.user_id = user_id
    self.book_id = book_id
    self.due_date = due_date
    self._status = status

  # Encapsulation
  @property
  def status(self) -> str:
    # evaluate if overdue
    if self._status == "borrowed" and datetime.now(timezone.utc) > self.due_date.replace(tzinfo=timezone.utc):
      return "Overdue"
    return self._status

  def marked_as_returned(self):
    # to safely handle book return
    if self._status == "returned":
      raise ValueError("It is already marked as returned")

    self.returned_at = datetime.now(timezone.utc)
    self._status = "returned"

  # helper function for checking if overdue
  def is_overdue(self) -> bool:
    return self._status == "overdue"

  def to_dict(self):
    return {
      "borrow_id": self.borrow_id,
      "user_id": self.user_id,
      "book_id": self.book_id,
      "borrowed_at": self.borrowed_at.isoformat() if self.borrowed_at else None,
      "due_date": self.due_date.isoformat(),
      "status": self.status,
      "is_overdue": self.is_overdue()
    }