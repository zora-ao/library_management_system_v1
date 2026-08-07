from app.extensions import db

class Book(db.Model):
  __tablename__ = "books"

  book_id = db.Column(db.Integer, primary_key=True)
  isbn = db.Column(db.String(20), unique=True)
  title = db.Column(db.String(200), nullable=False)
  author = db.Column(db.String(100), nullable=False)
  category = db.Column(db.String(50))
  
  image_url = db.Column(db.String(500), nullable=True)
  total_copies = db.Column(db.Integer, nullable=False, default=1)
  available_copies = db.Column(db.Integer, nullable=False, default=1)
  description = db.Column(db.String(250))
  pages = db.Column(db.Integer)
  created_at = db.Column(db.DateTime, server_default=db.func.now())
  is_deleted = db.Column(db.Boolean, default=False, nullable=False)

  borrows = db.relationship("Borrow", backref="book", lazy=True)

  def to_dict(self):
    return {
        "book_id": self.book_id,
        "isbn": self.isbn,
        "title": self.title,
        "author": self.author,
        "category": self.category,
        "image_url": self.image_url,
        "total_copies": self.total_copies,
        "description": self.description,
        "pages": self.pages,
        "created_at": self.created_at.isoformat() if self.created_at else None
    }
