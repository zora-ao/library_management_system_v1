"""add lookup indexes for borrows, reviews and books

PostgreSQL does not index foreign keys automatically, so per-user borrow
lists, per-book circulation checks and review aggregates were sequential
scans.

Revision ID: b3c4d5e6f7a8
Revises: a7b8c9d0e1f2
Create Date: 2026-11-08
"""

from alembic import op


revision = "b3c4d5e6f7a8"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


INDEXES = (
    ("ix_borrows_user_id_status", "borrows", ["user_id", "status"]),
    ("ix_borrows_book_id_status", "borrows", ["book_id", "status"]),
    ("ix_borrows_status", "borrows", ["status"]),
    ("ix_reviews_book_id", "reviews", ["book_id"]),
    ("ix_books_category_id", "books", ["category_id"]),
)


def upgrade():
    for name, table, columns in INDEXES:
        op.create_index(name, table, columns, unique=False)


def downgrade():
    for name, table, _columns in reversed(INDEXES):
        op.drop_index(name, table_name=table)
