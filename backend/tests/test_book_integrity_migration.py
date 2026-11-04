import importlib.util
import unittest
from pathlib import Path
from unittest.mock import MagicMock, call


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "versions"
    / "a7b8c9d0e1f2_add_book_integrity_constraints.py"
)


class BookIntegrityMigrationTests(unittest.TestCase):
    def load_migration(self):
        if not MIGRATION_PATH.exists():
            self.fail("Book integrity migration is missing")

        spec = importlib.util.spec_from_file_location(
            "book_integrity_migration", MIGRATION_PATH
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_upgrade_aborts_before_constraints_when_invalid_rows_exist(self):
        migration = self.load_migration()
        migration.op = MagicMock()
        migration.op.get_bind.return_value.execute.return_value.mappings.return_value.one.return_value = {
            "invalid_total_copies": 2,
            "negative_available_copies": 3,
            "available_above_total": 4,
            "nonpositive_pages": 5,
        }

        with self.assertRaisesRegex(
            RuntimeError,
            "invalid_total_copies=2.*negative_available_copies=3.*"
            "available_above_total=4.*nonpositive_pages=5",
        ):
            migration.upgrade()

        migration.op.create_check_constraint.assert_not_called()

    def test_upgrade_creates_exact_constraints_after_clean_preflight(self):
        migration = self.load_migration()
        migration.op = MagicMock()
        migration.op.get_bind.return_value.execute.return_value.mappings.return_value.one.return_value = {
            "invalid_total_copies": 0,
            "negative_available_copies": 0,
            "available_above_total": 0,
            "nonpositive_pages": 0,
        }

        migration.upgrade()

        self.assertEqual(
            migration.op.create_check_constraint.call_args_list,
            [
                call(
                    "ck_books_total_copies_positive",
                    "books",
                    "total_copies >= 1",
                ),
                call(
                    "ck_books_available_copies_nonnegative",
                    "books",
                    "available_copies >= 0",
                ),
                call(
                    "ck_books_available_not_above_total",
                    "books",
                    "available_copies <= total_copies",
                ),
                call(
                    "ck_books_pages_positive",
                    "books",
                    "pages IS NULL OR pages > 0",
                ),
            ],
        )

    def test_downgrade_drops_only_book_integrity_constraints(self):
        migration = self.load_migration()
        migration.op = MagicMock()

        migration.downgrade()

        self.assertEqual(
            migration.op.drop_constraint.call_args_list,
            [
                call("ck_books_pages_positive", "books", type_="check"),
                call(
                    "ck_books_available_not_above_total",
                    "books",
                    type_="check",
                ),
                call(
                    "ck_books_available_copies_nonnegative",
                    "books",
                    type_="check",
                ),
                call(
                    "ck_books_total_copies_positive",
                    "books",
                    type_="check",
                ),
            ],
        )


if __name__ == "__main__":
    unittest.main()
