import unittest
import uuid
from unittest.mock import patch

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.blueprints.dsa.routes import dsa_bp


class DsaRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(TESTING=True, JWT_SECRET_KEY="test-secret")
        JWTManager(self.app)
        self.app.register_blueprint(dsa_bp)
        with self.app.app_context():
            self.tokens = {
                role: create_access_token(
                    identity=str(uuid.uuid4()),
                    additional_claims={"role": role},
                )
                for role in ("admin", "librarian", "student")
            }
        self.client = self.app.test_client()

    def headers(self, role):
        return {"Authorization": f"Bearer {self.tokens[role]}"}

    @staticmethod
    def success_response(operation):
        return {
            "operation": operation,
            "dataset": {"source": "active_books", "size": 0},
            "results": [],
            "runs": [],
            "notes": [],
        }

    @patch("app.blueprints.dsa.routes.DsaDemoService.run")
    def test_endpoint_requires_backend_staff_authorization(self, run):
        payload = {
            "operation": "merge_sort",
            "field": "title",
            "direction": "asc",
            "limit": 25,
        }
        run.return_value = self.success_response("merge_sort")

        unauthenticated = self.client.post("/api/dsa/books/run", json=payload)
        student = self.client.post(
            "/api/dsa/books/run",
            json=payload,
            headers=self.headers("student"),
        )
        admin = self.client.post(
            "/api/dsa/books/run",
            json=payload,
            headers=self.headers("admin"),
        )
        librarian = self.client.post(
            "/api/dsa/books/run",
            json=payload,
            headers=self.headers("librarian"),
        )

        self.assertEqual(unauthenticated.status_code, 401)
        self.assertEqual(student.status_code, 403)
        self.assertEqual(admin.status_code, 200)
        self.assertEqual(librarian.status_code, 200)
        self.assertEqual(run.call_count, 2)

    @patch("app.blueprints.dsa.routes.DsaDemoService.run")
    def test_valid_payloads_are_normalized_and_forwarded(self, run):
        valid_payloads = (
            {
                "operation": "linear_contains",
                "query": "clean",
                "fields": ["title", "author", "isbn"],
                "limit": 20,
            },
            {
                "operation": "search_compare",
                "query": "Clean Code",
                "field": "title",
                "limit": 20,
            },
            {
                "operation": "merge_sort",
                "field": "available_copies",
                "direction": "desc",
                "limit": 20,
            },
            {"operation": "hash_compare", "query": "978-0-13", "limit": 20},
            {
                "operation": "bst_range",
                "range_start": "A",
                "range_end": "Mzzzz",
                "limit": 20,
            },
        )

        for payload in valid_payloads:
            run.reset_mock()
            run.return_value = self.success_response(payload["operation"])
            response = self.client.post(
                "/api/dsa/books/run",
                json=payload,
                headers=self.headers("librarian"),
            )
            with self.subTest(operation=payload["operation"]):
                self.assertEqual(response.status_code, 200)
                run.assert_called_once_with(payload["operation"], payload)

    @patch("app.blueprints.dsa.routes.DsaDemoService.run")
    def test_non_object_and_unknown_operations_are_rejected_before_service(self, run):
        invalid_bodies = (
            [],
            "merge_sort",
            None,
            {},
            {"operation": "quick_sort", "limit": 25},
        )

        for body in invalid_bodies:
            with self.subTest(body=body):
                response = self.client.post(
                    "/api/dsa/books/run",
                    json=body,
                    headers=self.headers("admin"),
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn("message", response.get_json())
        run.assert_not_called()

    @patch("app.blueprints.dsa.routes.DsaDemoService.run")
    def test_missing_blank_and_unknown_operation_fields_are_rejected(self, run):
        invalid_payloads = (
            {"operation": "linear_contains", "query": " ", "fields": ["title"]},
            {"operation": "linear_contains", "query": "clean", "fields": []},
            {"operation": "linear_contains", "query": "clean", "fields": ["summary"]},
            {"operation": "search_compare", "query": "clean", "field": "isbn"},
            {"operation": "search_compare", "query": " ", "field": "title"},
            {"operation": "merge_sort", "field": "isbn", "direction": "asc"},
            {"operation": "merge_sort", "field": "title", "direction": "sideways"},
            {"operation": "hash_compare", "query": " -- "},
            {"operation": "bst_range", "range_start": "", "range_end": "M"},
            {"operation": "bst_range", "range_start": "Z", "range_end": "A"},
        )

        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                response = self.client.post(
                    "/api/dsa/books/run",
                    json=payload,
                    headers=self.headers("admin"),
                )
                self.assertEqual(response.status_code, 400)
        run.assert_not_called()

    @patch("app.blueprints.dsa.routes.DsaDemoService.run")
    def test_search_fields_reject_duplicates_and_more_than_three(self, run):
        invalid_fields = (
            ["title", "title"],
            ["title", "author", "isbn", "title"],
        )

        for fields in invalid_fields:
            response = self.client.post(
                "/api/dsa/books/run",
                json={
                    "operation": "linear_contains",
                    "query": "clean",
                    "fields": fields,
                },
                headers=self.headers("admin"),
            )
            with self.subTest(fields=fields):
                self.assertEqual(response.status_code, 400)
        run.assert_not_called()

    @patch("app.blueprints.dsa.routes.DsaDemoService.run")
    def test_overlong_text_and_invalid_limits_are_rejected_before_service(self, run):
        overlong = "x" * 201
        invalid_payloads = [
            {"operation": "hash_compare", "query": overlong},
            {"operation": "bst_range", "range_start": "A", "range_end": overlong},
        ]
        for limit in (0, 101, True, 1.5, "10"):
            invalid_payloads.append(
                {
                    "operation": "merge_sort",
                    "field": "title",
                    "direction": "asc",
                    "limit": limit,
                }
            )

        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                response = self.client.post(
                    "/api/dsa/books/run",
                    json=payload,
                    headers=self.headers("admin"),
                )
                self.assertEqual(response.status_code, 400)
        run.assert_not_called()

    @patch("app.blueprints.dsa.routes.DsaDemoService.run")
    def test_service_value_errors_map_to_400_and_other_errors_stay_generic(self, run):
        payload = {
            "operation": "merge_sort",
            "field": "title",
            "direction": "asc",
            "limit": 25,
        }
        run.side_effect = ValueError("bad input")
        invalid = self.client.post(
            "/api/dsa/books/run",
            json=payload,
            headers=self.headers("admin"),
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.get_json(), {"message": "bad input"})

        run.side_effect = RuntimeError("database secret")
        failed = self.client.post(
            "/api/dsa/books/run",
            json=payload,
            headers=self.headers("admin"),
        )
        self.assertEqual(failed.status_code, 500)
        self.assertEqual(failed.get_json(), {"message": "Unable to run DSA operation"})
        self.assertNotIn("secret", failed.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
