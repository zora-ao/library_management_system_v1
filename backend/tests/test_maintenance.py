import unittest
from unittest.mock import MagicMock, patch

from flask import Blueprint, Flask, jsonify

from app.extensions import db
from app.maintenance import exclusive_maintenance_lock, install_maintenance_guard


class MaintenanceGuardTests(unittest.TestCase):
    def make_app(self, enable_postgres_guard=True):
        app = Flask(__name__)
        app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(app)
        if enable_postgres_guard:
            app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://user:pass@db/library"

        backups = Blueprint("backups", __name__)

        @backups.post("/api/admin/backups/restore")
        def restore_backup():
            return jsonify({"restore": True})

        app.register_blueprint(backups)

        @app.get("/api/normal")
        def normal():
            return jsonify({"ok": True})

        @app.get("/outside-api")
        def outside_api():
            return jsonify({"ok": True})

        install_maintenance_guard(app)
        return app

    @patch("app.maintenance.db.session.execute")
    @patch("app.maintenance.db.session.get")
    def test_normal_api_request_requires_clear_flag_and_shared_lock(self, get_state, execute):
        get_state.return_value = MagicMock(maintenance_mode=False)
        execute.return_value.scalar.return_value = True
        client = self.make_app().test_client()

        response = client.get("/api/normal")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"ok": True})
        execute.assert_called_once()

    @patch("app.maintenance.db.session.execute")
    @patch("app.maintenance.db.session.get")
    def test_flag_or_lock_failure_returns_fail_closed_maintenance_response(self, get_state, execute):
        client = self.make_app().test_client()
        get_state.return_value = MagicMock(maintenance_mode=True)

        flagged = client.get("/api/normal")

        self.assertEqual(flagged.status_code, 503)
        self.assertEqual(flagged.headers["Retry-After"], "5")
        self.assertEqual(flagged.headers["Cache-Control"], "no-store")
        execute.assert_not_called()

        get_state.return_value = MagicMock(maintenance_mode=False)
        execute.return_value.scalar.return_value = False
        locked = client.get("/api/normal")
        self.assertEqual(locked.status_code, 503)

    @patch("app.maintenance.db.session.execute")
    @patch("app.maintenance.db.session.get")
    def test_restore_and_non_api_paths_bypass_shared_guard(self, get_state, execute):
        client = self.make_app().test_client()

        restore = client.post("/api/admin/backups/restore")
        outside = client.get("/outside-api")

        self.assertEqual(restore.status_code, 200)
        self.assertEqual(outside.status_code, 200)
        get_state.assert_not_called()
        execute.assert_not_called()

    @patch("app.maintenance.db.session.execute")
    @patch("app.maintenance.db.session.get")
    def test_non_postgresql_test_app_skips_advisory_guard(self, get_state, execute):
        response = self.make_app(enable_postgres_guard=False).test_client().get("/api/normal")

        self.assertEqual(response.status_code, 200)
        get_state.assert_not_called()
        execute.assert_not_called()

    @patch("app.maintenance.db.session.execute", side_effect=RuntimeError("database unavailable"))
    @patch("app.maintenance.db.session.get")
    def test_guard_errors_fail_closed_without_details(self, get_state, _execute):
        get_state.return_value = MagicMock(maintenance_mode=False)
        response = self.make_app().test_client().get("/api/normal")

        self.assertEqual(response.status_code, 503)
        self.assertNotIn("database unavailable", response.get_data(as_text=True))


class ExclusiveMaintenanceLockTests(unittest.TestCase):
    @patch("app.maintenance.psycopg2.connect")
    def test_exclusive_context_locks_unlocks_and_closes_on_success(self, connect):
        connection = connect.return_value
        cursor = connection.cursor.return_value

        with exclusive_maintenance_lock("postgresql://user:pass@db/library"):
            pass

        self.assertEqual(cursor.execute.call_count, 2)
        self.assertIn("pg_advisory_lock", cursor.execute.call_args_list[0].args[0])
        self.assertIn("pg_advisory_unlock", cursor.execute.call_args_list[1].args[0])
        connection.close.assert_called_once()

    @patch("app.maintenance.psycopg2.connect")
    def test_exclusive_context_unlocks_and_closes_after_exception(self, connect):
        connection = connect.return_value
        cursor = connection.cursor.return_value

        with self.assertRaisesRegex(RuntimeError, "restore failed"):
            with exclusive_maintenance_lock("postgresql://user:pass@db/library"):
                raise RuntimeError("restore failed")

        self.assertIn("pg_advisory_unlock", cursor.execute.call_args_list[-1].args[0])
        connection.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
