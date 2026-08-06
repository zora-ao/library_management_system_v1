from app.extensions import db

class Borrow(db.Model):
  __tablename__ = "borrow_records"

  borrow_id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
  book_id = db.Column(db.Integer, db.ForeignKey("books.book_id"), nullable=False)
  borrowed_at = db.Column(db.DateTime, default=db.func.now(), nullable=False)
  due_date = db.Column(db.DateTime, nullable=False)
  returned_at = db.Column(db.DateTime, nullable=True)
  status = db.Column(db.String(100), default="borrowed")

  def to_dict(self):
    return {
      "borrow_id": self.borrow_id,
      "user_id": self.user_id,
      "book_id": self.book_id,
      "borrowed_at": self.borrowed_at.isoformat() if self.borrowed_at else None,
      "due_date": self.due_date.isoformat(),
      "status": self.status
    }