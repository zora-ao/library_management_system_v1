import importlib
import logging
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch

import app.config as config_module
from app import create_app
from app.services.auth_service import AuthService, _CachedGoogleRequest, _GOOGLE_AUTH_REQUEST


class ConfigAndCorsTests(unittest.TestCase):
    def test_create_app_emits_informational_operational_events(self):
        with patch.object(
            config_module.Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:"
        ), patch.object(config_module.Config, "JWT_SECRET_KEY", "test-secret"):
            flask_app = create_app()

        self.assertTrue(flask_app.logger.isEnabledFor(logging.INFO))

    def test_config_loads_backend_env_file_explicitly(self):
        expected_env_path = Path(config_module.__file__).resolve().parent.parent / ".env"
        with patch("dotenv.load_dotenv") as mock_load_dotenv:
            importlib.reload(config_module)
            mock_load_dotenv.assert_called_once_with(expected_env_path)

    def test_config_uses_pre_ping_without_forcing_short_connection_recycling(self):
        engine_options = getattr(config_module.Config, "SQLALCHEMY_ENGINE_OPTIONS", {})
        self.assertTrue(engine_options.get("pool_pre_ping"))
        self.assertNotIn("pool_recycle", engine_options)
        connect_args = engine_options.get("connect_args", {})
        self.assertEqual(connect_args.get("connect_timeout"), 10)
        self.assertEqual(connect_args.get("keepalives"), 1)

    def test_config_sets_short_lived_backup_operation_tokens(self):
        self.assertTrue(hasattr(config_module.Config, "BACKUP_TOKEN_SIGNING_KEY"))
        self.assertEqual(
            config_module.Config.BACKUP_SAFETY_TOKEN_MAX_AGE_SECONDS,
            900,
        )
        self.assertEqual(
            config_module.Config.BACKUP_RESTORE_TOKEN_MAX_AGE_SECONDS,
            900,
        )
        self.assertGreater(
            config_module.Config.MAX_CONTENT_LENGTH,
            config_module.Config.BACKUP_MAX_BYTES,
        )

    def test_cached_google_request_reuses_cached_get_response(self):
        mock_session = MagicMock()
        raw_response = MagicMock()
        raw_response.status_code = 200
        raw_response.headers = {"Cache-Control": "public, max-age=3600"}
        raw_response.content = b'{"keys": []}'
        mock_session.request.return_value = raw_response

        cached_request = _CachedGoogleRequest(session=mock_session)
        url = "https://www.googleapis.com/oauth2/v3/certs"

        first = cached_request(url, method="GET")
        second = cached_request(url, method="GET")

        self.assertEqual(first.status, 200)
        self.assertIs(first, second)
        self.assertEqual(mock_session.request.call_count, 1)

    def test_google_auth_allows_clock_skew_when_verifying_id_token(self):
        with patch.object(
            config_module.Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:"
        ), patch.object(config_module.Config, "JWT_SECRET_KEY", "test-secret"):
            flask_app = create_app()
            flask_app.config["GOOGLE_CLIENT_ID"] = "test-google-client-id"
            with flask_app.app_context(), patch(
                "app.services.auth_service.id_token.verify_oauth2_token",
                side_effect=ValueError("invalid"),
            ) as mock_verify:
                with self.assertRaises(ValueError):
                    AuthService.google_auth("dummy-token")

                mock_verify.assert_called_once_with(
                    "dummy-token",
                    _GOOGLE_AUTH_REQUEST,
                    "test-google-client-id",
                    clock_skew_in_seconds=10,
                )

    def test_create_app_allows_localhost_and_loopback_cors_origins(self):
        with patch.object(
            config_module.Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:"
        ), patch.object(config_module.Config, "JWT_SECRET_KEY", "test-secret"):
            flask_app = create_app()
            client = flask_app.test_client()

            for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
                response = client.options(
                    "/api/auth/register",
                    headers={
                        "Origin": origin,
                        "Access-Control-Request-Method": "POST",
                    },
                )
                self.assertEqual(
                    response.headers.get("Access-Control-Allow-Origin"),
                    origin,
                )


if __name__ == "__main__":
    unittest.main()
