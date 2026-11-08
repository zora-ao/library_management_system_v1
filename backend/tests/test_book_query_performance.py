import unittest
from contextlib import contextmanager

from flask import Flask
from sqlalchemy import event

from app.extensions import db
from app.models import Book, Category, Review, User
from app.services.book_service import BookService


class BookQueryPerformanceTests(unittest.TestCase):
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

        self.category = Category(name="Fiction")
        db.session.add(self.category)
        db.session.flush()
        self.books = [
            Book(f"Book {index}", "Same Author", category_id=self.category.id)
            for index in range(6)
        ]
        db.session.add_all(self.books)
        self.users = [
            User(f"reader{index}", f"reader{index}@example.com", "password123")
            for index in range(3)
        ]
        db.session.add_all(self.users)
        db.session.flush()
        for book in self.books:
            for user, rating in zip(self.users, (5, 4, 4)):
                db.session.add(Review(book_id=book.id, user_id=user.id, rating=rating))
        db.session.commit()
        self.book_ids = [book.id for book in self.books]
        db.session.expunge_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    @contextmanager
    def count_queries(self):
        statements = []

        def record(_conn, _cursor, statement, *_args):
            statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record)
        try:
            yield statements
        finally:
            event.remove(db.engine, "before_cursor_execute", record)

    def test_catalog_serializes_ratings_without_per_book_queries(self):
        with self.count_queries() as statements:
            page = BookService.get_paginated_books(limit=10)
            payload = [book.to_dict() for book in page.items]

        self.assertEqual(len(payload), 6)
        self.assertTrue(all(item["average_rating"] == 4.3 for item in payload))
        self.assertTrue(all(item["total_reviews"] == 3 for item in payload))
        self.assertTrue(all(item["category_name"] == "Fiction" for item in payload))
        # One COUNT for pagination plus one SELECT for the page.
        self.assertLessEqual(len(statements), 2)

    def test_staff_catalog_uses_a_single_query(self):
        with self.count_queries() as statements:
            payload = [book.to_dict() for book in BookService.get_staff_catalog()]

        self.assertEqual(len(payload), 6)
        self.assertEqual(payload[0]["total_reviews"], 3)
        self.assertEqual(len(statements), 1)

    def test_related_books_do_not_lazy_load_per_book(self):
        book_id = self.book_ids[0]
        with self.count_queries() as statements:
            related = BookService.get_related_books(book_id, limit=5)
            payload = [book.to_dict() for book in related]

        self.assertEqual(len(payload), 5)
        self.assertEqual(payload[0]["average_rating"], 4.3)
        self.assertEqual(len(statements), 2)

    def test_book_reviews_load_authors_in_one_query(self):
        book_id = self.book_ids[0]
        with self.count_queries() as statements:
            reviews = BookService.get_book_reviews(book_id)
            payload = [review.to_dict() for review in reviews]

        self.assertEqual(
            sorted(item["username"] for item in payload),
            ["reader0", "reader1", "reader2"],
        )
        # Book lookup + reviews joined with users.
        self.assertEqual(len(statements), 2)

    def test_review_stats_are_aggregated(self):
        self.assertEqual(
            BookService.get_book_reviews_stats(self.book_ids[0]),
            {"average_rating": 4.3, "total_reviews": 3},
        )

    def test_review_stats_for_unreviewed_book(self):
        lonely = Book("Lonely", "Nobody")
        db.session.add(lonely)
        db.session.commit()

        self.assertEqual(
            BookService.get_book_reviews_stats(lonely.id),
            {"average_rating": 0.0, "total_reviews": 0},
        )
        self.assertEqual(lonely.to_dict()["average_rating"], 0.0)
        self.assertEqual(lonely.to_dict()["total_reviews"], 0)

    def test_single_book_lookup_reports_ratings(self):
        book = BookService.get_book_by_id(self.book_ids[0])
        self.assertEqual(book.to_dict()["average_rating"], 4.3)
        self.assertEqual(book.to_dict()["total_reviews"], 3)

    def test_unsaved_book_serializes_with_zero_ratings(self):
        book = Book("Draft", "Author")
        self.assertEqual(book.average_rating, 0.0)
        self.assertEqual(book.total_reviews, 0)


if __name__ == "__main__":
    unittest.main()
