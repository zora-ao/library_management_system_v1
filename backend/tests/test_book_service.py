import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from flask import Flask
from werkzeug.datastructures import MultiDict

from app.extensions import db
from app.models import Book, Borrow, Category, User
from app.services.book_service import BookService


class BookServiceTestCase(unittest.TestCase):
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

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()


class BookCatalogServiceTests(BookServiceTestCase):
    def test_public_catalog_excludes_archived_books(self):
        active = Book("Active", "Author")
        archived = Book("Archived", "Author")
        archived.is_deleted = True
        archived.archived_at = datetime.now(timezone.utc)
        db.session.add_all([active, archived])
        db.session.commit()

        result = BookService.get_paginated_books(limit=10)

        self.assertEqual([book.title for book in result.items], ["Active"])

    def test_catalog_filters_and_orders_each_state(self):
        older = Book("Older", "Author")
        newer = Book("Newer", "Author")
        archived_old = Book("Archived old", "Author")
        archived_new = Book("Archived new", "Author")
        older.created_at = datetime(2026, 1, 1)
        newer.created_at = datetime(2026, 2, 1)
        archived_old.is_deleted = archived_new.is_deleted = True
        archived_old.archived_at = datetime(2026, 3, 1, tzinfo=timezone.utc)
        archived_new.archived_at = datetime(2026, 4, 1, tzinfo=timezone.utc)
        db.session.add_all([older, newer, archived_old, archived_new])
        db.session.commit()

        self.assertEqual(
            [book.title for book in BookService.get_staff_catalog("active")],
            ["Newer", "Older"],
        )
        self.assertEqual(
            [book.title for book in BookService.get_staff_catalog("archived")],
            ["Archived new", "Archived old"],
        )

    def test_catalog_rejects_invalid_states(self):
        for state in ("", "Active", "deleted"):
            with self.subTest(state=state):
                with self.assertRaisesRegex(ValueError, "Invalid catalog state"):
                    BookService.get_staff_catalog(state)


class BookNumericValidationTests(BookServiceTestCase):
    def clear_catalog(self):
        db.session.rollback()
        Book.query.delete()
        Category.query.delete()
        db.session.commit()

    def create_form(self, **overrides):
        values = {
            "title": "Clean Code",
            "author": "Robert C. Martin",
        }
        values.update(overrides)
        return MultiDict(values)

    def test_create_defaults_omitted_total_and_allows_blank_pages(self):
        book = BookService.create_book(self.create_form(pages=""))

        self.assertEqual(book.total_copies, 1)
        self.assertEqual(book.available_copies, 1)
        self.assertIsNone(book.pages)

    def test_create_accepts_positive_whole_number_fields(self):
        book = BookService.create_book(
            self.create_form(total_copies="3", pages="464")
        )

        self.assertEqual(book.total_copies, 3)
        self.assertEqual(book.available_copies, 3)
        self.assertEqual(book.pages, 464)

    def test_create_rejects_malformed_total_copies_before_side_effects(self):
        invalid_values = ("", "   ", "1.5", "copies", 1.5, True)
        image = SimpleNamespace(filename="cover.jpg")

        for value in invalid_values:
            with self.subTest(value=value), patch(
                "app.services.book_service.upload_book_cover",
                return_value="https://example.com/cover.jpg",
            ) as upload:
                try:
                    with self.assertRaisesRegex(
                        ValueError, "Total copies must be a whole number"
                    ):
                        BookService.create_book(
                            self.create_form(
                                total_copies=value,
                                pages="100",
                                category_name="Programming",
                            ),
                            image,
                        )

                    self.assertEqual(Book.query.count(), 0)
                    self.assertEqual(Category.query.count(), 0)
                    upload.assert_not_called()
                finally:
                    self.clear_catalog()

    def test_create_rejects_nonpositive_total_copies(self):
        for value in ("0", "-1", "-0"):
            with self.subTest(value=value):
                try:
                    with self.assertRaisesRegex(
                        ValueError, "Total copies must be 1 or greater"
                    ):
                        BookService.create_book(
                            self.create_form(total_copies=value)
                        )

                    self.assertEqual(Book.query.count(), 0)
                finally:
                    self.clear_catalog()

    def test_create_rejects_malformed_or_nonpositive_pages(self):
        cases = (
            ("1.5", "Pages must be a whole number"),
            ("pages", "Pages must be a whole number"),
            (1.5, "Pages must be a whole number"),
            (True, "Pages must be a whole number"),
            ("0", "Pages must be greater than 0"),
            ("-1", "Pages must be greater than 0"),
        )
        image = SimpleNamespace(filename="cover.jpg")

        for value, expected_message in cases:
            with self.subTest(value=value), patch(
                "app.services.book_service.upload_book_cover",
                return_value="https://example.com/cover.jpg",
            ) as upload:
                try:
                    with self.assertRaisesRegex(ValueError, expected_message):
                        BookService.create_book(
                            self.create_form(
                                total_copies="1",
                                pages=value,
                                category_name="Programming",
                            ),
                            image,
                        )

                    self.assertEqual(Book.query.count(), 0)
                    self.assertEqual(Category.query.count(), 0)
                    upload.assert_not_called()
                finally:
                    self.clear_catalog()

    def test_update_omits_numeric_fields_without_changing_them(self):
        book = Book("Clean Code", "Robert C. Martin", total_copies=3, pages=464)
        db.session.add(book)
        db.session.commit()

        updated = BookService.update_book(
            book.id,
            MultiDict({"title": "Clean Code, Updated"}),
        )

        self.assertEqual(updated.title, "Clean Code, Updated")
        self.assertEqual(updated.total_copies, 3)
        self.assertEqual(updated.available_copies, 3)
        self.assertEqual(updated.pages, 464)

    def test_update_blank_pages_clears_page_count(self):
        book = Book("Clean Code", "Robert C. Martin", pages=464)
        db.session.add(book)
        db.session.commit()

        updated = BookService.update_book(book.id, MultiDict({"pages": ""}))

        self.assertIsNone(updated.pages)

    def test_rejected_update_preserves_all_book_state_and_skips_upload(self):
        category = Category(name="Programming")
        book = Book(
            "Clean Code",
            "Robert C. Martin",
            total_copies=3,
            available_copies=2,
            isbn="9780132350884",
            description="Original description",
            pages=464,
            image_url="https://example.com/original.jpg",
        )
        book.category = category
        db.session.add(book)
        db.session.commit()
        image = SimpleNamespace(filename="replacement.jpg")

        with patch("app.services.book_service.upload_book_cover") as upload:
            with self.assertRaisesRegex(
                ValueError, "Total copies must be 1 or greater"
            ):
                BookService.update_book(
                    book.id,
                    MultiDict(
                        {
                            "isbn": "9780000000002",
                            "title": "Changed title",
                            "author": "Changed author",
                            "description": "Changed description",
                            "pages": "200",
                            "total_copies": "0",
                            "category_name": "New Category",
                        }
                    ),
                    image,
                )

            self.assertEqual(book.isbn, "9780132350884")
            self.assertEqual(book.title, "Clean Code")
            self.assertEqual(book.author, "Robert C. Martin")
            self.assertEqual(book.description, "Original description")
            self.assertEqual(book.pages, 464)
            self.assertEqual(book.total_copies, 3)
            self.assertEqual(book.available_copies, 2)
            self.assertEqual(book.category.name, "Programming")
            self.assertEqual(book.image_url, "https://example.com/original.jpg")
            upload.assert_not_called()
        self.assertIsNone(Category.query.filter_by(name="New Category").first())


class BookArchiveServiceTests(BookServiceTestCase):
    def setUp(self):
        super().setUp()
        self.user = User("Ana Cruz", "ana@example.com")
        self.book = Book("Clean Code", "Robert C. Martin", total_copies=2)
        db.session.add_all([self.user, self.book])
        db.session.commit()

    def add_borrow(self, status):
        borrow = Borrow(self.user.id, self.book.id, status=status)
        db.session.add(borrow)
        db.session.commit()
        return borrow

    def test_every_active_circulation_status_blocks_archive(self):
        blocking = (
            Borrow.STATUS_PENDING_BORROW,
            Borrow.STATUS_READY_FOR_PICKUP,
            Borrow.STATUS_BORROWED,
            Borrow.STATUS_OVERDUE,
            Borrow.STATUS_PENDING_RETURN,
        )
        for status in blocking:
            with self.subTest(status=status):
                borrow = self.add_borrow(status)
                with self.assertRaisesRegex(ValueError, "active circulation"):
                    BookService.archive_book(self.book.id)
                self.assertFalse(self.book.is_deleted)
                self.assertIsNone(self.book.archived_at)
                db.session.delete(borrow)
                db.session.commit()

    def test_returned_and_rejected_records_do_not_block_archive(self):
        for status in (Borrow.STATUS_RETURNED, Borrow.STATUS_REJECTED):
            self.add_borrow(status)

        result = BookService.archive_book(self.book.id)

        self.assertTrue(result.is_deleted)
        self.assertIsNotNone(result.archived_at)

    def test_restore_clears_both_archive_fields(self):
        self.book.is_deleted = True
        self.book.archived_at = datetime.now(timezone.utc) - timedelta(days=1)
        db.session.commit()

        result = BookService.restore_book(self.book.id)

        self.assertFalse(result.is_deleted)
        self.assertIsNone(result.archived_at)

    def test_archive_and_restore_retries_preserve_state(self):
        archived = BookService.archive_book(self.book.id)
        archived_at = archived.archived_at
        with self.assertRaisesRegex(LookupError, "Book not found"):
            BookService.archive_book(self.book.id)
        self.assertEqual(self.book.archived_at, archived_at)

        BookService.restore_book(self.book.id)
        with self.assertRaisesRegex(LookupError, "Book not found"):
            BookService.restore_book(self.book.id)
        self.assertFalse(self.book.is_deleted)
        self.assertIsNone(self.book.archived_at)

    def test_total_copies_cannot_drop_below_on_loan_count(self):
        self.book._available_copies = 0
        db.session.commit()

        with self.assertRaisesRegex(ValueError, "currently borrowed"):
            BookService.update_book(
                self.book.id,
                MultiDict({"total_copies": "1"}),
            )

        db.session.refresh(self.book)
        self.assertEqual(self.book.total_copies, 2)
        self.assertEqual(self.book.available_copies, 0)


class BookFavoriteServiceTests(BookServiceTestCase):
    def setUp(self):
        super().setUp()
        self.user = User("Ana Cruz", "ana@example.com")
        self.book1 = Book("Clean Code", "Robert C. Martin")
        self.book2 = Book("Refactoring", "Martin Fowler")
        self.archived = Book("Archived Book", "Author")
        self.archived.is_deleted = True
        db.session.add_all([self.user, self.book1, self.book2, self.archived])
        db.session.commit()

    def test_add_get_and_remove_favorites(self):
        fav1 = BookService.add_favorite(str(self.user.id), str(self.book1.id))
        fav1_dup = BookService.add_favorite(self.user.id, self.book1.id)
        self.assertEqual(fav1.id, fav1_dup.id)

        BookService.add_favorite(self.user.id, self.book2.id)
        favorites = BookService.get_user_favorites(str(self.user.id))
        self.assertEqual(len(favorites), 2)
        self.assertEqual({b.title for b in favorites}, {"Clean Code", "Refactoring"})

        removed = BookService.remove_favorite(str(self.user.id), str(self.book1.id))
        self.assertTrue(removed)
        self.assertFalse(BookService.remove_favorite(self.user.id, self.book1.id))
        self.assertEqual(
            [b.title for b in BookService.get_user_favorites(self.user.id)],
            ["Refactoring"],
        )

    def test_cannot_favorite_missing_or_archived_book(self):
        with self.assertRaisesRegex(LookupError, "Book not found"):
            BookService.add_favorite(self.user.id, self.archived.id)


if __name__ == "__main__":
    unittest.main()
