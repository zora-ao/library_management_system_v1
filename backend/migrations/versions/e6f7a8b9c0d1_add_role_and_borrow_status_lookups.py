"""normalize roles and borrow statuses into lookup tables (3NF)

users.role and borrows.status were free strings guarded by CHECK
constraints. They now reference the roles and borrow_statuses lookup
tables, which also hold a description for each value. The natural key is
kept, so stored values ("admin", "BORROWED") and the API do not change.

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-11-09
"""

from alembic import op
import sqlalchemy as sa


revision = "e6f7a8b9c0d1"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


# Frozen copies of Role.SEED and BorrowStatus.SEED at the time of this migration.
ROLES = (
    ("student", "Borrows, reviews and saves books from the catalog"),
    ("librarian", "Manages the catalog, borrow requests and returns"),
    ("admin", "Full access, including user management and backups"),
)
BORROW_STATUSES = (
    ("PENDING_BORROW", "Requested by a student, waiting for staff approval"),
    ("READY_FOR_PICKUP", "Approved and waiting at the desk for pickup"),
    ("BORROWED", "Checked out to the student"),
    ("PENDING_RETURN", "Return started, waiting for staff to confirm"),
    ("RETURNED", "Returned and checked in"),
    ("REJECTED", "Request declined by staff"),
    ("OVERDUE", "Past the due date and not yet returned"),
)

# (fk name, source table, source column, lookup table, lookup key, check name)
LINKS = (
    ("fk_users_role_roles", "users", "role", "roles", "name", "ck_users_role_valid"),
    ("fk_borrows_status_borrow_statuses", "borrows", "status", "borrow_statuses", "code",
     "ck_borrows_status_valid"),
)


def _in_list(values):
    return ", ".join(f"'{value}'" for value in values)


def upgrade():
    roles = op.create_table(
        "roles",
        sa.Column("name", sa.String(length=20), primary_key=True),
        sa.Column("description", sa.String(length=255), nullable=False),
    )
    op.bulk_insert(roles, [{"name": n, "description": d} for n, d in ROLES])

    statuses = op.create_table(
        "borrow_statuses",
        sa.Column("code", sa.String(length=30), primary_key=True),
        sa.Column("description", sa.String(length=255), nullable=False),
    )
    op.bulk_insert(statuses, [{"code": c, "description": d} for c, d in BORROW_STATUSES])

    # Existing rows already satisfy the CHECK constraints, so every value has
    # a matching lookup row and the foreign keys can be added directly.
    for fk_name, table, column, lookup, key, check_name in LINKS:
        op.drop_constraint(check_name, table, type_="check")
        op.create_foreign_key(fk_name, table, lookup, [column], [key], onupdate="CASCADE")


def downgrade():
    checks = {
        "ck_users_role_valid": f"role IN ({_in_list(n for n, _ in ROLES)})",
        "ck_borrows_status_valid": f"status IN ({_in_list(c for c, _ in BORROW_STATUSES)})",
    }
    for fk_name, table, _column, _lookup, _key, check_name in reversed(LINKS):
        op.drop_constraint(fk_name, table, type_="foreignkey")
        op.create_check_constraint(check_name, table, checks[check_name])
    op.drop_table("borrow_statuses")
    op.drop_table("roles")
