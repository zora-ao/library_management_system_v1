import logging
import unittest
import uuid
from unittest.mock import patch

from flask_jwt_extended import create_access_token

import app as app_package
from app import create_app
from app.extensions import db
from app.models import Book, User
from app.rate_limits import limiter

# create_app() reads the Config class bound in the app package. Another test
# reloads app.config, after which app.config.Config is a *different* class, so
# patching it would silently leave the real DATABASE_URL in place.
config_module = app_package


def assert_test_database(flask_app):
    # These tests create and drop every table. Refuse to run against anything
    # but a throwaway in-memory SQLite database.
    uri = flask_app.config.get("SQLALCHEMY_DATABASE_URI")
    if uri != "sqlite://":
        raise RuntimeError(f"Refusing to run destructive tests against {uri!r}")


class HardenedAppTestCase(unittest.TestCase):
    def setUp(self):
        with patch.object(config_module.Config, "SQLALCHEMY_DATABASE_URI", "sqlite://"), \
                patch.object(config_module.Config, "JWT_SECRET_KEY", "test-secret-key-that-is-long-enough"):
            self.app = create_app()
        assert_test_database(self.app)
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        limiter.reset()
        self.client = self.app.test_client()
        logging.disable(logging.CRITICAL)

    def tearDown(self):
        logging.disable(logging.NOTSET)
        limiter.reset()
        db.session.remove()
        assert_test_database(self.app)
        db.drop_all()
        db.engine.dispose()
        self.context.pop()


class ErrorDetailTests(HardenedAppTestCase):
    def test_database_errors_do_not_expose_sql_to_clients(self):
        with patch("app.blueprints.books.routes.BookService.get_paginated_books") as books:
            from sqlalchemy.exc import OperationalError

            books.side_effect = OperationalError("SELECT secret FROM books", {}, Exception("boom"))
            response = self.client.get("/api/books")

        body = response.get_json()
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("error", body)
        self.assertNotIn("SELECT", response.get_data(as_text=True))

    def test_unexpected_route_errors_return_generic_messages(self):
        user = User("Ana Cruz", "ana@example.com", password="password123")
        db.session.add(user)
        db.session.commit()
        with patch("app.blueprints.auth.routes.AuthService.login_user") as login:
            login.side_effect = RuntimeError("connection string postgres://secret")
            response = self.client.post(
                "/api/auth/login", json={"email": "ana@example.com", "password": "password123"}
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"message": "Failed to login user"})


class InputValidationTests(HardenedAppTestCase):
    def test_book_list_rejects_malformed_category_ids(self):
        response = self.client.get("/api/books?category_id=abc")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json(), {"message": "Invalid category ID"})

    def test_book_list_caps_page_size_and_clamps_bad_pages(self):
        db.session.add_all([Book(f"Book {i:03}", "Author") for i in range(120)])
        db.session.commit()

        huge = self.client.get("/api/books?limit=100000").get_json()
        tiny = self.client.get("/api/books?limit=-5&page=-3").get_json()
        default = self.client.get("/api/books?limit=0").get_json()

        self.assertEqual(huge["pagination"]["per_page"], 100)
        self.assertEqual(len(huge["books"]), 100)
        self.assertTrue(huge["pagination"]["has_next"])
        self.assertEqual(tiny["pagination"]["per_page"], 1)
        self.assertEqual(tiny["pagination"]["current_page"], 1)
        self.assertEqual(default["pagination"]["per_page"], 10)

    def test_login_rejects_non_string_credentials(self):
        for payload in ({"email": 5, "password": "x"}, {"email": "a@b.com", "password": 5}, [1, 2], None):
            with self.subTest(payload=payload):
                response = self.client.post("/api/auth/login", json=payload)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json(), {"message": "Email and password required"})

    def test_google_login_without_a_body_or_token_is_a_bad_request(self):
        no_body = self.client.post("/api/auth/google")
        bad_token = self.client.post("/api/auth/google", json={"token": 123})

        self.assertEqual(no_body.status_code, 400)
        self.assertEqual(bad_token.status_code, 400)

    def test_password_change_rejects_non_object_bodies(self):
        user = User("Ana Cruz", "ana@example.com", password="password123")
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity=str(user.id), additional_claims={"role": "student"})
        with patch("app.security_state._security_state") as state:
            state.return_value.auth_epoch = None
            response = self.client.put(
                "/api/users/me/password", json=[1, 2], headers={"Authorization": f"Bearer {token}"}
            )

        self.assertEqual(response.status_code, 400)


class RateLimitTests(HardenedAppTestCase):
    def login(self, email, password="wrong-password", ip="203.0.113.10"):
        return self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
            environ_base={"REMOTE_ADDR": ip},
        )

    def test_repeated_failed_logins_for_one_account_are_throttled(self):
        responses = [self.login("ana@example.com", ip=f"203.0.113.{n}") for n in range(6)]

        self.assertEqual([r.status_code for r in responses[:5]], [400] * 5)
        self.assertEqual(responses[5].status_code, 429)
        self.assertEqual(
            responses[5].get_json(),
            {"message": "Too many attempts. Please wait a minute and try again."},
        )
        self.assertIn("Retry-After", responses[5].headers)

    def test_one_throttled_account_does_not_block_other_accounts(self):
        for _ in range(6):
            self.login("ana@example.com")

        other = self.login("ben@example.com")

        self.assertEqual(other.status_code, 400)

    def test_one_ip_spraying_many_accounts_is_throttled(self):
        statuses = [self.login(f"user{n}@example.com").status_code for n in range(21)]

        self.assertEqual(statuses[:20], [400] * 20)
        self.assertEqual(statuses[20], 429)

    def test_registration_is_throttled_per_ip(self):
        statuses = [
            self.client.post(
                "/api/auth/register",
                json={"username": f"user{n}", "email": f"user{n}@example.com", "password": "short"},
                environ_base={"REMOTE_ADDR": "198.51.100.7"},
            ).status_code
            for n in range(6)
        ]

        self.assertEqual(statuses[:5], [400] * 5)
        self.assertEqual(statuses[5], 429)

    def test_rate_limits_can_be_disabled_by_config(self):
        with patch.object(config_module.Config, "SQLALCHEMY_DATABASE_URI", "sqlite://"), \
                patch.object(config_module.Config, "JWT_SECRET_KEY", "test-secret-key-that-is-long-enough"), \
                patch.object(config_module.Config, "RATELIMIT_ENABLED", False):
            unlimited_app = create_app()
        assert_test_database(unlimited_app)
        client = unlimited_app.test_client()
        with unlimited_app.app_context():
            db.create_all()
            statuses = [
                client.post("/api/auth/login", json={"email": "ana@example.com", "password": "x"}).status_code
                for _ in range(7)
            ]

        self.assertNotIn(429, statuses)


class ProxyTrustTests(unittest.TestCase):
    def build_app(self, proxies):
        with patch.object(config_module.Config, "SQLALCHEMY_DATABASE_URI", "sqlite://"), \
                patch.object(config_module.Config, "JWT_SECRET_KEY", "test-secret-key-that-is-long-enough"), \
                patch.object(config_module.Config, "TRUSTED_PROXY_COUNT", proxies):
            return create_app()

    def remote_addr_seen(self, flask_app, forwarded_for):
        seen = {}

        @flask_app.get("/__probe")
        def probe():
            from flask import request

            seen["ip"] = request.remote_addr
            return ""

        flask_app.test_client().get(
            "/__probe",
            headers={"X-Forwarded-For": forwarded_for},
            environ_base={"REMOTE_ADDR": "10.0.0.1"},
        )
        return seen["ip"]

    def test_client_ip_comes_from_the_trusted_proxy_hop_only(self):
        behind_render = self.build_app(1)
        direct = self.build_app(0)

        self.assertEqual(self.remote_addr_seen(behind_render, "1.1.1.1, 203.0.113.9"), "203.0.113.9")
        self.assertEqual(self.remote_addr_seen(direct, "203.0.113.9"), "10.0.0.1")


if __name__ == "__main__":
    unittest.main()


class HealthCheckTests(HardenedAppTestCase):
    def test_health_check_answers_without_touching_the_database(self):
        from sqlalchemy import event

        statements = []
        listener = lambda *args, **kwargs: statements.append(args[2])
        event.listen(db.engine, "before_cursor_execute", listener)
        try:
            get_response = self.client.get("/health")
            head_response = self.client.head("/health")
        finally:
            event.remove(db.engine, "before_cursor_execute", listener)

        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.get_json(), {"status": "ok"})
        self.assertEqual(head_response.status_code, 200)
        self.assertEqual(statements, [])
