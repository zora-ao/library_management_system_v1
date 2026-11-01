from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from app.config import Config
from app.services.postgres_tools import (
    PostgresToolConfig,
    PostgresToolError,
    check_capabilities,
    create_custom_dump,
    restore_custom_dump,
    validate_custom_dump,
)


DATABASE_URL = (
    "postgresql://backup_user:p%40ss%3Aword@db.example.test:5433/"
    "library_data?sslmode=require"
)


class PostgresToolsTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.config = PostgresToolConfig(
            database_url=DATABASE_URL,
            timeout_seconds=300,
        )

    def tearDown(self):
        self.tempdir.cleanup()

    @staticmethod
    def completed(stdout="", stderr="", returncode=0):
        return subprocess.CompletedProcess([], returncode, stdout, stderr)

    @patch("app.services.postgres_tools.subprocess.run")
    def test_dump_uses_custom_format_and_keeps_decoded_password_out_of_args(self, run):
        run.return_value = self.completed()
        output = self.root / "database.dump"

        create_custom_dump(self.config, output)

        args = run.call_args.args[0]
        options = run.call_args.kwargs
        self.assertEqual(
            args[1:],
            [
                "--format=custom",
                "--no-owner",
                "--no-privileges",
                "--exclude-table=public.system_security_state",
                "--file",
                str(output),
            ],
        )
        self.assertNotIn("p@ss:word", " ".join(args))
        self.assertNotIn(DATABASE_URL, " ".join(args))
        self.assertEqual(options["env"]["PGPASSWORD"], "p@ss:word")
        self.assertEqual(options["env"]["PGHOST"], "db.example.test")
        self.assertEqual(options["env"]["PGPORT"], "5433")
        self.assertEqual(options["env"]["PGDATABASE"], "library_data")
        self.assertEqual(options["env"]["PGUSER"], "backup_user")
        self.assertEqual(options["env"]["PGSSLMODE"], "require")
        self.assertEqual(options["timeout"], 300)

    @patch("app.services.postgres_tools.subprocess.run")
    def test_validate_and_restore_use_exact_safe_arguments(self, run):
        run.return_value = self.completed()
        dump = self.root / "database.dump"

        validate_custom_dump(self.config, dump)
        restore_custom_dump(self.config, dump)

        validate_args = run.call_args_list[0].args[0]
        restore_args = run.call_args_list[1].args[0]
        self.assertEqual(validate_args[1:], ["--list", str(dump)])
        self.assertEqual(
            restore_args[1:],
            [
                "--clean",
                "--if-exists",
                "--single-transaction",
                "--no-owner",
                "--no-privileges",
                "--dbname",
                "library_data",
                str(dump),
            ],
        )
        self.assertNotIn("p@ss:word", " ".join(restore_args))

    @patch("app.services.postgres_tools.subprocess.run")
    def test_command_failures_and_timeouts_expose_bounded_safe_errors(self, run):
        run.return_value = self.completed(stderr="x" * 20_000, returncode=9)
        with self.assertRaises(PostgresToolError) as failed:
            validate_custom_dump(self.config, self.root / "bad.dump")
        self.assertEqual(failed.exception.exit_code, 9)
        self.assertLessEqual(len(failed.exception.diagnostic), 4096)
        self.assertNotIn(DATABASE_URL, str(failed.exception))
        self.assertNotIn("p@ss:word", str(failed.exception))

        run.side_effect = subprocess.TimeoutExpired(["pg_dump"], timeout=300)
        with self.assertRaisesRegex(PostgresToolError, "timed out"):
            create_custom_dump(self.config, self.root / "timeout.dump")

    @patch("app.services.postgres_tools._read_server_version", return_value="18.1")
    @patch("app.services.postgres_tools.subprocess.run")
    def test_capabilities_reject_older_or_missing_clients(self, run, _server_version):
        run.side_effect = [
            self.completed(stdout="pg_dump (PostgreSQL) 17.4"),
            self.completed(stdout="pg_restore (PostgreSQL) 17.4"),
        ]
        capabilities = check_capabilities(self.config)
        self.assertFalse(capabilities.available)
        self.assertIn("older than PostgreSQL server", capabilities.reason)

        run.side_effect = FileNotFoundError("pg_dump")
        missing = check_capabilities(self.config)
        self.assertFalse(missing.available)
        self.assertIn("not installed", missing.reason)

    @patch("app.services.postgres_tools._read_server_version", return_value="17.4")
    @patch("app.services.postgres_tools.subprocess.run")
    def test_capabilities_report_compatible_versions_and_binary_directory(self, run, _server):
        run.side_effect = [
            self.completed(stdout="pg_dump (PostgreSQL) 17.5"),
            self.completed(stdout="pg_restore (PostgreSQL) 17.5"),
        ]
        config = PostgresToolConfig(
            database_url=DATABASE_URL,
            binary_dir=self.root / "postgres-bin",
            timeout_seconds=300,
        )

        capabilities = check_capabilities(config)

        self.assertTrue(capabilities.available)
        self.assertEqual(capabilities.pg_dump_version, "17.5")
        self.assertEqual(capabilities.pg_restore_version, "17.5")
        self.assertEqual(capabilities.server_version, "17.4")
        for call in run.call_args_list:
            self.assertEqual(Path(call.args[0][0]).parent, config.binary_dir)

    def test_non_postgresql_urls_are_rejected(self):
        config = PostgresToolConfig(database_url="sqlite:///:memory:")
        with self.assertRaisesRegex(PostgresToolError, "PostgreSQL"):
            create_custom_dump(config, self.root / "database.dump")

    def test_config_exposes_native_tool_limits(self):
        self.assertEqual(Config.BACKUP_MAX_BYTES, 262_144_000)
        self.assertEqual(Config.BACKUP_OPERATION_TIMEOUT_SECONDS, 300)
        self.assertTrue(hasattr(Config, "BACKUP_PG_BIN_DIR"))


if __name__ == "__main__":
    unittest.main()
