import json
import unittest
import uuid
from unittest.mock import patch

from sqlalchemy import text

import app as app_module
from app import create_app
from app.extensions import db
from app.models import SystemSecurityState, User
from app.services.auth_service import AuthService


class PerformanceDiagnosticsTests(unittest.TestCase):
    def dispose_app_database(self, flask_app):
        with flask_app.app_context():
            db.session.remove()
            db.engine.dispose()

    def test_opt_in_diagnostics_log_request_database_and_query_timings(self):
        with patch.object(
            app_module.Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:"
        ), patch.object(
            app_module.Config, "JWT_SECRET_KEY", "test-secret"
        ), patch.object(
            app_module.Config, "PERFORMANCE_DIAGNOSTICS", True, create=True
        ):
            flask_app = create_app()

        flask_app.config["TESTING"] = True
        self.addCleanup(self.dispose_app_database, flask_app)

        @flask_app.get("/performance-probe")
        def performance_probe():
            db.session.execute(text("SELECT 1")).scalar()
            return {"ok": True}

        with self.assertLogs(flask_app.logger, level="INFO") as captured:
            response = flask_app.test_client().get("/performance-probe")

        self.assertEqual(response.status_code, 200)
        performance_messages = [
            message.split("PERF ", 1)[1]
            for message in captured.output
            if "PERF " in message
        ]
        self.assertEqual(len(performance_messages), 1)

        metrics = json.loads(performance_messages[0])
        self.assertEqual(metrics["method"], "GET")
        self.assertEqual(metrics["path"], "/performance-probe")
        self.assertEqual(metrics["status"], 200)
        self.assertEqual(metrics["query_count"], 1)
        self.assertEqual(metrics["db_checkout_count"], 1)
        self.assertGreaterEqual(metrics["total_ms"], metrics["db_query_ms"])
        self.assertNotIn("parameters", metrics)

    def test_diagnostics_include_database_backed_authentication_time(self):
        with patch.object(
            app_module.Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:"
        ), patch.object(
            app_module.Config,
            "JWT_SECRET_KEY",
            "test-secret-that-is-at-least-thirty-two-bytes",
        ), patch.object(
            app_module.Config, "PERFORMANCE_DIAGNOSTICS", True, create=True
        ):
            flask_app = create_app()

        flask_app.config["TESTING"] = True
        self.addCleanup(self.dispose_app_database, flask_app)
        with flask_app.app_context():
            db.create_all()
            db.session.add(
                SystemSecurityState(id=1, auth_epoch=str(uuid.uuid4()))
            )
            user = User(
                username="Performance User",
                email="performance@example.com",
                password="correct-password",
            )
            db.session.add(user)
            db.session.commit()
            token = AuthService.issue_access_token(user)

        with self.assertLogs(flask_app.logger, level="INFO") as captured:
            response = flask_app.test_client().get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200)
        performance_message = next(
            message.split("PERF ", 1)[1]
            for message in captured.output
            if "PERF " in message
        )
        metrics = json.loads(performance_message)
        self.assertGreater(metrics["auth_ms"], 0)


if __name__ == "__main__":
    unittest.main()
