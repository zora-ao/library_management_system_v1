"""add book integrity constraints

Revision ID: a7b8c9d0e1f2
Revises: f6d7e8a9b0c1
Create Date: 2026-11-04
"""

from alembic import op
import sqlalchemy as sa


revision = "a7b8c9d0e1f2"
down_revision = "f6d7e8a9b0c1"
branch_labels = None
depends_on = None


BOOK_INTEGRITY_CONSTRAINTS = (
    (
        "ck_books_total_copies_positive",
        "total_copies >= 1",
    ),
    (
        "ck_books_available_copies_nonnegative",
        "available_copies >= 0",
    ),
    (
        "ck_books_available_not_above_total",
        "available_copies <= total_copies",
    ),
    (
        "ck_books_pages_positive",
        "pages IS NULL OR pages > 0",
    ),
)


def upgrade():
    violations = op.get_bind().execute(
        sa.text(
            """
            SELECT
                COUNT(*) FILTER (WHERE total_copies < 1)
                    AS invalid_total_copies,
                COUNT(*) FILTER (WHERE available_copies < 0)
                    AS negative_available_copies,
                COUNT(*) FILTER (WHERE available_copies > total_copies)
                    AS available_above_total,
                COUNT(*) FILTER (WHERE pages IS NOT NULL AND pages <= 0)
                    AS nonpositive_pages
            FROM books
            """
        )
    ).mappings().one()

    invalid_counts = [
        f"{category}={count}"
        for category, count in violations.items()
        if count
    ]
    if invalid_counts:
        raise RuntimeError(
            "Cannot add book integrity constraints; invalid rows: "
            + ", ".join(invalid_counts)
        )

    for name, condition in BOOK_INTEGRITY_CONSTRAINTS:
        op.create_check_constraint(name, "books", condition)


def downgrade():
    for name, _condition in reversed(BOOK_INTEGRITY_CONSTRAINTS):
        op.drop_constraint(name, "books", type_="check")
