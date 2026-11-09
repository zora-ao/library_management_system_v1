"""drop the unused students table

Student profile fields (student_number, course, year_level,
enrollment_status) were never surfaced in the app: every row held only
nulls and a fixed "Enrolled" status. Students are identified by
users.role alone.

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-11-09
"""

from alembic import op
import sqlalchemy as sa


revision = "d5e6f7a8b9c0"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("students")


def downgrade():
    # Recreates the empty table; the dropped profile rows are not restored.
    op.create_table(
        "students",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("student_number", sa.String(length=50), nullable=True),
        sa.Column("course", sa.String(length=100), nullable=True),
        sa.Column("year_level", sa.String(length=50), nullable=True),
        sa.Column("enrollment_status", sa.String(length=50), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_number"),
        sa.UniqueConstraint("user_id"),
    )
