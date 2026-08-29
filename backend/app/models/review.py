from app.models.base import BaseEntity
from sqlalchemy.dialects.postgresql import UUID
from app.extensions import db

class Review(BaseEntity):
  __tablename__ = "reviews"

  book_id = db.Column(UUID(as_uuid=True), db.ForeignKey("books.id"), nullable=False)
  user_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
  rating = db.Column(db.Integer, nullable=False)
  comment = db.Column(db.Text, nullable=True)
  created_at = db.Column(db.DateTime, server_default=db.func.now())

  user = db.relationship("User", backref="reviews")

  def to_dict(self):
    return {
      "id": str(self.id),
      "username": self.user.username if self.user.username else "Anonymous",
      "rating": self.rating,
      "comment": self.comment,
      "created_at": self.created_at.isoformat() if self.created_at else None,
    }

