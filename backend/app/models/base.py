from abc import ABC, ABCMeta, abstractmethod
import uuid

from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


class SQLAlchemyABCMeta(type(db.Model), ABCMeta):
  """Combine Flask-SQLAlchemy's model metaclass with Python's ABCMeta."""


class BaseEntity(db.Model, ABC, metaclass=SQLAlchemyABCMeta):
  __abstract__ = True # Tells SQLAlchemy not to create a table for this class

  # universal uuid primary key
  id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

  @abstractmethod
  def to_dict(self):
    raise NotImplementedError("Subclasses must implement to_dict()")
