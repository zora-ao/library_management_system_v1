from app.models.base import BaseEntity
from app.models.schemas import UserDict
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(BaseEntity): # Inheritance
  __tablename__ = "users"

  ROLE_STUDENT = "student"
  ROLE_LIBRARIAN = "librarian"
  ROLE_ADMIN = "admin"
  ROLES = (ROLE_STUDENT, ROLE_LIBRARIAN, ROLE_ADMIN)
  STAFF_ROLES = (ROLE_LIBRARIAN, ROLE_ADMIN)

  username = db.Column(db.String(100), unique=True, nullable=False)
  email = db.Column(db.String(100), unique=True, nullable=False)
  phone = db.Column(db.String(30), nullable=True)
  is_active = db.Column(db.Boolean, nullable=False, default=True)
  role = db.Column(
    db.String(20),
    db.ForeignKey("roles.name", name="fk_users_role_roles", onupdate="CASCADE"),
    nullable=False,
    default='student',
  )
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
        avatar_url: str | None = None,
        phone: str | None = None
      ):
    self.username = username
    self.email = email
    self.role = role
    self.google_id = google_id
    self.avatar_url = avatar_url
    self.phone = phone

    # users who signup/login with google don't need to input password
    if password:
      self.password = password

  # encapsulation
  @property
  def password(self):
    # prevent direct reading of plain text or raw hashes
    raise AttributeError("Password cannot be viewed for security reasons")

  @password.setter
  def password(self, plain_password: str):
    # move hashing logic outside the routes
    self._password_hash = generate_password_hash(plain_password)

  def check_password(self, plain_password: str) -> bool:
    # for verification
    if not self._password_hash:
      return False
    return check_password_hash(self._password_hash, plain_password)

  @classmethod
  def is_staff_role(cls, role: str | None) -> bool:
    # Shared by instances and by the JWT middleware, which only has the role claim.
    return (role or "").lower() in cls.STAFF_ROLES

  @classmethod
  def is_admin_role(cls, role: str | None) -> bool:
    return (role or "").lower() == cls.ROLE_ADMIN

  def is_admin(self) -> bool:
    return self.is_admin_role(self.role)

  # polymorphism
  def to_dict(self) -> UserDict:
    return {
        "id": str(self.id) if self.id else None,
        "username": self.username,
        "email": self.email,
        "role": self.role,
        "is_active": self.is_active,
        "phone": self.phone,
        "avatar_url": self.avatar_url,
        "is_google_account": self.google_id is not None,
        "created_at": (
            self.created_at.isoformat()
            if self.created_at
            else None
        ),
    }