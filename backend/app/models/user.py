from app.models.base import BaseEntity
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(BaseEntity): # Inheritance
  __tablename__ = "users"

  user_id = db.Column(db.Integer, primary_key=True)
  student_number = db.Column(db.String(10), unique=True, nullable=True)
  username = db.Column(db.String(100), nullable=False)
  email = db.Column(db.String(100), unique=True, nullable=False)
  course = db.Column(db.String(100), nullable=True)
  is_active = db.Column(db.Boolean, nullable=False, default=True)
  role = db.Column(db.String(20), nullable=False, default='student')
  created_at = db.Column(db.DateTime, default=db.func.now(), nullable=False)

  borrows = db.relationship("Borrow", backref="user", lazy=True)

  # protect the raw pass 
  _password_hash = db.Column("password_hash", db.String(255), nullable=False)

  # constructor
  def __init__(self, username: str, email: str, password: str, role: str = "student", student_number: str = None, course: str = None):
    self.student_number = student_number
    self.username = username
    self.email = email
    self.course = course
    self.role = role
    self.password = password

  # encapsulation
  @property
  def password(self):
    # prevent direct reading of plain text or raw hashes
    raise AttributeError("Password cannot be view for security reasons")

  @password.setter
  def password(self, plain_password: str):
    # move hashing logic outside the routes
    self._password_hash = generate_password_hash(plain_password)

  def check_password(self, plain_password: str) -> bool:
    # for verification
    return check_password_hash(self._password_hash, plain_password)

  def is_admin_or_librarian(self) -> bool:
    return self.role.lower() in ['admin', 'librarian']

  # polymorphism
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
