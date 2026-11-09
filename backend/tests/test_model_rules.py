import importlib.util
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, call

from flask import Flask
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Book, Borrow, BorrowStatus, Review, Role, User
from app.services.book_service import BookService, DuplicateReviewError


class ModelRulesTestCase(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite://",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

        self.user = User("Ana Cruz", "ana@example.com")
        self.book = Book("Clean Code", "Robert C. Martin", total_copies=2)
        db.session.add_all([self.user, self.book])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def assert_rejected_by_database(self, *rows):
        db.session.add_all(rows)
        with self.assertRaises(IntegrityError):
            db.session.commit()
        db.session.rollback()


class ReviewRuleTests(ModelRulesTestCase):
    def test_database_allows_one_review_per_user_and_book(self):
        db.session.add(Review(book_id=self.book.id, user_id=self.user.id, rating=4))
        db.session.commit()

        self.assert_rejected_by_database(
            Review(book_id=self.book.id, user_id=self.user.id, rating=5)
        )

    def test_database_rejects_ratings_outside_one_to_five(self):
        for rating in (0, 6):
            with self.subTest(rating=rating):
                self.assert_rejected_by_database(
                    Review(book_id=self.book.id, user_id=self.user.id, rating=rating)
                )

    def test_add_review_accepts_numeric_strings_and_whole_floats(self):
        review = BookService.add_review(self.book.id, str(self.user.id), "4", "Solid")
        other_user = User("Ben Reyes", "ben@example.com")
        db.session.add(other_user)
        db.session.commit()
        second = BookService.add_review(str(self.book.id), other_user.id, 5.0, "Great")

        self.assertEqual((review.rating, second.rating), (4, 5))

    def test_add_review_rejects_invalid_ratings_without_server_error(self):
        for rating in ("abc", "", True, 4.5, None, 0, 6, [5]):
            with self.subTest(rating=rating):
                with self.assertRaisesRegex(ValueError, "between 1 and 5"):
                    BookService.add_review(self.book.id, self.user.id, rating, "x")
        self.assertEqual(Review.query.count(), 0)

    def test_add_review_rejects_a_second_review_of_the_same_book(self):
        BookService.add_review(self.book.id, self.user.id, 5, "First")

        with self.assertRaisesRegex(DuplicateReviewError, "already reviewed"):
            BookService.add_review(self.book.id, self.user.id, 1, "Second")
        self.assertEqual(Review.query.count(), 1)

    def test_add_review_requires_an_active_book(self):
        with self.assertRaises(LookupError):
            BookService.add_review(uuid.uuid4(), self.user.id, 5, "Missing")

        self.book.is_deleted = True
        db.session.commit()
        with self.assertRaises(LookupError):
            BookService.add_review(self.book.id, self.user.id, 5, "Archived")


class RoleAndStatusRuleTests(ModelRulesTestCase):
    def test_database_rejects_unknown_roles(self):
        for role in ("superuser", "Admin"):
            with self.subTest(role=role):
                self.assert_rejected_by_database(
                    User(f"{role} user", f"{role.lower()}@example.com", role=role)
                )

    def test_database_rejects_unknown_or_lowercase_borrow_statuses(self):
        for status in ("borrowed", "LOST"):
            with self.subTest(status=status):
                self.assert_rejected_by_database(
                    Borrow(self.user.id, self.book.id, status=status)
                )

    def test_every_known_status_and_role_is_accepted(self):
        for status in Borrow.STATUSES:
            db.session.add(Borrow(self.user.id, self.book.id, status=status))
        for index, role in enumerate(User.ROLES):
            db.session.add(User(f"user {index}", f"user{index}@example.com", role=role))
        db.session.commit()

        self.assertEqual(Borrow.query.count(), len(Borrow.STATUSES))

    def test_lookup_tables_are_seeded_with_every_role_and_status(self):
        self.assertEqual(
            sorted(role.name for role in Role.query.all()), sorted(User.ROLES)
        )
        self.assertEqual(
            sorted(status.code for status in BorrowStatus.query.all()),
            sorted(Borrow.STATUSES),
        )
        self.assertTrue(all(role.description for role in Role.query.all()))
        self.assertTrue(all(status.description for status in BorrowStatus.query.all()))

    def test_role_and_status_columns_reference_the_lookup_tables(self):
        role_fk, = User.__table__.c.role.foreign_keys
        status_fk, = Borrow.__table__.c.status.foreign_keys
        self.assertEqual(role_fk.target_fullname, "roles.name")
        self.assertEqual(status_fk.target_fullname, "borrow_statuses.code")


class OverdueRuleTests(unittest.TestCase):
    def make_borrow(self, status, due_in):
        borrow = Borrow(uuid.uuid4(), uuid.uuid4(), status=status)
        borrow.due_date = datetime.now(timezone.utc).replace(tzinfo=None) + due_in
        return borrow

    def test_pending_return_past_due_is_overdue_but_keeps_its_status(self):
        borrow = self.make_borrow(Borrow.STATUS_PENDING_RETURN, timedelta(days=-2))

        result = borrow.to_dict()

        self.assertTrue(borrow.is_overdue())
        self.assertTrue(result["is_overdue"])
        self.assertEqual(result["status"], Borrow.STATUS_PENDING_RETURN)

    def test_borrowed_past_due_is_reported_as_overdue(self):
        result = self.make_borrow(Borrow.STATUS_BORROWED, timedelta(days=-1)).to_dict()

        self.assertTrue(result["is_overdue"])
        self.assertEqual(result["status"], Borrow.STATUS_OVERDUE)

    def test_loans_not_yet_due_or_already_closed_are_not_overdue(self):
        cases = (
            (Borrow.STATUS_BORROWED, timedelta(days=3)),
            (Borrow.STATUS_PENDING_RETURN, timedelta(days=3)),
            (Borrow.STATUS_RETURNED, timedelta(days=-3)),
            (Borrow.STATUS_REJECTED, timedelta(days=-3)),
        )
        for status, due_in in cases:
            with self.subTest(status=status, due_in=due_in):
                self.assertFalse(self.make_borrow(status, due_in).is_overdue())


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "versions"
    / "c4d5e6f7a8b9_add_review_role_status_constraints.py"
)


class ConstraintMigrationTests(unittest.TestCase):
    def load_migration(self, violations):
        spec = importlib.util.spec_from_file_location("review_role_status_migration", MIGRATION_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.op = MagicMock()
        module.op.get_bind.return_value.execute.return_value.mappings.return_value.one.return_value = violations
        return module

    def executed_sql(self, migration):
        return [str(c.args[0]) for c in migration.op.get_bind.return_value.execute.call_args_list]

    def test_upgrade_cleans_data_then_adds_constraints(self):
        migration = self.load_migration(
            {"ratings_out_of_range": 0, "invalid_roles": 0, "invalid_statuses": 0}
        )

        migration.upgrade()

        statements = self.executed_sql(migration)
        self.assertIn("SET status = UPPER(status)", statements[0])
        self.assertIn("DELETE FROM reviews", statements[1])
        self.assertIn("ORDER BY created_at DESC", statements[1])
        migration.op.create_unique_constraint.assert_called_once_with(
            "uq_reviews_user_book", "reviews", ["user_id", "book_id"]
        )
        self.assertEqual(
            [c.args[:2] for c in migration.op.create_check_constraint.call_args_list],
            [
                ("ck_reviews_rating_range", "reviews"),
                ("ck_users_role_valid", "users"),
                ("ck_borrows_status_valid", "borrows"),
            ],
        )

    def test_upgrade_aborts_before_constraints_when_rows_stay_invalid(self):
        migration = self.load_migration(
            {"ratings_out_of_range": 1, "invalid_roles": 2, "invalid_statuses": 0}
        )

        with self.assertRaisesRegex(RuntimeError, "ratings_out_of_range=1.*invalid_roles=2"):
            migration.upgrade()

        migration.op.create_unique_constraint.assert_not_called()
        migration.op.create_check_constraint.assert_not_called()

    def test_downgrade_drops_the_new_constraints(self):
        migration = self.load_migration({})

        migration.downgrade()

        self.assertEqual(
            migration.op.drop_constraint.call_args_list,
            [
                call("ck_borrows_status_valid", "borrows", type_="check"),
                call("ck_users_role_valid", "users", type_="check"),
                call("ck_reviews_rating_range", "reviews", type_="check"),
                call("uq_reviews_user_book", "reviews", type_="unique"),
            ],
        )

    def test_migration_constraints_match_the_models(self):
        migration = self.load_migration({})

        self.assertEqual(migration.BORROW_STATUSES, Borrow.STATUSES)
        self.assertEqual(migration.USER_ROLES, User.ROLES)


LOOKUP_MIGRATION_PATH = MIGRATION_PATH.with_name("e6f7a8b9c0d1_add_role_and_borrow_status_lookups.py")


class LookupMigrationTests(unittest.TestCase):
    def load_migration(self):
        spec = importlib.util.spec_from_file_location("lookup_migration", LOOKUP_MIGRATION_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.op = MagicMock()
        return module

    def test_seed_rows_match_the_models(self):
        migration = self.load_migration()

        self.assertEqual(migration.ROLES, Role.SEED)
        self.assertEqual(migration.BORROW_STATUSES, BorrowStatus.SEED)
        self.assertEqual(tuple(name for name, _ in Role.SEED), User.ROLES)
        self.assertEqual(tuple(code for code, _ in BorrowStatus.SEED), Borrow.STATUSES)

    def test_upgrade_replaces_checks_with_foreign_keys(self):
        migration = self.load_migration()

        migration.upgrade()

        self.assertEqual(
            [c.args[0] for c in migration.op.create_table.call_args_list],
            ["roles", "borrow_statuses"],
        )
        self.assertEqual(migration.op.bulk_insert.call_count, 2)
        self.assertEqual(
            migration.op.drop_constraint.call_args_list,
            [
                call("ck_users_role_valid", "users", type_="check"),
                call("ck_borrows_status_valid", "borrows", type_="check"),
            ],
        )
        self.assertEqual(
            migration.op.create_foreign_key.call_args_list,
            [
                call("fk_users_role_roles", "users", "roles", ["role"], ["name"], onupdate="CASCADE"),
                call(
                    "fk_borrows_status_borrow_statuses", "borrows", "borrow_statuses",
                    ["status"], ["code"], onupdate="CASCADE",
                ),
            ],
        )

    def test_downgrade_restores_the_check_constraints(self):
        migration = self.load_migration()

        migration.downgrade()

        self.assertEqual(
            [c.args[:2] for c in migration.op.create_check_constraint.call_args_list],
            [("ck_borrows_status_valid", "borrows"), ("ck_users_role_valid", "users")],
        )
        self.assertEqual(
            [c.args[0] for c in migration.op.drop_table.call_args_list],
            ["borrow_statuses", "roles"],
        )


if __name__ == "__main__":
    unittest.main()
