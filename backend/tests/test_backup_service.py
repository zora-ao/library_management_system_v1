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
            BACKUP_PG_COMPRESSION_LEVEL="1",
            BACKUP_PG_BIN_DIR=None,
            BACKUP_SCRYPT_N=32768,
            BACKUP_SCRYPT_R=8,
            BACKUP_SCRYPT_P=1,
            BACKUP_TOKEN_SIGNING_KEY="backup-service-signing-key",
            JWT_SECRET_KEY="different-jwt-signing-key",
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

    def test_postgres_config_propagates_compression_level(self):
        with self.app.app_context():
            self.app.config["BACKUP_PG_COMPRESSION_LEVEL"] = "0"

            config = BackupService._postgres_config()

        self.assertEqual(getattr(config, "compression_level", None), "0")

    @patch("app.services.backup_service.check_capabilities")
    def test_capabilities_require_a_separate_backup_signing_key(self, check):
        with self.app.app_context():
            self.app.config["BACKUP_TOKEN_SIGNING_KEY"] = None
            self.assertFalse(BackupService.capabilities().available)
            self.app.config["BACKUP_TOKEN_SIGNING_KEY"] = self.app.config["JWT_SECRET_KEY"]
            self.assertFalse(BackupService.capabilities().available)
        check.assert_not_called()

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

    @patch("app.services.backup_service.check_capabilities")
    @patch("app.services.backup_service.create_custom_dump")
    @patch("app.services.backup_service.time", create=True)
    def test_create_backup_logs_phase_timings_without_secrets(
        self,
        clock,
        create_dump,
        check,
    ):
        clock.perf_counter.side_effect = (0.0, 0.1, 0.5, 0.6, 0.9)
        check.return_value = self.capabilities()
        create_dump.side_effect = lambda _config, path: path.write_bytes(
            b"PGDMP-timed-archive"
        )

        with self.app.app_context(), self.assertLogs(
            self.app.logger,
            level="INFO",
        ) as captured:
            BackupService.create_backup(PASSPHRASE, self.workspace)

        timing_records = [
            record
            for record in captured.records
            if getattr(record, "event", None) == "backup_creation_timing"
        ]
        self.assertEqual(len(timing_records), 1)
        timing_record = timing_records[0]
        self.assertEqual(
            {
                field: getattr(timing_record, field)
                for field in (
                    "event",
                    "metadata_before_ms",
                    "native_dump_ms",
                    "metadata_after_ms",
                    "encryption_ms",
                    "total_ms",
                )
            },
            {
                "event": "backup_creation_timing",
                "metadata_before_ms": 100,
                "native_dump_ms": 400,
                "metadata_after_ms": 100,
                "encryption_ms": 300,
                "total_ms": 900,
            },
        )
        formatted_output = "\n".join(captured.output)
        self.assertIn("metadata_before_ms=100", formatted_output)
        self.assertIn("native_dump_ms=400", formatted_output)
        self.assertIn("metadata_after_ms=100", formatted_output)
        self.assertIn("encryption_ms=300", formatted_output)
        self.assertIn("total_ms=900", formatted_output)
        self.assertNotIn(PASSPHRASE, formatted_output)

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

    @patch("app.services.backup_service.finalize_restore_security")
    @patch("app.services.backup_service.restore_custom_dump")
    @patch("app.services.backup_service.exclusive_maintenance_lock")
    @patch("app.services.backup_service.begin_restore_maintenance")
    def test_restore_sets_maintenance_then_restores_and_finalizes(
        self, begin, exclusive, restore, finalize
    ):
        inspected = type("Inspected", (), {
            "path": self.workspace / "ready.dump",
            "file_digest": "f" * 64,
        })()
        with self.app.app_context():
            BackupService.restore_backup(inspected, "f" * 64)
        begin.assert_called_once()
        exclusive.assert_called_once()
        restore.assert_called_once()
        finalize.assert_called_once()

    @patch("app.services.backup_service.clear_restore_maintenance")
    @patch("app.services.backup_service.restore_custom_dump", side_effect=RuntimeError("native failed"))
    @patch("app.services.backup_service.exclusive_maintenance_lock")
    @patch("app.services.backup_service.begin_restore_maintenance")
    def test_native_failure_clears_maintenance(
        self, _begin, _exclusive, _restore, clear
    ):
        inspected = type("Inspected", (), {
            "path": self.workspace / "ready.dump",
            "file_digest": "f" * 64,
        })()
        with self.app.app_context(), self.assertRaisesRegex(RuntimeError, "native failed"):
            BackupService.restore_backup(inspected, "f" * 64)
        clear.assert_called_once()

    @patch("app.services.backup_service.clear_restore_maintenance")
    @patch("app.services.backup_service.finalize_restore_security", side_effect=RuntimeError("finalize failed"))
    @patch("app.services.backup_service.restore_custom_dump")
    @patch("app.services.backup_service.exclusive_maintenance_lock")
    @patch("app.services.backup_service.begin_restore_maintenance")
    def test_finalization_failure_stays_fail_closed(
        self, _begin, _exclusive, _restore, _finalize, clear
    ):
        inspected = type("Inspected", (), {
            "path": self.workspace / "ready.dump",
            "file_digest": "f" * 64,
        })()
        with self.app.app_context(), self.assertRaisesRegex(RuntimeError, "finalize failed"):
            BackupService.restore_backup(inspected, "f" * 64)
        clear.assert_not_called()


if __name__ == "__main__":
    unittest.main()
