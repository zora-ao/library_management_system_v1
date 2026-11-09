"""Seed demo accounts and library activity for local testing and demos.

Creates dummy staff and student accounts (all sharing DEMO_PASSWORD), then
gives the students borrows in every state the app handles: overdue loans,
loans due in the next few days, return requests, approved pickups, pending
requests, rejections, and returned books, some of them returned late. It also
adds reviews and favorites.

Copies are reserved the same way the app reserves them: approved, borrowed
and return-pending loans each hold one copy; returned and rejected ones do not.
Dates are relative to the moment the script runs, so "due soon" stays true.

Accounts that already exist (matched by email) are skipped, and activity is
only added once, so the script is safe to run more than once.

Usage (from backend/):
    .venv/Scripts/python.exe scripts/seed_demo.py            # seeds DATABASE_URL from .env
    .venv/Scripts/python.exe scripts/seed_demo.py --dry-run  # list what would be added
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.engine import make_url  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import Book, Borrow, Favorite, Review, User  # noqa: E402
from app.services.borrow_service import BorrowService  # noqa: E402


DEMO_PASSWORD = "Demo@12345"

# (username, email, role)
ACCOUNTS = [
    ("Demo Admin", "admin.demo@example.com", User.ROLE_ADMIN),
    ("Demo Librarian", "librarian.demo@example.com", User.ROLE_LIBRARIAN),
    ("Juan Dela Cruz", "juan.delacruz@example.com", User.ROLE_STUDENT),
    ("Maria Santos", "maria.santos@example.com", User.ROLE_STUDENT),
    ("Paolo Reyes", "paolo.reyes@example.com", User.ROLE_STUDENT),
    ("Angela Bautista", "angela.bautista@example.com", User.ROLE_STUDENT),
    ("Miguel Garcia", "miguel.garcia@example.com", User.ROLE_STUDENT),
    ("Bea Villanueva", "bea.villanueva@example.com", User.ROLE_STUDENT),
]

# Day offsets are relative to now: negative is in the past.
# (student email, book title, status, details)
#   BORROWED / PENDING_RETURN: borrowed = days since pickup; due = borrowed + 14 days
#   RETURNED: borrowed = days since pickup; returned = days since return
#   READY_FOR_PICKUP: approved = days since approval
#   PENDING_BORROW: requested = days since request
#   REJECTED: requested = days since request; reason
BORROWS = [
    # Overdue loans
    ("juan.delacruz@example.com", "Clean Code", Borrow.STATUS_BORROWED, {"borrowed": 22}),
    ("maria.santos@example.com", "Introduction to Algorithms", Borrow.STATUS_BORROWED, {"borrowed": 18}),
    ("angela.bautista@example.com", "Refactoring", Borrow.STATUS_BORROWED, {"borrowed": 25}),
    ("bea.villanueva@example.com", "The Selfish Gene", Borrow.STATUS_BORROWED, {"borrowed": 15}),
    # Overdue, return started by staff but not yet confirmed
    ("paolo.reyes@example.com", "Design Patterns", Borrow.STATUS_PENDING_RETURN, {"borrowed": 16}),
    # Due in the next 1-3 days
    ("juan.delacruz@example.com", "Atomic Habits", Borrow.STATUS_BORROWED, {"borrowed": 12}),
    ("maria.santos@example.com", "The Alchemist", Borrow.STATUS_BORROWED, {"borrowed": 13}),
    ("angela.bautista@example.com", "Good to Great", Borrow.STATUS_BORROWED, {"borrowed": 11}),
    ("bea.villanueva@example.com", "A Brief History of Time", Borrow.STATUS_BORROWED, {"borrowed": 12}),
    # Recently borrowed, plenty of time left
    ("paolo.reyes@example.com", "Python Crash Course", Borrow.STATUS_BORROWED, {"borrowed": 4}),
    ("miguel.garcia@example.com", "The Pragmatic Programmer", Borrow.STATUS_BORROWED, {"borrowed": 6}),
    # Approved, waiting at the desk
    ("maria.santos@example.com", "Zero to One", Borrow.STATUS_READY_FOR_PICKUP, {"approved": 1}),
    ("miguel.garcia@example.com", "Guns, Germs, and Steel", Borrow.STATUS_READY_FOR_PICKUP, {"approved": 2}),
    # Waiting for staff approval
    ("juan.delacruz@example.com", "Deep Work", Borrow.STATUS_PENDING_BORROW, {"requested": 1}),
    ("paolo.reyes@example.com", "Cosmos", Borrow.STATUS_PENDING_BORROW, {"requested": 0}),
    ("miguel.garcia@example.com", "The Lean Startup", Borrow.STATUS_PENDING_BORROW, {"requested": 2}),
    # Declined requests
    ("angela.bautista@example.com", "SPQR", Borrow.STATUS_REJECTED,
     {"requested": 6, "reason": "Reserved for a class reading list this week."}),
    ("bea.villanueva@example.com", "Code Complete", Borrow.STATUS_REJECTED,
     {"requested": 10, "reason": "Please return your overdue book before borrowing another."}),
    # Returned on time
    ("maria.santos@example.com", "1984", Borrow.STATUS_RETURNED, {"borrowed": 30, "returned": 20}),
    ("angela.bautista@example.com", "To Kill a Mockingbird", Borrow.STATUS_RETURNED, {"borrowed": 35, "returned": 23}),
    ("bea.villanueva@example.com", "The Design of Everyday Things", Borrow.STATUS_RETURNED, {"borrowed": 45, "returned": 33}),
    # Returned late
    ("juan.delacruz@example.com", "Sapiens", Borrow.STATUS_RETURNED, {"borrowed": 40, "returned": 24}),
    ("paolo.reyes@example.com", "The Great Gatsby", Borrow.STATUS_RETURNED, {"borrowed": 50, "returned": 31}),
    ("miguel.garcia@example.com", "Don't Make Me Think", Borrow.STATUS_RETURNED, {"borrowed": 28, "returned": 10}),
    ("bea.villanueva@example.com", "Database System Concepts", Borrow.STATUS_RETURNED, {"borrowed": 60, "returned": 38}),
]

# (student email, book title, rating, comment, days ago)
REVIEWS = [
    ("juan.delacruz@example.com", "Sapiens", 5, "Changed how I think about history. The chapters on the agricultural revolution stuck with me.", 23),
    ("maria.santos@example.com", "1984", 5, "Chilling and still relevant. Finished it in two sittings.", 19),
    ("paolo.reyes@example.com", "The Great Gatsby", 4, "Short and beautifully written, though the ending left me wanting more.", 30),
    ("angela.bautista@example.com", "To Kill a Mockingbird", 5, "A classic for a reason. Atticus is unforgettable.", 22),
    ("miguel.garcia@example.com", "Don't Make Me Think", 4, "Quick read with practical usability tips I used in my capstone.", 9),
    ("bea.villanueva@example.com", "The Design of Everyday Things", 4, "Made me notice bad door handles everywhere. Great for design students.", 32),
    ("bea.villanueva@example.com", "Database System Concepts", 3, "Thorough but dense. Best used alongside lectures rather than on its own.", 37),
    ("maria.santos@example.com", "The Alchemist", 4, "Simple story with a big message. A nice break from my readings.", 3),
    ("angela.bautista@example.com", "Clean Code", 5, "Every programming student should read this before their first big project.", 40),
    ("paolo.reyes@example.com", "Python Crash Course", 5, "The projects at the end are the best part. Very beginner friendly.", 1),
    ("miguel.garcia@example.com", "Clean Code", 4, "Some examples feel dated, but the principles still hold up.", 14),
    ("bea.villanueva@example.com", "Sapiens", 4, "Fascinating, if a little sweeping in places.", 12),
    ("angela.bautista@example.com", "Sapiens", 5, "One of the best non-fiction books I have read.", 8),
]

# (student email, book title)
FAVORITES = [
    ("juan.delacruz@example.com", "Sapiens"),
    ("juan.delacruz@example.com", "Deep Work"),
    ("maria.santos@example.com", "1984"),
    ("maria.santos@example.com", "The Alchemist"),
    ("maria.santos@example.com", "Zero to One"),
    ("paolo.reyes@example.com", "Python Crash Course"),
    ("paolo.reyes@example.com", "Cosmos"),
    ("angela.bautista@example.com", "Clean Code"),
    ("angela.bautista@example.com", "To Kill a Mockingbird"),
    ("miguel.garcia@example.com", "The Pragmatic Programmer"),
    ("miguel.garcia@example.com", "Don't Make Me Think"),
    ("bea.villanueva@example.com", "The Design of Everyday Things"),
    ("bea.villanueva@example.com", "Sapiens"),
]

HOLDS_COPY = {Borrow.STATUS_READY_FOR_PICKUP, Borrow.STATUS_BORROWED, Borrow.STATUS_PENDING_RETURN}


def utc_now() -> datetime:
    # Stored the same way the app stores timestamps: naive UTC.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def build_borrow(user: User, book: Book, status: str, details: dict, now: datetime) -> Borrow:
    loan = timedelta(days=BorrowService.BORROW_DURATION)
    borrow = Borrow(user.id, book.id, status=status)

    if status in (Borrow.STATUS_BORROWED, Borrow.STATUS_PENDING_RETURN, Borrow.STATUS_RETURNED):
        borrowed_at = now - timedelta(days=details["borrowed"])
        borrow.created_at = borrowed_at - timedelta(days=2)
        borrow.approved_at = borrowed_at - timedelta(days=1)
        borrow.borrowed_at = borrowed_at
        borrow.due_date = borrowed_at + loan
        if status == Borrow.STATUS_RETURNED:
            borrow.returned_at = now - timedelta(days=details["returned"])
    elif status == Borrow.STATUS_READY_FOR_PICKUP:
        approved_at = now - timedelta(days=details["approved"])
        borrow.created_at = approved_at - timedelta(hours=20)
        borrow.approved_at = approved_at
    else:  # PENDING_BORROW, REJECTED
        borrow.created_at = now - timedelta(days=details["requested"], hours=3)
        if status == Borrow.STATUS_REJECTED:
            borrow.rejection_reason = details["reason"]

    if status in HOLDS_COPY:
        book.decrement_available()
    return borrow


def seed(dry_run: bool) -> None:
    app = create_app()
    with app.app_context():
        url = make_url(app.config["SQLALCHEMY_DATABASE_URI"])
        print(f"Seeding demo data on {url.host or url.database}")
        now = utc_now()

        users = {}
        for username, email, role in ACCOUNTS:
            user = User.query.filter_by(email=email).first()
            if user:
                print(f"- skip  {email} (already exists)")
            else:
                print(f"+ add   {email} [{role}]")
                if not dry_run:
                    user = User(username=username, email=email, password=DEMO_PASSWORD, role=role)
                    db.session.add(user)
            users[email] = user
        if dry_run:
            print(f"Dry run: would add {len(BORROWS)} borrows, {len(REVIEWS)} reviews, {len(FAVORITES)} favorites.")
            return
        db.session.flush()

        books = {book.title: book for book in Book.query.all()}
        missing = {title for _, title, *_ in BORROWS + REVIEWS + FAVORITES} - books.keys()
        if missing:
            raise SystemExit(f"Run scripts/seed_catalog.py first; missing books: {sorted(missing)}")

        student_ids = [users[email].id for _, email, role in ACCOUNTS if role == User.ROLE_STUDENT]
        if Borrow.query.filter(Borrow.user_id.in_(student_ids)).first():
            db.session.commit()
            print("Demo activity already present; only accounts were checked.")
            return

        for email, title, status, details in BORROWS:
            db.session.add(build_borrow(users[email], books[title], status, details, now))
        for email, title, rating, comment, days_ago in REVIEWS:
            review = Review(user_id=users[email].id, book_id=books[title].id, rating=rating, comment=comment)
            review.created_at = now - timedelta(days=days_ago)
            db.session.add(review)
        for email, title in FAVORITES:
            db.session.add(Favorite(users[email].id, books[title].id))

        db.session.commit()
        print(f"Done: {len(BORROWS)} borrows, {len(REVIEWS)} reviews, {len(FAVORITES)} favorites added.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="list the accounts without writing anything")
    args = parser.parse_args()
    seed(dry_run=args.dry_run)
