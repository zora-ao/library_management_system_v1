from dataclasses import replace
import hashlib
from pathlib import Path
import re
import tempfile
import unittest
import uuid
from unittest.mock import patch

from flask import Flask
from sqlalchemy import text

from app.extensions import db
from app.models import SystemSecurityState, User
from app.services.backup_envelope import BackupManifest, EnvelopePolicy, encrypt_backup
from app.services.backup_service import BackupCompatibilityError, BackupService
from app.services.postgres_tools import ToolCapabilities


PASSPHRASE = "service-test-passphrase"


class BackupServiceTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            BACKUP_MAX_BYTES=4 * 1024 * 1024,
            BACKUP_OPERATION_TIMEOUT_SECONDS=300,
            BACKUP_PG_BIN_DIR=None,
            BACKUP_SCRYPT_N=32768,
            BACKUP_SCRYPT_R=8,
            BACKUP_SCRYPT_P=1,
        )
        db.init_app(self.app)
        with self.app.app_context():
            db.create_all()
            db.session.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
            db.session.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:first), (:second)"),
                {"first": "f6d7e8a9b0c1", "second": "branch-head-2"},
            )
            db.session.add(SystemSecurityState(id=1, auth_epoch=str(uuid.uuid4())))
            db.session.add_all([
                User(
                    username="Backup Admin",
                    email="backup-admin@example.com",
                    password="correct-password",
                    role="admin",
                ),
                User(
                    username="Library Member",
                    email="member@example.com",
                    password="correct-password",
                    role="student",
                ),
            ])
            db.session.commit()
        self.tempdir = tempfile.TemporaryDirectory()
        self.workspace = Path(self.tempdir.name)

    def tearDown(self):
        self.tempdir.cleanup()
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @staticmethod
    def capabilities():
        return ToolCapabilities(
            available=True,
            pg_dump_version="17.5",
            pg_restore_version="17.5",
            server_version="17.4",
        )

    @patch("app.services.backup_service.check_capabilities")
    def test_capabilities_delegates_to_native_adapter(self, check):
        check.return_value = self.capabilities()
        with self.app.app_context():
            result = BackupService.capabilities()
        self.assertEqual(result, self.capabilities())
        check.assert_called_once()

    @patch("app.services.backup_service.check_capabilities")
    @patch("app.services.backup_service.create_custom_dump")
    def test_create_backup_builds_authenticated_live_manifest(self, create_dump, check):
        check.return_value = self.capabilities()
        dump_bytes = b"PGDMP-native-custom-archive"
        create_dump.side_effect = lambda _config, path: path.write_bytes(dump_bytes)

        with self.app.app_context():
            artifact = BackupService.create_backup(PASSPHRASE, self.workspace)

        self.assertTrue(artifact.path.exists())
        self.assertRegex(
            artifact.filename,
            r"^pahina-backup-\d{8}T\d{6}Z\.pahina-backup$",
        )
        self.assertEqual(artifact.manifest.application, "pahina-library")
        self.assertEqual(
            artifact.manifest.schema_revisions,
            ("branch-head-2", "f6d7e8a9b0c1"),
        )
        self.assertEqual(artifact.manifest.postgres_server_version, "17.4")
        self.assertEqual(artifact.manifest.postgres_client_version, "17.5")
        self.assertEqual(artifact.manifest.dump_bytes, len(dump_bytes))
        self.assertEqual(artifact.manifest.dump_sha256, hashlib.sha256(dump_bytes).hexdigest())
        self.assertEqual(artifact.manifest.table_counts["users"], 2)
        self.assertEqual(artifact.manifest.table_counts["books"], 0)
        self.assertEqual(artifact.manifest.active_admin_count, 1)
        self.assertEqual(
            artifact.file_digest,
            hashlib.sha256(artifact.path.read_bytes()).hexdigest(),
        )

    def write_encrypted(self, manifest: BackupManifest, name: str) -> Path:
        dump = self.workspace / f"{name}.dump"
        dump.write_bytes(b"PGDMP-valid")
        normalized = replace(
            manifest,
            dump_bytes=dump.stat().st_size,
            dump_sha256=hashlib.sha256(dump.read_bytes()).hexdigest(),
        )
        encrypted = self.workspace / f"{name}.pahina-backup"
        encrypt_backup(
            normalized,
            dump,
            encrypted,
            PASSPHRASE,
            EnvelopePolicy(max_bytes=4 * 1024 * 1024),
        )
        return encrypted

    def valid_manifest(self):
        return BackupManifest(
            format_version=1,
            application="pahina-library",
            created_at="2026-11-02T00:00:00Z",
            schema_revisions=("branch-head-2", "f6d7e8a9b0c1"),
            postgres_server_version="17.4",
            postgres_client_version="17.5",
            dump_sha256="0" * 64,
            dump_bytes=0,
            table_counts={"users": 2},
            active_admin_count=1,
        )

    @patch("app.services.backup_service.validate_custom_dump")
    def test_inspect_accepts_only_current_application_revision_and_admin_set(self, validate):
        valid = self.write_encrypted(self.valid_manifest(), "valid")
        with self.app.app_context():
            inspected = BackupService.inspect_backup(valid, PASSPHRASE, self.workspace)
        self.assertTrue(inspected.path.exists())
        self.assertEqual(inspected.manifest.application, "pahina-library")
        validate.assert_called_once()

        incompatible = [
            replace(self.valid_manifest(), application="another-application"),
            replace(self.valid_manifest(), schema_revisions=("old-revision",)),
            replace(self.valid_manifest(), active_admin_count=0),
        ]
        for index, manifest in enumerate(incompatible):
            encrypted = self.write_encrypted(manifest, f"incompatible-{index}")
            validate.reset_mock()
            with self.app.app_context(), self.subTest(index=index), self.assertRaises(
                BackupCompatibilityError
            ):
                BackupService.inspect_backup(encrypted, PASSPHRASE, self.workspace)
            validate.assert_not_called()

    @patch("app.services.backup_service.validate_custom_dump")
    @patch("app.services.backup_service.decrypt_backup")
    def test_inspect_rechecks_dump_digest_before_native_validation(self, decrypt, validate):
        encrypted = self.workspace / "digest-mismatch.pahina-backup"
        encrypted.write_bytes(b"encrypted-placeholder")
        manifest = self.valid_manifest()

        def fake_decrypt(_source, dump_path, _passphrase, _policy):
            dump_path.write_bytes(b"different dump")
            return replace(manifest, dump_bytes=14, dump_sha256="a" * 64)

        decrypt.side_effect = fake_decrypt
        with self.app.app_context(), self.assertRaises(BackupCompatibilityError):
            BackupService.inspect_backup(encrypted, PASSPHRASE, self.workspace)
        validate.assert_not_called()


if __name__ == "__main__":
    unittest.main()
