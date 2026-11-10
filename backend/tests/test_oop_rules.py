"""Tests for the object-oriented rules: Borrow lifecycle, role helpers and the
LibraryError hierarchy with its single global error handler."""

import unittest
import uuid
from unittest.mock import patch

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.blueprints.borrows.routes import borrows_bp
from app.exceptions import ConflictError, LibraryError, NotFoundError, ValidationError
from app.middleware.errors import error_bp
from app.models.book import Book
from app.models.borrow import Borrow
from app.models.review import Review
from app.models.user import User


def make_borrow(status=Borrow.STATUS_PENDING_BORROW):
    return Borrow(uuid.uuid4(), uuid.uuid4(), status=status)


class BorrowLifecycleTests(unittest.TestCase):
    def test_happy_path_moves_through_every_status(self):
        book = Book("Clean Code", "Robert C. Martin", total_copies=2)
        borrow = make_borrow()

        borrow.approve(book)
        self.assertEqual(borrow.status, Borrow.STATUS_READY_FOR_PICKUP)
        self.assertEqual(book.available_copies, 1)
        self.assertIsNotNone(borrow.approved_at)

        borrow.confirm_pickup(14)
        self.assertEqual(borrow.status, Borrow.STATUS_BORROWED)
        self.assertEqual((borrow.due_date - borrow.borrowed_at).days, 14)

        borrow.mark_returned(book)
        self.assertEqual(borrow.status, Borrow.STATUS_RETURNED)
        self.assertEqual(book.available_copies, 2)
        self.assertIsNotNone(borrow.returned_at)

    def test_reject_stores_trimmed_reason(self):
        borrow = make_borrow()
        borrow.reject("  Damaged copy  ")
        self.assertEqual(borrow.status, Borrow.STATUS_REJECTED)
        self.assertEqual(borrow.rejection_reason, "Damaged copy")

    def test_reject_requires_reason(self):
        borrow = make_borrow()
        with self.assertRaises(ValidationError):
            borrow.reject("   ")
        self.assertEqual(borrow.status, Borrow.STATUS_PENDING_BORROW)

    def test_illegal_transitions_raise_and_leave_status_unchanged(self):
        book = Book("Clean Code", "Robert C. Martin", total_copies=1)
        cases = [
            (Borrow.STATUS_BORROWED, lambda b: b.approve(book)),
            (Borrow.STATUS_PENDING_BORROW, lambda b: b.confirm_pickup(14)),
            (Borrow.STATUS_RETURNED, lambda b: b.reject("late")),
            (Borrow.STATUS_RETURNED, lambda b: b.mark_returned(book)),
            (Borrow.STATUS_READY_FOR_PICKUP, lambda b: b.mark_returned(book)),
        ]
        for status, action in cases:
            with self.subTest(status=status):
                borrow = make_borrow(status)
                with self.assertRaises(ValidationError):
                    action(borrow)
                self.assertEqual(borrow.status, status)
        self.assertEqual(book.available_copies, 1)

    def test_approve_without_copies_raises(self):
        book = Book("Clean Code", "Robert C. Martin", total_copies=1, available_copies=0)
        with self.assertRaises(ValidationError):
            make_borrow().approve(book)


class UserRoleTests(unittest.TestCase):
    def test_staff_and_admin_role_checks(self):
        self.assertTrue(User.is_staff_role("Librarian"))
        self.assertTrue(User.is_staff_role("admin"))
        self.assertFalse(User.is_staff_role("student"))
        self.assertFalse(User.is_staff_role(None))
        self.assertTrue(User.is_admin_role("ADMIN"))
        self.assertFalse(User.is_admin_role("librarian"))

    def test_instance_is_admin(self):
        self.assertTrue(User("a", "a@example.com", role="admin").is_admin())
        self.assertFalse(User("b", "b@example.com", role="librarian").is_admin())


class ReviewRatingTests(unittest.TestCase):
    def test_parse_rating(self):
        self.assertEqual(Review.parse_rating("4"), 4)
        self.assertEqual(Review.parse_rating(5.0), 5)
        for bad in (0, 6, 4.5, True, "abc", None):
            with self.subTest(rating=bad):
                with self.assertRaises(ValidationError):
                    Review.parse_rating(bad)


class ExceptionHierarchyTests(unittest.TestCase):
    def test_subclasses_keep_builtin_compatibility(self):
        self.assertTrue(issubclass(ValidationError, ValueError))
        self.assertTrue(issubclass(NotFoundError, LookupError))
        for cls in (ValidationError, NotFoundError, ConflictError):
            self.assertTrue(issubclass(cls, LibraryError))

    def test_status_codes(self):
        self.assertEqual(ValidationError("x").status_code, 400)
        self.assertEqual(NotFoundError("x").status_code, 404)
        self.assertEqual(ConflictError("x").status_code, 409)


class GlobalErrorHandlerTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(TESTING=True, JWT_SECRET_KEY="test-secret")
        JWTManager(self.app)
        self.app.register_blueprint(borrows_bp)
        self.app.register_blueprint(error_bp)
        with self.app.app_context():
            token = create_access_token(
                identity=str(uuid.uuid4()), additional_claims={"role": "librarian"}
            )
        self.headers = {"Authorization": f"Bearer {token}"}
        self.client = self.app.test_client()

    @patch("app.blueprints.borrows.routes.BorrowService.approve_borrow_request")
    def test_library_errors_map_to_their_status_codes(self, approve):
        for error, expected in (
            (NotFoundError("Borrow record not found"), 404),
            (ValidationError("Only requests that are waiting can be approved"), 400),
        ):
            with self.subTest(expected=expected):
                approve.side_effect = error
                response = self.client.put(
                    f"/api/borrows/admin/{uuid.uuid4()}/approve-borrow",
                    headers=self.headers,
                )
                self.assertEqual(response.status_code, expected)
                self.assertEqual(response.get_json()["message"], str(error))


if __name__ == "__main__":
    unittest.main()
