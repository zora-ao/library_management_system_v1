"""Seed the catalog with starter categories and books, including cover images.

Covers are fetched from Open Library by ISBN and uploaded to the project's
Cloudinary folder, the same place covers added through the admin form go.
Books that already exist (matched by ISBN) are skipped, so the script is safe
to run more than once.

Usage (from backend/):
    .venv/Scripts/python.exe scripts/seed_catalog.py            # seeds DATABASE_URL from .env
    .venv/Scripts/python.exe scripts/seed_catalog.py --dry-run  # list what would be added
    .venv/Scripts/python.exe scripts/seed_catalog.py --no-upload  # link Open Library covers directly
    .venv/Scripts/python.exe scripts/seed_catalog.py --refresh-covers  # move linked covers to Cloudinary
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.engine import make_url  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import Book  # noqa: E402
from app.services.book_service import BookService  # noqa: E402
from app.utils.cloudinary import upload_book_cover  # noqa: E402


OPEN_LIBRARY_COVER = "https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false"

# (category, title, author, isbn, pages, copies, description <= 250 chars)
CATALOG = [
    ("Programming", "Clean Code", "Robert C. Martin", "9780132350884", 431, 4,
     "A handbook of agile software craftsmanship: how to write code that is readable, maintainable and easy to change."),
    ("Programming", "The Pragmatic Programmer", "David Thomas, Andrew Hunt", "9780135957059", 352, 3,
     "Practical advice on becoming a better developer, from personal responsibility and career growth to architecture and testing."),
    ("Programming", "Python Crash Course", "Eric Matthes", "9781593279288", 544, 5,
     "A hands-on, project-based introduction to Python that takes beginners from basic syntax to building games and web apps."),
    ("Programming", "Refactoring", "Martin Fowler", "9780134757599", 448, 2,
     "A catalog of techniques for improving the design of existing code safely, one small behavior-preserving step at a time."),
    ("Programming", "Design Patterns", "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides", "9780201633610", 395, 2,
     "The classic Gang of Four catalog of 23 reusable object-oriented design patterns and when to apply them."),
    ("Programming", "Code Complete", "Steve McConnell", "9780735619678", 914, 2,
     "A comprehensive guide to software construction covering design, coding style, debugging and code quality."),
    ("Computer Science", "Introduction to Algorithms", "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein", "9780262033848", 1292, 3,
     "The standard reference on algorithms and data structures, from sorting and searching to graphs and dynamic programming."),
    ("Computer Science", "Database System Concepts", "Abraham Silberschatz, Henry F. Korth, S. Sudarshan", "9780078022159", 1376, 2,
     "A foundational textbook on database design, SQL, transactions, indexing and query processing."),
    ("Design", "Don't Make Me Think", "Steve Krug", "9780321965516", 216, 3,
     "A short, practical guide to web and mobile usability: design pages people can understand at a glance."),
    ("Design", "The Design of Everyday Things", "Don Norman", "9780465050659", 368, 2,
     "Why some products satisfy and others frustrate, and how good design makes objects intuitive to use."),
    ("Self-Help", "Atomic Habits", "James Clear", "9780735211292", 320, 5,
     "A proven framework for building good habits and breaking bad ones through tiny changes that compound over time."),
    ("Self-Help", "Deep Work", "Cal Newport", "9781455586691", 295, 3,
     "Rules for focused success in a distracted world, and why the ability to concentrate deeply is a superpower."),
    ("Business", "The Lean Startup", "Eric Ries", "9780307887894", 336, 2,
     "How startups can use continuous innovation, quick experiments and validated learning to build products people want."),
    ("Science", "A Brief History of Time", "Stephen Hawking", "9780553380163", 212, 3,
     "An accessible tour of the universe, from the big bang and black holes to the nature of time itself."),
    ("History", "Sapiens", "Yuval Noah Harari", "9780062316097", 464, 3,
     "A brief history of humankind, tracing how Homo sapiens came to dominate the planet through cognition, agriculture and science."),
    ("Fiction", "The Alchemist", "Paulo Coelho", "9780062315007", 208, 4,
     "A shepherd boy travels from Spain to Egypt in search of treasure and discovers the importance of following his dreams."),
    ("Fiction", "1984", "George Orwell", "9780451524935", 328, 3,
     "A dystopian novel about a totalitarian state where Big Brother watches everyone and truth is rewritten by the Party."),
    ("Fiction", "To Kill a Mockingbird", "Harper Lee", "9780060935467", 336, 3,
     "A young girl in 1930s Alabama watches her father defend a Black man falsely accused of a crime."),
    ("Fiction", "The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", 180, 3,
     "The mysterious millionaire Jay Gatsby and his obsession with Daisy Buchanan in the Jazz Age of the 1920s."),
]


def cover_url(isbn: str, upload: bool) -> str:
    source = OPEN_LIBRARY_COVER.format(isbn=isbn)
    if not upload:
        return source
    try:
        return upload_book_cover(source)
    except Exception as error:  # keep seeding even if one upload fails
        print(f"  ! Cloudinary upload failed ({error}); linking Open Library cover instead")
        return source


def seed(dry_run: bool, upload: bool) -> None:
    app = create_app()
    with app.app_context():
        url = make_url(app.config["SQLALCHEMY_DATABASE_URI"])
        print(f"Seeding database on {url.host or url.database}")

        existing = {isbn for (isbn,) in db.session.query(Book.isbn).filter(Book.isbn.isnot(None))}
        added = 0
        for category, title, author, isbn, pages, copies, description in CATALOG:
            if isbn in existing:
                print(f"- skip  {title} (already in catalog)")
                continue
            print(f"+ add   {title} [{category}]")
            if dry_run:
                continue

            book = Book(
                title=title,
                author=author,
                total_copies=copies,
                isbn=isbn,
                category_id=BookService.get_or_create_category(category),
                description=description,
                pages=pages,
                image_url=cover_url(isbn, upload),
            )
            db.session.add(book)
            db.session.commit()
            added += 1

        print(f"Done: {added} book(s) added." if not dry_run else "Dry run: nothing was written.")


def refresh_covers() -> None:
    """Move covers that still point at Open Library into Cloudinary."""
    app = create_app()
    with app.app_context():
        books = Book.query.filter(Book.image_url.like("https://covers.openlibrary.org/%")).all()
        print(f"{len(books)} cover(s) to upload")
        for book in books:
            try:
                book.image_url = upload_book_cover(book.image_url)
                db.session.commit()
                print(f"+ uploaded  {book.title}")
            except Exception as error:
                db.session.rollback()
                print(f"! failed    {book.title}: {error}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="list the books without writing anything")
    parser.add_argument("--no-upload", action="store_true", help="link Open Library covers instead of uploading to Cloudinary")
    parser.add_argument("--refresh-covers", action="store_true", help="upload Open Library covers already in the catalog to Cloudinary")
    args = parser.parse_args()
    if args.refresh_covers:
        refresh_covers()
    else:
        seed(dry_run=args.dry_run, upload=not args.no_upload)
