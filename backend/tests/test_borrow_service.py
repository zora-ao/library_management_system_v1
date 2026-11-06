import unittest
from datetime import timedelta

from flask import Flask
from sqlalchemy import event

from app.extensions import db
from app.models import Book, Borrow, User
from app.services.borrow_service import BorrowService


class BorrowServiceTestCase(unittest.TestCase):
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
        self.book = Book("Clean Code", "Robert C. Martin", total_copies=1)
        db.session.add_all([self.user, self.book])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def add_request(self, status=Borrow.STATUS_PENDING_BORROW):
        borrow = Borrow(self.user.id, self.book.id, status=status)
        db.session.add(borrow)
        db.session.commit()
        return borrow


class BorrowApprovalTests(BorrowServiceTestCase):
    def test_history_serialization_eager_loads_user_and_book_in_one_query(self):
        history_item = self.add_request(Borrow.STATUS_RETURNED)
        user_id = self.user.id
        history_id = history_item.id
        db.session.expire_all()
        statements = []

        def record_statement(_conn, _cursor, statement, _params, _context, _many):
            statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record_statement)
        try:
            history = BorrowService.get_borrowed_history(user_id)
            serialized = [borrow.to_dict() for borrow in history]
        finally:
            event.remove(db.engine, "before_cursor_execute", record_statement)

        self.assertEqual([item["id"] for item in serialized], [str(history_id)])
        self.assertEqual(len(statements), 1, statements)

    def test_approval_reserves_one_copy_without_starting_loan(self):
        borrow = self.add_request()

        result = BorrowService.approve_borrow_request(borrow.id)

        self.assertEqual(result.status, Borrow.STATUS_READY_FOR_PICKUP)
        self.assertEqual(self.book.available_copies, 0)
        self.assertIsNotNone(result.approved_at)
        self.assertIsNone(result.borrowed_at)
        self.assertIsNone(result.due_date)

    def test_second_approval_for_last_copy_fails_without_negative_inventory(self):
        first = self.add_request()
        second_user = User("Ben Santos", "ben@example.com")
        db.session.add(second_user)
        db.session.commit()
        second = Borrow(second_user.id, self.book.id)
        db.session.add(second)
        db.session.commit()

        BorrowService.approve_borrow_request(first.id)

        with self.assertRaisesRegex(ValueError, "out of stock"):
            BorrowService.approve_borrow_request(second.id)
        self.assertEqual(self.book.available_copies, 0)
        self.assertEqual(second.status, Borrow.STATUS_PENDING_BORROW)

    def test_ready_for_pickup_is_active_and_blocks_duplicate_request(self):
        borrow = self.add_request(Borrow.STATUS_READY_FOR_PICKUP)

        active = BorrowService.get_user_active_borrows(self.user.id)

        self.assertEqual([item.id for item in active], [borrow.id])
        with self.assertRaisesRegex(ValueError, "active request"):
            BorrowService.request_borrow(self.user.id, self.book.id)


class BorrowPickupAndRejectionTests(BorrowServiceTestCase):
    def test_pickup_starts_fourteen_day_loan_without_decrementing_again(self):
        borrow = self.add_request()
        BorrowService.approve_borrow_request(borrow.id)

        result = BorrowService.confirm_borrow_pickup(borrow.id)

        self.assertEqual(result.status, Borrow.STATUS_BORROWED)
        self.assertEqual(result.due_date - result.borrowed_at, timedelta(days=14))
        self.assertEqual(self.book.available_copies, 0)

    def test_pickup_rejects_wrong_state_and_retry(self):
        pending = self.add_request()
        with self.assertRaisesRegex(ValueError, "ready for pickup"):
            BorrowService.confirm_borrow_pickup(pending.id)

        BorrowService.approve_borrow_request(pending.id)
        BorrowService.confirm_borrow_pickup(pending.id)
        with self.assertRaisesRegex(ValueError, "ready for pickup"):
            BorrowService.confirm_borrow_pickup(pending.id)
        self.assertEqual(self.book.available_copies, 0)

    def test_rejection_trims_and_persists_reason(self):
        borrow = self.add_request()

        result = BorrowService.reject_borrow_request(borrow.id, "  Missing ID  ")

        self.assertEqual(result.status, Borrow.STATUS_REJECTED)
        self.assertEqual(result.rejection_reason, "Missing ID")
        self.assertEqual(self.book.available_copies, 1)

    def test_rejection_requires_non_empty_reason_and_pending_state(self):
        borrow = self.add_request()
        for reason in ("", "   ", None):
            with self.subTest(reason=reason):
                with self.assertRaisesRegex(ValueError, "reason is required"):
                    BorrowService.reject_borrow_request(borrow.id, reason)
        self.assertEqual(borrow.status, Borrow.STATUS_PENDING_BORROW)

        borrow.status = Borrow.STATUS_READY_FOR_PICKUP
        db.session.commit()
        with self.assertRaisesRegex(ValueError, "waiting"):
            BorrowService.reject_borrow_request(borrow.id, "Too late")

    def test_return_confirmation_restores_inventory_only_once(self):
        borrow = self.add_request()
        BorrowService.approve_borrow_request(borrow.id)
        BorrowService.confirm_borrow_pickup(borrow.id)

        result = BorrowService.approve_return_request(borrow.id)

        self.assertEqual(result.status, Borrow.STATUS_RETURNED)
        self.assertEqual(self.book.available_copies, 1)
        with self.assertRaisesRegex(ValueError, "waiting for return"):
            BorrowService.approve_return_request(borrow.id)
        self.assertEqual(self.book.available_copies, 1)


if __name__ == "__main__":
    unittest.main()
