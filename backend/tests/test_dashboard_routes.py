import unittest
import uuid
from unittest.mock import patch

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.blueprints.dashboard.routes import dashboard_bp


class DashboardRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(TESTING=True, JWT_SECRET_KEY="test-secret")
        JWTManager(self.app)
        self.app.register_blueprint(dashboard_bp)
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

    @patch("app.blueprints.dashboard.routes.DashboardService.get_summary")
    def test_admin_receives_user_total_and_browser_offset_is_forwarded(self, get_summary):
        get_summary.return_value = {"total_users": 12, "attention": [], "recent": [], "activity": []}

        response = self.client.get(
            "/api/dashboard?timezone_offset_minutes=-480&timezone=Asia%2FManila",
            headers=self.headers("admin"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["total_users"], 12)
        get_summary.assert_called_once_with(
            include_user_count=True,
            timezone_offset_minutes=-480,
            timezone_name="Asia/Manila",
        )

    @patch("app.blueprints.dashboard.routes.DashboardService.get_summary")
    def test_librarian_response_does_not_include_user_total(self, get_summary):
        get_summary.return_value = {"attention": [], "recent": [], "activity": []}

        response = self.client.get(
            "/api/dashboard",
            headers=self.headers("librarian"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("total_users", response.get_json())
        get_summary.assert_called_once_with(
            include_user_count=False,
            timezone_offset_minutes=0,
            timezone_name=None,
        )

    @patch("app.blueprints.dashboard.routes.DashboardService.get_summary")
    def test_student_is_denied_without_loading_dashboard(self, get_summary):
        response = self.client.get(
            "/api/dashboard",
            headers=self.headers("student"),
        )

        self.assertEqual(response.status_code, 403)
        get_summary.assert_not_called()

    @patch("app.blueprints.dashboard.routes.DashboardService.get_summary")
    def test_invalid_timezone_offsets_are_rejected(self, get_summary):
        for query in (
            "timezone_offset_minutes=not-a-number",
            "timezone_offset_minutes=841",
            "timezone_offset_minutes=-841",
            "timezone_offset_minutes=0&timezone=Not%2FA_Real_Zone",
            "timezone_offset_minutes=0&timezone=%2Fetc%2Fpasswd",
        ):
            with self.subTest(query=query):
                response = self.client.get(
                    f"/api/dashboard?{query}",
                    headers=self.headers("admin"),
                )
                self.assertEqual(response.status_code, 400)
        get_summary.assert_not_called()


if __name__ == "__main__":
    unittest.main()
