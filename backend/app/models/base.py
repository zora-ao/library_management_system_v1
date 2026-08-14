from abc import ABC, abstractmethod
from app.extensions import db

class BaseEntity(db.Model, ABC):
  __abstract__ = True # Tells SQLAlchemy not to create a table for this class

  @abstractmethod
  def to_dict(self):
    pass