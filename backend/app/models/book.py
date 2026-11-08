from datetime import timezone

from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseEntity
from app.models.schemas import BookDict
from app.extensions import db

class Book(BaseEntity): # Inheritance
  __tablename__ = "books"
  __table_args__ = (
    db.CheckConstraint(
      "total_copies >= 1",
      name="ck_books_total_copies_positive",
    ),
    db.CheckConstraint(
      "available_copies >= 0",
      name="ck_books_available_copies_nonnegative",
    ),
    db.CheckConstraint(
      "available_copies <= total_copies",
      name="ck_books_available_not_above_total",
    ),
    db.CheckConstraint(
      "pages IS NULL OR pages > 0",
      name="ck_books_pages_positive",
    ),
    db.Index("ix_books_category_id", "category_id"),
  )

  isbn = db.Column(db.String(20), unique=True)
  title = db.Column(db.String(200), nullable=False)
  author = db.Column(db.String(100), nullable=False)
  category_id = db.Column(UUID(as_uuid=True), db.ForeignKey("categories.id"), nullable=True)

  image_url = db.Column(db.String(500), nullable=True)
  description = db.Column(db.String(250))
  pages = db.Column(db.Integer)
  created_at = db.Column(db.DateTime, server_default=db.func.now())
  is_deleted = db.Column(db.Boolean, default=False, nullable=False)
  archived_at = db.Column(db.DateTime(timezone=True), nullable=True)

  # relationships
  borrows = db.relationship("Borrow", backref="book", lazy=True)
  category = db.relationship("Category", back_populates="books", lazy=True)
  reviews = db.relationship("Review", backref="book", lazy=True, cascade="all, delete-orphan")

  # Encapsulation
  _total_copies = db.Column("total_copies", db.Integer, nullable=False, default=1)
  _available_copies = db.Column("available_copies",db.Integer, nullable=False, default=1)

  # Constructor
  def __init__(self, title, author, total_copies=1, available_copies=None, isbn=None, category_id=None, description=None, pages=None, image_url=None):
    self.title = title
    self.author = author
    self._total_copies = total_copies
    self._available_copies = available_copies if available_copies is not None else total_copies
    self.isbn = isbn
    self.category_id = category_id
    self.description = description
    self.pages = pages
    self.image_url = image_url

  # Encapsulation
  @property
  def total_copies(self):
    return self._total_copies

  @property
  def available_copies(self):
    return self._available_copies

  # Ratings are aggregated in SQL (see column_property definitions at the
  # bottom of this module) instead of loading every Review row into Python.
  @property
  def average_rating(self):
    average = self.rating_average
    if average is None:
      return 0.0
    return round(float(average), 1)

  @property
  def total_reviews(self):
    return int(self.review_count or 0)

  def adjust_total_copies(self, new_total: int):
    # it safely update the total copies and recalculate available copies
    if new_total < 1:
      raise ValueError("Total copies must be 1 or greater")

    diff = new_total - self._total_copies
    if self._available_copies + diff < 0:
      raise ValueError("Cannot reduce copies below currently borrowed count")

    self._total_copies = new_total
    self._available_copies += diff

  def decrement_available(self):
    # this will decrement the available copies when someone borrows it
    if self._available_copies <= 0:
      raise ValueError("No available copies to borrow")

    self._available_copies -= 1

  def increment_available(self):
    # this will increment the available copies when someone return a book
    if self._available_copies >= self._total_copies:
      raise ValueError("All copies are already returned")

    self._available_copies += 1

  # Polymorphism
  def to_dict(self) -> BookDict:
    archived_at = self.archived_at
    if archived_at and archived_at.tzinfo is None:
      archived_at = archived_at.replace(tzinfo=timezone.utc)

    return {
        "id": str(self.id) if self.id else None,
        "isbn": self.isbn,
        "title": self.title,
        "author": self.author,
        "category_id": str(self.category_id) if self.category_id else None,
        "category_name": self.category.name if self.category else None,
        "image_url": self.image_url,
        "total_copies": self.total_copies,
        "available_copies": self.available_copies,
        "description": self.description,
        "average_rating": self.average_rating,
        "total_reviews": self.total_reviews,
        "pages": self.pages,
        "created_at": self.created_at.isoformat() if self.created_at else None,
        "is_deleted": bool(self.is_deleted),
        "archived_at": archived_at.astimezone(timezone.utc).isoformat() if archived_at else None
    }


# Review aggregates as deferred SQL subqueries. List queries load them in the
# same statement with ``undefer_group(REVIEW_STATS_GROUP)``; any other access
# loads both values with one extra query instead of fetching every review.
from sqlalchemy import func, select  # noqa: E402
from sqlalchemy.orm import column_property  # noqa: E402
from app.models.review import Review  # noqa: E402

REVIEW_STATS_GROUP = "review_stats"

Book.rating_average = column_property(
  select(func.avg(Review.rating))
  .where(Review.book_id == Book.id)
  .correlate_except(Review)
  .scalar_subquery(),
  deferred=True,
  group=REVIEW_STATS_GROUP,
)
Book.review_count = column_property(
  select(func.count(Review.id))
  .where(Review.book_id == Book.id)
  .correlate_except(Review)
  .scalar_subquery(),
  deferred=True,
  group=REVIEW_STATS_GROUP,
)
