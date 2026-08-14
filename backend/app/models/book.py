from app.models.base import BaseEntity
from app.extensions import db

class Book(BaseEntity): # Inheritance
  __tablename__ = "books"

  book_id = db.Column(db.Integer, primary_key=True)
  isbn = db.Column(db.String(20), unique=True)
  title = db.Column(db.String(200), nullable=False)
  author = db.Column(db.String(100), nullable=False)
  category_id = db.Column(db.Integer, db.ForeignKey("categories.category_id"), nullable=True)

  image_url = db.Column(db.String(500), nullable=True)
  description = db.Column(db.String(250))
  pages = db.Column(db.Integer)
  created_at = db.Column(db.DateTime, server_default=db.func.now())
  is_deleted = db.Column(db.Boolean, default=False, nullable=False)

  borrows = db.relationship("Borrow", backref="book", lazy=True)

  # Encapsulation
  _total_copies = db.Column("total_copies", db.Integer, nullable=False, default=1)
  _available_copies = db.Column("available_copies",db.Integer, nullable=False, default=1)

  # Constructor
  def __init__(self, title, author, total_copies=1, isbn=None, category_id=None, description=None, pages=None, image_url=None):
    self.title = title
    self.author = author
    self._total_copies = total_copies
    self._available_copies = total_copies
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

  def adjust_total_copies(self, new_total: int):
    # it safely update the total copies and recalculate available copies
    if new_total < 1:
      raise ValueError("Total copies must be 1 or greater")

    diff = new_total - self._total_copies
    if self._total_copies + diff < 0:
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
    if self._available_copies > self._total_copies:
      raise ValueError("All copies are already returned")

    self._available_copies += 1

  # Polymorphism
  def to_dict(self):
    return {
        "book_id": self.book_id,
        "isbn": self.isbn,
        "title": self.title,
        "author": self.author,
        "category_id": self.category_id,
        "category_name": self.category.name if self.category else None,
        "image_url": self.image_url,
        "total_copies": self.total_copies,
        "available_copies": self.available_copies,
        "description": self.description,
        "pages": self.pages,
        "created_at": self.created_at.isoformat() if self.created_at else None
    }
