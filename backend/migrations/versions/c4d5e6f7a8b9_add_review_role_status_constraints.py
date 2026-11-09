"""enforce review, role and borrow status rules in the database

- One review per user per book, with ratings limited to 1-5.
- users.role limited to student / librarian / admin.
- borrows.status limited to the Borrow.STATUS_* values.

Existing data is cleaned first: borrow statuses that differ only by case are
upper-cased, and duplicate reviews keep only each user's newest review of a
book. Any other invalid rows abort the migration before constraints are added.

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-11-09
"""

from alembic import op
import sqlalchemy as sa


revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


BORROW_STATUSES = (
    "PENDING_BORROW",
    "READY_FOR_PICKUP",
    "BORROWED",
    "PENDING_RETURN",
    "RETURNED",
    "REJECTED",
    "OVERDUE",
)
USER_ROLES = ("student", "librarian", "admin")


def _in_list(values):
    return ", ".join(f"'{value}'" for value in values)


CHECK_CONSTRAINTS = (
    ("ck_reviews_rating_range", "reviews", "rating BETWEEN 1 AND 5"),
    ("ck_users_role_valid", "users", f"role IN ({_in_list(USER_ROLES)})"),
    ("ck_borrows_status_valid", "borrows", f"status IN ({_in_list(BORROW_STATUSES)})"),
)
UNIQUE_REVIEW = ("uq_reviews_user_book", "reviews", ["user_id", "book_id"])


def upgrade():
    bind = op.get_bind()

    bind.execute(
        sa.text(
            f"""
            UPDATE borrows
            SET status = UPPER(status)
            WHERE status <> UPPER(status)
              AND UPPER(status) IN ({_in_list(BORROW_STATUSES)})
            """
        )
    )
    bind.execute(
        sa.text(
            """
            DELETE FROM reviews
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY user_id, book_id
                        ORDER BY created_at DESC NULLS LAST, id DESC
                    ) AS position
                    FROM reviews
                ) ranked
                WHERE ranked.position > 1
            )
            """
        )
    )

    violations = bind.execute(
        sa.text(
            f"""
            SELECT
                (SELECT COUNT(*) FROM reviews WHERE rating < 1 OR rating > 5)
                    AS ratings_out_of_range,
                (SELECT COUNT(*) FROM users WHERE role NOT IN ({_in_list(USER_ROLES)}))
                    AS invalid_roles,
                (SELECT COUNT(*) FROM borrows WHERE status NOT IN ({_in_list(BORROW_STATUSES)}))
                    AS invalid_statuses
            """
        )
    ).mappings().one()

    invalid_counts = [f"{category}={count}" for category, count in violations.items() if count]
    if invalid_counts:
        raise RuntimeError(
            "Cannot add review/role/status constraints; invalid rows: " + ", ".join(invalid_counts)
        )

    name, table, columns = UNIQUE_REVIEW
    op.create_unique_constraint(name, table, columns)
    for name, table, condition in CHECK_CONSTRAINTS:
        op.create_check_constraint(name, table, condition)


def downgrade():
    # Removed duplicate reviews and corrected statuses are not restored.
    for name, table, _condition in reversed(CHECK_CONSTRAINTS):
        op.drop_constraint(name, table, type_="check")
    name, table, _columns = UNIQUE_REVIEW
    op.drop_constraint(name, table, type_="unique")
