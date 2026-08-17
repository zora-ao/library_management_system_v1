import uuid
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db

class BaseEntity(db.Model):
  __abstract__ = True # Tells SQLAlchemy not to create a table for this class

  # universal uuid primary key
  id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

  def to_dict(self):
    raise NotImplementedError("Subclasses must implement to_dict()")