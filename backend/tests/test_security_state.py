import unittest
import uuid
from uuid import UUID
from unittest.mock import MagicMock, patch

from flask import Flask, jsonify
from flask_jwt_extended import (
    JWTManager,
    decode_token,
    get_jwt_identity,
    jwt_required,
)
from sqlalchemy import event

from app.extensions import db
from app.models import SystemSecurityState, User
from app.security_state import (
    begin_restore_maintenance,
    clear_restore_maintenance,
    configure_jwt_security,
    finalize_restore_security,
    get_auth_epoch,
    rotate_auth_epoch,
)
from app.services.auth_service import AuthService


class SecurityStateTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
            JWT_SECRET_KEY="test-secret-that-is-at-least-thirty-two-bytes",
        )
        db.init_app(self.app)
        jwt = JWTManager(self.app)
        configure_jwt_security(jwt)

        @self.app.get("/protected")
        @jwt_required()
        def protected():
            return jsonify({"ok": True})

        @self.app.get("/current-user")
        @jwt_required()
        def current_user():
            user = AuthService.get_current_user(UUID(str(get_jwt_identity())))
            return jsonify({"user": user.to_dict()})

        @self.app.get("/security-epoch")
        def security_epoch():
            return jsonify({"auth_epoch": get_auth_epoch()})

        with self.app.app_context():
            db.create_all()
            db.session.add(
                SystemSecurityState(id=1, auth_epoch=str(uuid.uuid4()))
            )
            self.user = User(
                username="Epoch Admin",
                email="epoch-admin@example.com",
                password="correct-password",
                role="admin",
            )
            db.session.add(self.user)
            db.session.commit()
            self.user_id = self.user.id

        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @staticmethod
    def auth_header(token):
        return {"Authorization": f"Bearer {token}"}

    def issue_token(self):
        with self.app.app_context():
            user = db.session.get(User, self.user_id)
            return AuthService.issue_access_token(user)

    def test_issued_token_contains_current_auth_epoch(self):
        token = self.issue_token()

        with self.app.app_context():
            self.assertEqual(decode_token(token)["auth_epoch"], get_auth_epoch())

        response = self.client.get("/protected", headers=self.auth_header(token))
        self.assertEqual(response.status_code, 200)

    def test_current_user_reuses_jwt_user_without_duplicate_lookup(self):
        token = self.issue_token()
        statements = []

        with self.app.app_context():
            engine = db.engine

            def record_statement(_conn, _cursor, statement, _params, _context, _many):
                statements.append(statement)

            event.listen(engine, "before_cursor_execute", record_statement)
            try:
                response = self.client.get(
                    "/current-user",
                    headers=self.auth_header(token),
                )
            finally:
                event.remove(engine, "before_cursor_execute", record_statement)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["id"], str(self.user_id))
        self.assertEqual(len(statements), 2, statements)

    def test_security_state_cache_is_bound_to_each_request(self):
        states = [
            MagicMock(auth_epoch="first-request"),
            MagicMock(auth_epoch="second-request"),
        ]

        with self.app.app_context(), patch(
            "app.security_state.db.session.get",
            side_effect=states,
        ) as get_state:
            first = self.client.get("/security-epoch")
            second = self.client.get("/security-epoch")

        self.assertEqual(first.get_json(), {"auth_epoch": "first-request"})
        self.assertEqual(second.get_json(), {"auth_epoch": "second-request"})
        self.assertEqual(get_state.call_count, 2)

    def test_epoch_mismatch_revokes_token(self):
        token = self.issue_token()

        with self.app.app_context():
            rotate_auth_epoch()

        response = self.client.get("/protected", headers=self.auth_header(token))
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"message": "Authentication required"})

    def test_inactive_user_token_is_revoked(self):
        token = self.issue_token()

        with self.app.app_context():
            user = db.session.get(User, self.user_id)
            user.is_active = False
            db.session.commit()

        response = self.client.get("/protected", headers=self.auth_header(token))
        self.assertEqual(response.status_code, 401)

    def test_missing_security_state_revokes_token_instead_of_failing_open(self):
        token = self.issue_token()

        with self.app.app_context():
            db.session.delete(db.session.get(SystemSecurityState, 1))
            db.session.commit()

        response = self.client.get("/protected", headers=self.auth_header(token))

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"message": "Authentication required"})

    def test_role_change_revokes_old_claim(self):
        token = self.issue_token()

        with self.app.app_context():
            user = db.session.get(User, self.user_id)
            user.role = "librarian"
            db.session.commit()

        response = self.client.get("/protected", headers=self.auth_header(token))
        self.assertEqual(response.status_code, 401)

    def test_rotate_auth_epoch_changes_singleton_value(self):
        with self.app.app_context():
            old_epoch = get_auth_epoch()
            new_epoch = rotate_auth_epoch()

            self.assertNotEqual(new_epoch, old_epoch)
            self.assertEqual(get_auth_epoch(), new_epoch)
            self.assertEqual(SystemSecurityState.query.count(), 1)

    def test_restore_maintenance_lifecycle_is_persistent_and_rotates_epoch(self):
        with self.app.app_context():
            old_epoch = get_auth_epoch()
            begin_restore_maintenance()
            state = db.session.get(SystemSecurityState, 1)
            self.assertTrue(state.maintenance_mode)
            self.assertIsNotNone(state.restore_started_at)

            finalize_restore_security()
            db.session.expire_all()
            state = db.session.get(SystemSecurityState, 1)
            self.assertFalse(state.maintenance_mode)
            self.assertIsNone(state.restore_started_at)
            self.assertNotEqual(state.auth_epoch, old_epoch)

    def test_restore_maintenance_can_be_cleared_without_rotating_epoch(self):
        with self.app.app_context():
            old_epoch = get_auth_epoch()
            begin_restore_maintenance()
            clear_restore_maintenance()
            db.session.expire_all()
            state = db.session.get(SystemSecurityState, 1)
            self.assertFalse(state.maintenance_mode)
            self.assertIsNone(state.restore_started_at)
            self.assertEqual(state.auth_epoch, old_epoch)

    def test_second_restore_cannot_claim_maintenance(self):
        with self.app.app_context():
            begin_restore_maintenance()
            with self.assertRaisesRegex(RuntimeError, "already in progress"):
                begin_restore_maintenance()


if __name__ == "__main__":
    unittest.main()
