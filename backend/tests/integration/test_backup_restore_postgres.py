import os
from pathlib import Path
import tempfile
import unittest
import uuid

from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, jwt_required
from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError

from app.blueprints.backups.routes import backups_bp
from app.extensions import db
from app.maintenance import exclusive_maintenance_lock, install_maintenance_guard
from app.models import Book, Borrow, Category, Student, SystemSecurityState, User
from app.security_state import configure_jwt_security
from app.services.auth_service import AuthService
from app.services.backup_service import BackupService, InspectedBackup
from app.services.postgres_tools import (
    PostgresToolConfig,
    check_capabilities,
    create_custom_dump,
)


PASSPHRASE = "integration-recovery-passphrase"
REVISION = "f6d7e8a9b0c1"


class PostgresBackupRestoreIntegrationTests(unittest.TestCase):
    """Destructive tests. TEST_DATABASE_URL must point to a disposable database."""

    @classmethod
    def setUpClass(cls):
        database_url = os.getenv("TEST_DATABASE_URL")
        if not database_url:
            raise unittest.SkipTest("TEST_DATABASE_URL is not configured")

        parsed = make_url(database_url)
        if parsed.get_backend_name() not in ("postgresql", "postgres"):
            raise RuntimeError("TEST_DATABASE_URL must use PostgreSQL")
        if "test" not in (parsed.database or "").lower():
            raise RuntimeError(
                "Refusing destructive backup tests: database name must contain 'test'"
            )

        capabilities = check_capabilities(PostgresToolConfig(database_url))
        if not capabilities.available:
            if "not installed" in (capabilities.reason or ""):
                raise unittest.SkipTest(
                    f"PostgreSQL backup prerequisites unavailable: {capabilities.reason}"
                )
            raise RuntimeError(
                f"PostgreSQL backup prerequisites failed: {capabilities.reason}"
            )

        cls.database_url = database_url
        cls.app = Flask(__name__)
        cls.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI=database_url,
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            JWT_SECRET_KEY="integration-jwt-secret-at-least-thirty-two-bytes",
            BACKUP_TOKEN_SIGNING_KEY="integration-backup-token-key-separate-from-jwt",
            BACKUP_MAX_BYTES=16 * 1024 * 1024,
            BACKUP_OPERATION_TIMEOUT_SECONDS=120,
            BACKUP_SCRYPT_N=16384,
            BACKUP_SCRYPT_R=8,
            BACKUP_SCRYPT_P=1,
        )
        db.init_app(cls.app)
        jwt = JWTManager(cls.app)
        configure_jwt_security(jwt)
        cls.app.register_blueprint(backups_bp)

        @cls.app.get("/api/integration/probe")
        @jwt_required()
        def protected_probe():
            return jsonify({"ok": True})

        install_maintenance_guard(cls.app)

    def setUp(self):
        with self.app.app_context():
            db.session.remove()
            db.session.execute(text("DROP TABLE IF EXISTS alembic_version"))
            db.session.execute(text("DROP TABLE IF EXISTS backup_sequence_probe"))
            db.session.execute(text("DROP SEQUENCE IF EXISTS backup_restore_probe_seq"))
            db.session.commit()
            db.drop_all()
            db.create_all()
            db.session.execute(text(
                "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"
            ))
            db.session.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                {"revision": REVISION},
            )
            db.session.execute(text("CREATE SEQUENCE backup_restore_probe_seq START 7"))
            db.session.execute(text(
                "CREATE TABLE backup_sequence_probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL)"
            ))
            db.session.execute(text(
                "INSERT INTO backup_sequence_probe (id, value) "
                "VALUES (nextval('backup_restore_probe_seq'), 'before-backup')"
            ))
            db.session.add(SystemSecurityState(id=1, auth_epoch=str(uuid.uuid4())))
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()

    def _seed_graph(self):
        admin = User(
            username="Recovery Admin",
            email="recovery-admin@example.com",
            password="correct-password",
            role="admin",
        )
        student_user = User(
            username="Recovery Student",
            email="recovery-student@example.com",
            password="correct-password",
            role="student",
        )
        category = Category("Integration History")
        db.session.add_all([admin, student_user, category])
        db.session.flush()
        student = Student(
            user_id=student_user.id,
            student_number="REC-001",
            course="History",
            year_level="4",
        )
        book = Book(
            title="Recovery Proof",
            author="Pahina",
            isbn="RECOVERY-001",
            category_id=category.id,
        )
        db.session.add_all([student, book])
        db.session.flush()
        borrow = Borrow(
            user_id=student_user.id,
            book_id=book.id,
            status=Borrow.STATUS_BORROWED,
        )
        db.session.add(borrow)
        db.session.commit()
        return admin.id, student_user.id, category.id, book.id, borrow.id

    def test_export_mutate_restore_recovers_relations_sequence_index_and_revokes_jwt(self):
        with self.app.app_context(), tempfile.TemporaryDirectory() as workspace_name:
            ids = self._seed_graph()
            old_token = AuthService.issue_access_token(db.session.get(User, ids[0]))
            workspace = Path(workspace_name)
            artifact = BackupService.create_backup(PASSPHRASE, workspace)
            inspected_backup = BackupService.inspect_backup(
                artifact.path, PASSPHRASE, workspace
            )

            db.session.execute(text("UPDATE backup_sequence_probe SET value='mutated'"))
            db.session.execute(text("SELECT setval('backup_restore_probe_seq', 99, true)"))
            db.session.query(Borrow).delete()
            db.session.query(Book).delete()
            db.session.query(Category).delete()
            db.session.commit()

            BackupService.restore_backup(inspected_backup, artifact.file_digest)
            db.session.remove()

            admin_id, student_id, category_id, book_id, borrow_id = ids
            self.assertIsNotNone(db.session.get(User, admin_id))
            self.assertIsNotNone(Student.query.filter_by(user_id=student_id).one())
            self.assertEqual(db.session.get(Book, book_id).category_id, category_id)
            restored_borrow = db.session.get(Borrow, borrow_id)
            self.assertEqual(restored_borrow.user_id, student_id)
            self.assertEqual(restored_borrow.book_id, book_id)
            self.assertEqual(
                db.session.execute(text("SELECT value FROM backup_sequence_probe")).scalar_one(),
                "before-backup",
            )
            self.assertEqual(
                db.session.execute(text("SELECT nextval('backup_restore_probe_seq')")).scalar_one(),
                8,
            )
            self.assertTrue(any(
                index.get("unique")
                for index in inspect(db.engine).get_indexes("users")
            ) or inspect(db.engine).get_unique_constraints("users"))

            db.session.add(User(
                username="Duplicate Recovery Admin",
                email="recovery-admin@example.com",
                password="correct-password",
                role="admin",
            ))
            with self.assertRaises(IntegrityError):
                db.session.commit()
            db.session.rollback()

        response = self.app.test_client().get(
            "/api/integration/probe",
            headers={"Authorization": f"Bearer {old_token}"},
        )
        self.assertEqual(response.status_code, 401)

    def test_corrupt_archive_rolls_back_native_restore_and_clears_maintenance(self):
        with self.app.app_context(), tempfile.TemporaryDirectory() as workspace_name:
            self._seed_graph()
            invalid_path = Path(workspace_name) / "corrupt-after-toc.dump"
            create_custom_dump(BackupService._postgres_config(), invalid_path)
            archive = invalid_path.read_bytes()
            self.assertGreater(len(archive), 256)
            invalid_path.write_bytes(archive[:-128])
            db.session.execute(text("UPDATE backup_sequence_probe SET value='mutated'"))
            db.session.commit()
            inspected_backup = InspectedBackup(
                path=invalid_path,
                file_digest="f" * 64,
                manifest=None,  # type: ignore[arg-type]
            )
            with self.assertRaises(Exception):
                BackupService.restore_backup(inspected_backup, "f" * 64)
            db.session.remove()
            self.assertEqual(User.query.filter_by(email="recovery-admin@example.com").count(), 1)
            self.assertEqual(
                db.session.execute(text("SELECT value FROM backup_sequence_probe")).scalar_one(),
                "mutated",
            )
            state = db.session.get(SystemSecurityState, 1)
            self.assertFalse(state.maintenance_mode)
            self.assertIsNone(state.restore_started_at)

    def test_exclusive_restore_lock_returns_maintenance_response(self):
        with self.app.app_context():
            admin_id, *_ = self._seed_graph()
            token = AuthService.issue_access_token(db.session.get(User, admin_id))
        client = self.app.test_client()
        headers = {"Authorization": f"Bearer {token}"}

        with exclusive_maintenance_lock(self.database_url):
            response = client.get("/api/integration/probe", headers=headers)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.headers.get("Retry-After"), "5")
        self.assertEqual(client.get("/api/integration/probe", headers=headers).status_code, 200)


if __name__ == "__main__":
    unittest.main()
