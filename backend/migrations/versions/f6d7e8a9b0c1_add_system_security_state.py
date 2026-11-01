"""add system security state

Revision ID: f6d7e8a9b0c1
Revises: a1b2c3d4e5f6
Create Date: 2026-11-02
"""
import uuid

from alembic import op
import sqlalchemy as sa


revision = "f6d7e8a9b0c1"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
  security_state = op.create_table(
    "system_security_state",
    sa.Column("id", sa.SmallInteger(), nullable=False),
    sa.Column("auth_epoch", sa.String(length=36), nullable=False),
    sa.Column("maintenance_mode", sa.Boolean(), nullable=False, server_default=sa.false()),
    sa.Column("restore_started_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    sa.CheckConstraint("id = 1", name="ck_system_security_state_singleton"),
    sa.PrimaryKeyConstraint("id"),
  )
  op.bulk_insert(
    security_state,
    [{"id": 1, "auth_epoch": str(uuid.uuid4()), "maintenance_mode": False}],
  )


def downgrade():
  op.drop_table("system_security_state")
