import unittest

from flask import Flask

from app.extensions import db
from app.models import Student, User
from app.services.auth_service import AuthService


class RegistrationServiceTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def assert_registration_error(self, expected_type, expected_message, *values):
        with self.assertRaises(Exception) as raised:
            AuthService.register_user(*values)

        self.assertEqual(type(raised.exception).__name__, expected_type)
        self.assertEqual(str(raised.exception), expected_message)
        self.assertEqual(User.query.count(), 0)
        self.assertEqual(Student.query.count(), 0)

    def clear_accounts(self):
        db.session.rollback()
        Student.query.delete()
        User.query.delete()
        db.session.commit()

    def test_register_user_normalizes_username_and_email(self):
        user = AuthService.register_user(
            "  Alice  ", "  ALICE@Example.COM ", "password"
        )

        self.assertEqual(user.username, "Alice")
        self.assertEqual(user.email, "alice@example.com")
        self.assertEqual(User.query.count(), 1)
        self.assertEqual(Student.query.count(), 1)
        self.assertIsNotNone(user.student)

    def test_register_user_rejects_invalid_email(self):
        self.assert_registration_error(
            "RegistrationValidationError",
            "Enter a valid email address",
            "Alice",
            "alice-at-example.com",
            "password",
        )

    def test_register_user_rejects_short_username(self):
        self.assert_registration_error(
            "RegistrationValidationError",
            "Username must be between 3 and 100 characters",
            "Al",
            "alice@example.com",
            "password",
        )

    def test_register_user_rejects_short_password(self):
        self.assert_registration_error(
            "RegistrationValidationError",
            "Password must be at least 8 characters",
            "Alice",
            "alice@example.com",
            "1234567",
        )

    def test_register_user_rejects_non_string_fields(self):
        cases = (
            (123, "alice@example.com", "password"),
            ("Alice", True, "password"),
            ("Alice", "alice@example.com", ["password"]),
            ({"name": "Alice"}, "alice@example.com", "password"),
        )

        for values in cases:
            with self.subTest(values=values):
                try:
                    self.assert_registration_error(
                        "RegistrationValidationError",
                        "Username, email, and password must be strings",
                        *values,
                    )
                finally:
                    self.clear_accounts()

    def test_register_user_rejects_blank_and_overlong_values(self):
        cases = (
            (
                ("   ", "alice@example.com", "password"),
                "Username, email, and password are required",
            ),
            (
                ("Alice", "   ", "password"),
                "Username, email, and password are required",
            ),
            (
                ("Alice", "alice@example.com", ""),
                "Username, email, and password are required",
            ),
            (
                ("A" * 101, "alice@example.com", "password"),
                "Username must be between 3 and 100 characters",
            ),
            (
                ("Alice", f"{'a' * 89}@example.com", "password"),
                "Email must be 100 characters or fewer",
            ),
        )

        for values, expected_message in cases:
            with self.subTest(values=values):
                try:
                    self.assert_registration_error(
                        "RegistrationValidationError",
                        expected_message,
                        *values,
                    )
                finally:
                    self.clear_accounts()

    def test_register_user_raises_conflict_for_normalized_duplicate(self):
        AuthService.register_user("Alice", "alice@example.com", "password")

        with self.assertRaises(Exception) as raised:
            AuthService.register_user(
                "Another User", "  ALICE@EXAMPLE.COM  ", "password"
            )

        self.assertEqual(
            type(raised.exception).__name__, "RegistrationConflictError"
        )
        self.assertEqual(str(raised.exception), "Username or email already exists")
        self.assertEqual(User.query.count(), 1)
        self.assertEqual(Student.query.count(), 1)


if __name__ == "__main__":
    unittest.main()
