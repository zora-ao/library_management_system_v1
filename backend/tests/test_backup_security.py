import unittest
import uuid
from unittest.mock import patch

from flask import Flask
from app.extensions import db
from app.models import SystemSecurityState, User
from app.services.backup_security import (
    StepUpProof,
    issue_operation_token,
    verify_operation_token,
    verify_step_up,
)


class BackupSecurityTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            BACKUP_TOKEN_SIGNING_KEY="backup-test-signing-key-that-is-separate",
        )
        db.init_app(self.app)

        with self.app.app_context():
            db.create_all()
            db.session.add(SystemSecurityState(id=1, auth_epoch=str(uuid.uuid4())))
            password_admin = User(
                username="Password Admin",
                email="password-admin@example.com",
                password="correct-password",
                role="admin",
            )
            google_admin = User(
                username="Google Admin",
                email="google-admin@example.com",
                role="admin",
                google_id="google-subject-1",
            )
            librarian = User(
                username="Library Staff",
                email="librarian@example.com",
                password="correct-password",
                role="librarian",
            )
            db.session.add_all([password_admin, google_admin, librarian])
            db.session.commit()
            self.password_admin_id = password_admin.id
            self.google_admin_id = google_admin.id
            self.librarian_id = librarian.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_password_step_up_accepts_only_current_admin_password(self):
        with self.app.app_context():
            user = verify_step_up(
                self.password_admin_id,
                StepUpProof(method="password", credential="correct-password"),
            )
            self.assertEqual(user.id, self.password_admin_id)

            with self.assertRaisesRegex(ValueError, "Step-up authentication failed"):
                verify_step_up(
                    self.password_admin_id,
                    StepUpProof(method="password", credential="wrong-password"),
                )

    @patch("app.services.backup_security.AuthService.verify_google_credential")
    def test_google_step_up_matches_existing_identity_without_mutation(self, verify_google):
        verify_google.return_value = {
            "sub": "google-subject-1",
            "email": "google-admin@example.com",
            "email_verified": True,
        }

        with self.app.app_context():
            user = verify_step_up(
                self.google_admin_id,
                StepUpProof(method="google", credential="fresh-google-token"),
            )
            self.assertEqual(user.id, self.google_admin_id)
            self.assertEqual(user.google_id, "google-subject-1")

        verify_google.assert_called_once_with("fresh-google-token")

    @patch("app.services.backup_security.AuthService.verify_google_credential")
    def test_google_step_up_rejects_another_google_identity(self, verify_google):
        verify_google.return_value = {
            "sub": "another-subject",
            "email": "google-admin@example.com",
            "email_verified": True,
        }

        with self.app.app_context(), self.assertRaisesRegex(
            ValueError, "Step-up authentication failed"
        ):
            verify_step_up(
                self.google_admin_id,
                StepUpProof(method="google", credential="fresh-google-token"),
            )

    def test_step_up_rejects_inactive_or_non_admin_accounts(self):
        with self.app.app_context():
            with self.assertRaisesRegex(PermissionError, "Administrator access required"):
                verify_step_up(
                    self.librarian_id,
                    StepUpProof(method="password", credential="correct-password"),
                )

            admin = db.session.get(User, self.password_admin_id)
            admin.is_active = False
            db.session.commit()
            with self.assertRaisesRegex(PermissionError, "Administrator access required"):
                verify_step_up(
                    self.password_admin_id,
                    StepUpProof(method="password", credential="correct-password"),
                )

    def test_operation_token_is_bound_to_kind_user_and_digest(self):
        digest = "a" * 64
        with self.app.app_context():
            token = issue_operation_token(
                "restore", self.password_admin_id, digest
            )
            payload = verify_operation_token(
                token,
                kind="restore",
                user_id=self.password_admin_id,
                digest=digest,
                max_age=900,
            )
            self.assertEqual(payload["kind"], "restore")
            self.assertEqual(payload["digest"], digest)
            self.assertIn("jti", payload)

            invalid_inputs = [
                {"kind": "restore", "user_id": uuid.uuid4(), "digest": digest},
                {"kind": "restore", "user_id": self.password_admin_id, "digest": "b" * 64},
            ]
            for invalid in invalid_inputs:
                with self.subTest(invalid=invalid), self.assertRaisesRegex(
                    ValueError, "Invalid or expired backup operation token"
                ):
                    verify_operation_token(token, max_age=900, **invalid)

    def test_operation_token_rejects_modified_or_expired_signatures(self):
        with self.app.app_context(), patch(
            "itsdangerous.timed.time.time", return_value=1_000
        ):
            token = issue_operation_token(
                "restore", self.password_admin_id, "c" * 64
            )

        with self.app.app_context():
            with self.assertRaisesRegex(
                ValueError, "Invalid or expired backup operation token"
            ):
                verify_operation_token(
                    f"{token}modified",
                    kind="restore",
                    user_id=self.password_admin_id,
                    digest=None,
                    max_age=900,
                )

            with patch("itsdangerous.timed.time.time", return_value=1_901), self.assertRaisesRegex(
                ValueError, "Invalid or expired backup operation token"
            ):
                verify_operation_token(
                    token,
                    kind="restore",
                    user_id=self.password_admin_id,
                    digest=None,
                    max_age=900,
                )


if __name__ == "__main__":
    unittest.main()
