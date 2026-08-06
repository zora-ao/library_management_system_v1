from app.extensions import db

class User(db.Model):
  __tablename__ = "users"

  user_id = db.Column(db.Integer, primary_key=True)
  student_number = db.Column(db.String(10), unique=True, nullable=True)
  username = db.Column(db.String(100), nullable=False)
  email = db.Column(db.String(100), unique=True, nullable=False)
  password_hash = db.Column(db.String(255), nullable=False)
  course = db.Column(db.String(100), nullable=True)
  is_active = db.Column(db.Boolean, nullable=False, default=True)
  role = db.Column(db.String(20), nullable=False, default='student')
  created_at = db.Column(db.DateTime, default=db.func.now(), nullable=False)

  borrows = db.relationship("Borrow", backref="user", lazy=True)

  def to_dict(self):
    return {
        "user_id": self.user_id,
        "student_number": self.student_number,
        "username": self.username,
        "email": self.email,
        "course": self.course,
        "role": self.role,
        "is_active": self.is_active,
        "created_at": self.created_at if self.created_at else None
    }
