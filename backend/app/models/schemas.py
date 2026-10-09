from typing import Literal, TypedDict

# Serialization contracts for every model's to_dict().
# Each model declares to_dict() -> XDict, so the shape of every API response is
# defined in one place instead of being implied across six separate methods.


class BookDict(TypedDict):
  id: str | None
  isbn: str | None
  title: str
  author: str
  category_id: str | None
  category_name: str | None
  image_url: str | None
  total_copies: int
  available_copies: int
  description: str | None
  average_rating: float
  total_reviews: int
  pages: int | None
  created_at: str | None


class StudentDict(TypedDict):
  id: str | None
  user_id: str | None
  student_number: str | None
  course: str | None
  year_level: str | None
  enrollment_status: str


class UserDict(TypedDict):
  id: str | None
  username: str
  email: str
  role: str
  is_active: bool
  phone: str | None
  avatar_url: str | None
  is_google_account: bool
  created_at: str | None
  student: StudentDict | None


class CategoryDict(TypedDict):
  id: str | None
  name: str


class ReviewDict(TypedDict):
  id: str
  username: str
  rating: int
  comment: str | None
  created_at: str | None


BorrowStatus = Literal[
  "PENDING_BORROW",
  "BORROWED",
  "PENDING_RETURN",
  "RETURNED",
  "REJECTED",
  "OVERDUE",
]


class BorrowDict(TypedDict):
  id: str | None
  user_id: str | None
  user_name: str | None
  user_email: str | None
  book_id: str | None
  book_title: str
  book_image: str | None
  author: str | None
  borrowed_at: str | None
  due_date: str | None
  status: BorrowStatus
  is_overdue: bool
  returned_at: str | None
  created_at: str | None
