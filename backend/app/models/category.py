from app.models.base import BaseEntity
from app.extensions import db

class Category(BaseEntity): # inheritance 
  __tablename__ = "categories"

  _name = db.Column("name", db.String(225), unique=True, nullable=False)

  books = db.relationship("Book", backref="category", lazy=True)

  # constructor
  def __init__(self, name):
    # Clean and format the category name
    self.name = name

  # encapsulation
  @property
  def name(self) -> str:
    return self._name

  @name.setter
  def name(self, value: str):
    if not value or not value.strip():
      raise ValueError("Category name cannot be empty")
    # making the name into title format
    self._name = value.strip().title()

  # polymorphism
  def to_dict(self):
    return {
      "id": self.id,
      "name": self.name
    }