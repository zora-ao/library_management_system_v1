from app.extensions import db

class User(db.Model):
  __tablename__ = "users"

  id = db.Column(db.Integer, primary_key=True)
  student_number = db.Column(db.String(10), unique=True, nullable=False)
  first_name = db.Column(db.String(50), nullable=False)
  last_name = db.Column(db.String(50), nullable=False)
  password = db.Column(db.String(255), nullable=False)
  course = db.Column(db.String(100), nullable=False)
  role = db.Column(db.String(20), nullable=False, default='student')

  borrows = db.relationship("Borrow", backref="user", lazy=True)

  def to_dict(self):
    return {
        "id": self.id,
        "student_number": self.student_number,
        "first_name": self.first_name,
        "last_name": self.last_name,
        "course": self.course,
        "role": self.role
    }
