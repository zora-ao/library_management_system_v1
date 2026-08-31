from app.models import Borrow, Book
from app.extensions import db
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone, timedelta


class BorrowService:
  BORROW_DURATION = 14

  @staticmethod
  def get_all_borrows_admin():
    return Borrow.query.order_by(
      Borrow.borrowed_at.desc()
    ).all()

  @staticmethod
  def get_borrowed_history(user_id):
    return (
      Borrow.query.filter_by(user_id=user_id)
      .filter(Borrow.returned_at.isnot(None))
      .order_by(Borrow.returned_at.desc())
      .all()
    )

  @staticmethod
  def get_user_active_borrows(user_id):
    return (
      Borrow.query.options(joinedload(Borrow.book)).filter_by(
        user_id=user_id,
        returned_at=None
      ).all()
    )

  @staticmethod
  def borrow_book(user_id, book_id):
    book = db.session.get(Book, book_id)

    if not book:
      raise ValueError("Book not found")

    if book.available_copies <= 0:
      raise ValueError("Book currently out of stock")

    active_borrow = Borrow.query.filter_by(
        user_id=user_id,
        book_id=book_id,
        returned_at=None
      ).first()

    if active_borrow:
      raise ValueError("You already borrowed this book")

    due_date = datetime.now(timezone.utc) + timedelta(days=BORROW_DURATION)

    try:
      book.decrement_available()
      borrow = Borrow(
        user_id=user_id,
        book_id=book_id,
        due_date=due_date
      )

      db.session.add(borrow)
      db.session.commit()

    except Exception:
      db.session.rollback()
      raise

  @staticmethod
  def return_book(borrow_id, user_id):

    borrow = db.session.get(Borrow, borrow_id)

    if borrow is None:
      raise ValueError("Borrow record not found")

    if str(borrow_id) != str(user_id):
      raise PermissionError("Unauthorized")

    if borrow.returned_at is not None:
      raise ValueError("Book has been already returned")

    book = db.session.get(Book, borrow.book_id)

    if book is None:
      raise ValueError("Book not found")

    try:
      borrow.marked_as_returned()
      book.increment_available()

      db.session.commit()
    except Exception:
      db.session.rollback()
      raise
