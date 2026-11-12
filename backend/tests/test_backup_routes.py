import io
from pathlib import Path
import tempfile
import unittest
import uuid
from unittest.mock import patch

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.blueprints.backups.routes import backups_bp
from app.extensions import db
from app.models import SystemSecurityState, User
from app.services.backup_envelope import BackupManifest
from app.services.backup_service import BackupArtifact, InspectedBackup
from app.services.postgres_tools import ToolCapabilities


class BackupRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            JWT_SECRET_KEY="route-test-secret-that-is-at-least-thirty-two-bytes",
            BACKUP_TOKEN_SIGNING_KEY="route-backup-signing-key",
            BACKUP_MAX_BYTES=1024 * 1024,
            MAX_CONTENT_LENGTH=1024 * 1024 + 1024,
            BACKUP_RESTORE_TOKEN_MAX_AGE_SECONDS=900,
        )
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(backups_bp)
        with self.app.app_context():
            db.create_all()
            db.session.add(SystemSecurityState(id=1, auth_epoch=str(uuid.uuid4())))
            admin = User(
                username="Route Admin",
                email="route-admin@example.com",
                password="correct-password",
                role="admin",
            )
            librarian = User(
                username="Route Librarian",
                email="route-librarian@example.com",
                password="correct-password",
                role="librarian",
            )
            db.session.add_all([admin, librarian])
            db.session.commit()
            self.admin_id = admin.id
            self.admin_token = create_access_token(
                identity=str(admin.id), additional_claims={"role": "admin"}
            )
            self.librarian_token = create_access_token(
                identity=str(librarian.id), additional_claims={"role": "librarian"}
            )
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @staticmethod
    def manifest():
        return BackupManifest(
            format_version=1,
            application="pahina-library",
            created_at="2026-11-02T00:00:00Z",
            schema_revisions=("f6d7e8a9b0c1",),
            postgres_server_version="17.4",
            postgres_client_version="17.5",
            dump_sha256="a" * 64,
            dump_bytes=10,
            table_counts={"users": 2},
            active_admin_count=1,
        )

    def headers(self, token=None):
        return {"Authorization": f"Bearer {token or self.admin_token}"}

    @patch("app.blueprints.backups.routes.BackupService.capabilities")
    def test_capabilities_are_admin_only_and_never_cached(self, capabilities):
        capabilities.return_value = ToolCapabilities(
            available=True,
            pg_dump_version="17.5",
            pg_restore_version="17.5",
            server_version="17.4",
        )
        missing = self.client.get("/api/admin/backups/capabilities")
        librarian = self.client.get(
            "/api/admin/backups/capabilities", headers=self.headers(self.librarian_token)
        )
        admin = self.client.get(
            "/api/admin/backups/capabilities", headers=self.headers()
        )
        self.assertEqual(missing.status_code, 401)
        self.assertEqual(librarian.status_code, 403)
        self.assertEqual(admin.status_code, 200)
        self.assertEqual(admin.headers["Cache-Control"], "no-store")
        self.assertTrue(admin.get_json()["available"])

    def test_oversized_multipart_is_rejected_before_upload_parsing(self):
        response = self.client.post(
            "/api/admin/backups/inspect",
            headers=self.headers(),
            data=b"x" * (1024 * 1024 + 2048),
        )
        self.assertEqual(response.status_code, 413)

    @patch("app.blueprints.backups.routes.verify_step_up")
    @patch("app.blueprints.backups.routes.BackupService.create_backup")
    def test_export_streams_attachment_and_cleans_workspace(self, create, step_up):
        created_path = None

        def create_artifact(_passphrase, workspace):
            nonlocal created_path
            created_path = Path(workspace) / "pahina-backup-test.pahina-backup"
            created_path.write_bytes(b"encrypted-backup")
            return BackupArtifact(
                path=created_path,
                file_digest="b" * 64,
                filename=created_path.name,
                manifest=self.manifest(),
            )

        create.side_effect = create_artifact
        response = self.client.post(
            "/api/admin/backups/export",
            headers=self.headers(),
            json={
                "passphrase": "long-enough-passphrase",
                "confirm_passphrase": "long-enough-passphrase",
                "step_up": {"method": "password", "credential": "correct-password"},
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, b"encrypted-backup")
        self.assertIn("attachment", response.headers["Content-Disposition"])
        self.assertNotIn("X-Backup-Safety-Token", response.headers)
        response.close()
        self.assertIsNotNone(created_path)
        self.assertFalse(created_path.exists())
        step_up.assert_called_once()

    @patch("app.blueprints.backups.routes.BackupService.inspect_backup")
    def test_inspect_returns_authenticated_metadata_and_restore_token(self, inspect):
        inspect.return_value = InspectedBackup(
            path=Path("inspected.dump"),
            file_digest="c" * 64,
            manifest=self.manifest(),
        )
        response = self.client.post(
            "/api/admin/backups/inspect",
            headers=self.headers(),
            data={
                "passphrase": "long-enough-passphrase",
                "backup": (io.BytesIO(b"encrypted"), "selected.pahina-backup"),
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["manifest"]["application"], "pahina-library")
        self.assertTrue(body["restore_token"])

    @patch("app.blueprints.backups.routes.BackupService.restore_backup")
    @patch("app.blueprints.backups.routes.verify_step_up")
    @patch("app.blueprints.backups.routes.BackupService.inspect_backup")
    def test_restore_requires_confirmation_and_bound_restore_token(self, inspect, step_up, restore):
        inspected = InspectedBackup(
            path=Path("inspected.dump"),
            file_digest="d" * 64,
            manifest=self.manifest(),
        )
        inspect.return_value = inspected
        with self.app.app_context():
            from app.services.backup_security import issue_operation_token
            restore_token = issue_operation_token("restore", self.admin_id, inspected.file_digest)

        # No fresh safety download is needed before restoring.
        response = self.client.post(
            "/api/admin/backups/restore",
            headers=self.headers(),
            data={
                "backup": (io.BytesIO(b"encrypted"), "selected.pahina-backup"),
                "passphrase": "long-enough-passphrase",
                "restore_token": restore_token,
                "confirmation": "RESTORE DATABASE",
                "step_up_method": "password",
                "step_up_credential": "correct-password",
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(response.status_code, 200)
        restore.assert_called_once_with(inspected, inspected.file_digest)
        step_up.assert_called_once()

        restore.reset_mock()
        rejected = self.client.post(
            "/api/admin/backups/restore",
            headers=self.headers(),
            data={
                "backup": (io.BytesIO(b"encrypted"), "selected.pahina-backup"),
                "passphrase": "long-enough-passphrase",
                "restore_token": restore_token,
                "confirmation": "restore",
                "step_up_method": "password",
                "step_up_credential": "correct-password",
            },
            content_type="multipart/form-data",
        )
        self.assertEqual(rejected.status_code, 400)
        restore.assert_not_called()


if __name__ == "__main__":
    unittest.main()
