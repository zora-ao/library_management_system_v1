import unittest

from flask import Flask

from app.blueprints.auth.routes import auth_bp
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

    def clear_accounts(self):
        db.session.rollback()
        Student.query.delete()
        User.query.delete()
        db.session.commit()

    def assert_registration_error(self, expected_type, expected_message, *values):
        with self.assertRaises(Exception) as raised:
            AuthService.register_user(*values)

        self.assertEqual(type(raised.exception).__name__, expected_type)
        self.assertEqual(str(raised.exception), expected_message)
        self.assertEqual(User.query.count(), 0)
        self.assertEqual(Student.query.count(), 0)

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
        invalid_emails = (
            "alice-at-example.com",
            ".alice@example.com",
            "alice..smith@example.com",
            "alice@example..com",
            "alice@exam!ple.com",
        )

        for email in invalid_emails:
            with self.subTest(email=email):
                try:
                    self.assert_registration_error(
                        "RegistrationValidationError",
                        "Enter a valid email address",
                        "Alice",
                        email,
                        "password",
                    )
                finally:
                    self.clear_accounts()

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
                ("Alice", "alice@example.com", "        "),
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


class RegistrationRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            PROPAGATE_EXCEPTIONS=False,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(auth_bp)
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def clear_accounts(self):
        db.session.rollback()
        Student.query.delete()
        User.query.delete()
        db.session.commit()

    def test_register_route_returns_400_for_each_invalid_field(self):
        cases = (
            (
                {
                    "username": "Alice",
                    "email": "alice-at-example.com",
                    "password": "password",
                },
                "Enter a valid email address",
            ),
            (
                {
                    "username": "Al",
                    "email": "alice@example.com",
                    "password": "password",
                },
                "Username must be between 3 and 100 characters",
            ),
            (
                {
                    "username": "Alice",
                    "email": "alice@example.com",
                    "password": "1234567",
                },
                "Password must be at least 8 characters",
            ),
            (
                {
                    "username": 123,
                    "email": "alice@example.com",
                    "password": "password",
                },
                "Username, email, and password must be strings",
            ),
            (
                {
                    "username": "Alice",
                    "email": "alice@example.com",
                    "password": "        ",
                },
                "Username, email, and password are required",
            ),
        )

        for payload, expected_message in cases:
            with self.subTest(payload=payload):
                response = self.client.post("/api/auth/register", json=payload)

                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json(), {"message": expected_message})
                self.assertEqual(User.query.count(), 0)
                self.assertEqual(Student.query.count(), 0)

    def test_register_route_rejects_malformed_email_variants(self):
        invalid_emails = (
            ".alice@example.com",
            "alice..smith@example.com",
            "alice@example..com",
            "alice@exam!ple.com",
        )

        for email in invalid_emails:
            with self.subTest(email=email):
                try:
                    response = self.client.post(
                        "/api/auth/register",
                        json={
                            "username": "Alice",
                            "email": email,
                            "password": "password",
                        },
                    )

                    self.assertEqual(response.status_code, 400)
                    self.assertEqual(
                        response.get_json(),
                        {"message": "Enter a valid email address"},
                    )
                    self.assertEqual(User.query.count(), 0)
                    self.assertEqual(Student.query.count(), 0)
                finally:
                    self.clear_accounts()

    def test_register_route_rejects_non_object_json(self):
        requests = (
            {"json": []},
            {"json": "registration"},
            {"data": "null", "content_type": "application/json"},
            {"data": "{", "content_type": "application/json"},
            {"data": '{"username": "Alice"}'},
        )

        for request_kwargs in requests:
            with self.subTest(request_kwargs=request_kwargs):
                response = self.client.post(
                    "/api/auth/register", **request_kwargs
                )

                self.assertEqual(response.status_code, 400)
                self.assertEqual(
                    response.get_json(),
                    {"message": "Request body must be a JSON object"},
                )
                self.assertEqual(User.query.count(), 0)
                self.assertEqual(Student.query.count(), 0)

    def test_register_route_returns_409_for_normalized_duplicate(self):
        AuthService.register_user("Alice", "alice@example.com", "password")

        response = self.client.post(
            "/api/auth/register",
            json={
                "username": "Another User",
                "email": "  ALICE@EXAMPLE.COM  ",
                "password": "password",
            },
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.get_json(), {"message": "Username or email already exists"}
        )
        self.assertEqual(User.query.count(), 1)
        self.assertEqual(Student.query.count(), 1)

    def test_register_route_persists_normalized_valid_input(self):
        response = self.client.post(
            "/api/auth/register",
            json={
                "username": "  Alice  ",
                "email": "  ALICE@Example.COM  ",
                "password": "password",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), {"message": "User created successfully"})
        user = User.query.one()
        self.assertEqual(user.username, "Alice")
        self.assertEqual(user.email, "alice@example.com")
        self.assertEqual(Student.query.count(), 1)
        self.assertIsNotNone(user.student)


if __name__ == "__main__":
    unittest.main()
