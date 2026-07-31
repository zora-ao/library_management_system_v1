from app.extensions import db

class Book(db.Model):
  __tablename__ = "books"

  id = db.Column(db.Integer, primary_key=True)
  isbn = db.Column(db.String(20), unique=True)
  title = db.Column(db.String(200), nullable=False)
  author = db.Column(db.String(100), nullable=False)
  category = db.Column(db.String(50))
  quantity = db.Column(db.Integer, default=1)
  available = db.Column(db.Integer, default=1)
  created_at = db.Column(db.DateTime, default=db.func.now())

  borrow = db.relationship("Borrow", backref="book", lazy=True)

  def to_dict(self):
    return {
        "id": self.id,
        "isbn": self.isbn,
        "title": self.title,
        "author": self.author,
        "category": self.category,
        "quantity": self.quantity,
        "available": self.available
    }
