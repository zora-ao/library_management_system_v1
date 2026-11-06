import unittest
from datetime import datetime, timedelta, timezone

from flask import Flask
from sqlalchemy import event

from app.extensions import db
from app.models import Book, Borrow, Category, User
from app.services.dashboard_service import DashboardService


class DashboardServiceTests(unittest.TestCase):
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
        self.now = datetime(2026, 11, 6, 4, 0, tzinfo=timezone.utc)

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def add_borrow(self, user, book, status, *, created_hours_ago, **dates):
        borrow = Borrow(user.id, book.id, status=status)
        borrow.created_at = self.now.replace(tzinfo=None) - timedelta(hours=created_hours_ago)
        for field, value in dates.items():
            setattr(borrow, field, value.replace(tzinfo=None) if value else None)
        db.session.add(borrow)
        return borrow

    def seed_dashboard(self):
        category = Category("Programming")
        active_book = Book("Clean Code", "Robert C. Martin", total_copies=3, available_copies=2)
        active_book.category = category
        archived_book = Book("Archived", "Author", total_copies=9, available_copies=9)
        archived_book.is_deleted = True
        admin = User("Admin User", "admin@example.com", role="admin")
        student = User("Ana Cruz", "ana@example.com", role="student")
        db.session.add_all([active_book, archived_book, admin, student])
        db.session.flush()

        overdue = self.add_borrow(
            student,
            active_book,
            Borrow.STATUS_BORROWED,
            created_hours_ago=48,
            borrowed_at=self.now - timedelta(days=3),
            due_date=self.now - timedelta(hours=1),
        )
        pending_return = self.add_borrow(
            student,
            active_book,
            Borrow.STATUS_PENDING_RETURN,
            created_hours_ago=8,
            borrowed_at=self.now - timedelta(days=1),
            due_date=self.now + timedelta(days=10),
        )
        pending = self.add_borrow(
            student,
            active_book,
            Borrow.STATUS_PENDING_BORROW,
            created_hours_ago=2,
        )
        pickup = self.add_borrow(
            student,
            active_book,
            Borrow.STATUS_READY_FOR_PICKUP,
            created_hours_ago=1,
            approved_at=self.now - timedelta(hours=1),
        )
        returned = self.add_borrow(
            student,
            active_book,
            Borrow.STATUS_RETURNED,
            created_hours_ago=72,
            borrowed_at=self.now - timedelta(days=2),
            returned_at=self.now - timedelta(hours=3),
        )
        db.session.commit()
        return overdue, pending_return, pending, pickup, returned

    def test_summary_returns_exact_metrics_and_bounded_previews(self):
        overdue, pending_return, pending, pickup, returned = self.seed_dashboard()

        result = DashboardService.get_summary(
            include_user_count=True,
            timezone_offset_minutes=-480,
            now_utc=self.now,
        )

        self.assertEqual(result["total_users"], 2)
        self.assertEqual(result["book_titles"], 1)
        self.assertEqual(result["total_copies"], 3)
        self.assertEqual(result["available_copies"], 2)
        self.assertEqual(result["categories"], 1)
        self.assertEqual(result["pending"], 1)
        self.assertEqual(result["waiting_for_pickup"], 1)
        self.assertEqual(result["active"], 1)
        self.assertEqual(result["overdue"], 1)
        self.assertEqual(result["returned"], 1)
        self.assertEqual(result["returned_today"], 1)
        self.assertEqual(
            [item["id"] for item in result["attention"]],
            [str(overdue.id), str(pending_return.id), str(pending.id)],
        )
        self.assertEqual(len(result["recent"]), 4)
        self.assertEqual(result["recent"][0]["id"], str(pickup.id))
        self.assertNotIn(str(pickup.id), [item["id"] for item in result["attention"]])
        self.assertEqual(len(result["activity"]), 7)
        self.assertEqual(result["activity"][-1], {"date": "2026-11-06", "loans": 0, "returns": 1})
        self.assertEqual(result["activity"][-2]["loans"], 1)

    def test_librarian_summary_omits_user_total_and_empty_data_is_zeroed(self):
        result = DashboardService.get_summary(
            include_user_count=False,
            timezone_offset_minutes=0,
            now_utc=self.now,
        )

        self.assertNotIn("total_users", result)
        for key in (
            "book_titles",
            "total_copies",
            "available_copies",
            "categories",
            "pending",
            "waiting_for_pickup",
            "active",
            "overdue",
            "returned",
            "returned_today",
        ):
            self.assertEqual(result[key], 0, key)
        self.assertEqual(result["attention"], [])
        self.assertEqual(result["recent"], [])
        self.assertEqual(len(result["activity"]), 7)

    def test_summary_query_count_stays_bounded_as_history_grows(self):
        self.seed_dashboard()
        student = User.query.filter_by(role="student").one()
        book = Book.query.filter_by(is_deleted=False).one()
        for index in range(20):
            self.add_borrow(
                student,
                book,
                Borrow.STATUS_RETURNED,
                created_hours_ago=100 + index,
                returned_at=self.now - timedelta(days=10 + index),
            )
        db.session.commit()
        db.session.expire_all()
        statements = []

        def record_statement(_conn, _cursor, statement, _params, _context, _many):
            statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record_statement)
        try:
            DashboardService.get_summary(
                include_user_count=True,
                timezone_offset_minutes=-480,
                now_utc=self.now,
            )
        finally:
            event.remove(db.engine, "before_cursor_execute", record_statement)

        self.assertLessEqual(len(statements), 3, statements)

    def test_activity_uses_named_timezone_rules_across_dst_boundaries(self):
        user = User("Ana Cruz", "ana@example.com")
        book = Book("Clean Code", "Robert C. Martin")
        db.session.add_all([user, book])
        db.session.flush()
        borrow = Borrow(user.id, book.id, status=Borrow.STATUS_BORROWED)
        borrow.created_at = datetime(2026, 11, 1, 4, 30)
        borrow.borrowed_at = datetime(2026, 11, 1, 4, 30)
        borrow.due_date = datetime(2026, 11, 10, 4, 30)
        db.session.add(borrow)
        db.session.commit()

        result = DashboardService.get_summary(
            include_user_count=False,
            timezone_offset_minutes=300,
            timezone_name="America/New_York",
            now_utc=datetime(2026, 11, 2, 12, 0, tzinfo=timezone.utc),
        )

        november_first = next(item for item in result["activity"] if item["date"] == "2026-11-01")
        self.assertEqual(november_first["loans"], 1)

    def test_activity_uses_pre_transition_offset_at_spring_dst_boundary(self):
        user = User("Ana Cruz", "ana@example.com")
        book = Book("Clean Code", "Robert C. Martin")
        db.session.add_all([user, book])
        db.session.flush()
        borrow = Borrow(user.id, book.id, status=Borrow.STATUS_BORROWED)
        borrow.created_at = datetime(2026, 3, 8, 4, 30)
        borrow.borrowed_at = datetime(2026, 3, 8, 4, 30)
        borrow.due_date = datetime(2026, 3, 20, 4, 30)
        db.session.add(borrow)
        db.session.commit()

        result = DashboardService.get_summary(
            include_user_count=False,
            timezone_offset_minutes=240,
            timezone_name="America/New_York",
            now_utc=datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc),
        )

        march_seventh = next(item for item in result["activity"] if item["date"] == "2026-03-07")
        march_eighth = next(item for item in result["activity"] if item["date"] == "2026-03-08")
        self.assertEqual(march_seventh["loans"], 1)
        self.assertEqual(march_eighth["loans"], 0)


if __name__ == "__main__":
    unittest.main()
