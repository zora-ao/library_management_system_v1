from app.models.base import BaseEntity
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(BaseEntity): # Inheritance
  __tablename__ = "users"

  username = db.Column(db.String(100), nullable=False)
  email = db.Column(db.String(100), unique=True, nullable=False)
  is_active = db.Column(db.Boolean, nullable=False, default=True)
  role = db.Column(db.String(20), nullable=False, default='student')
  created_at = db.Column(db.DateTime, default=db.func.now(), nullable=False)

  google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
  avatar_url = db.Column(db.String(500), nullable=True)

  borrows = db.relationship("Borrow", backref="user", lazy=True)

  # protect the raw pass 
  _password_hash = db.Column("password_hash", db.String(255), nullable=True)

  # constructor
  def __init__(
        self, username: str, 
        email: str, 
        password: str | None = None, 
        role: str = "student",
        google_id: str | None = None,
        avatar_url: str | None = None
      ):
    self.username = username
    self.email = email
    self.role = role
    self.google_id = google_id
    self.avatar_url = avatar_url

    # users who signup/login don't need to input password
    if password:
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
        "id": self.id,
        "username": self.username,
        "email": self.email,
        "role": self.role,
        "is_active": self.is_active,
        "is_google_account": self.google_id is not None,
        "created_at": self.created_at if self.created_at else None,
    }
