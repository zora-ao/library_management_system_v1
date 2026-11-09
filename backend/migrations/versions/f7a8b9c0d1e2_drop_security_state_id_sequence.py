"""drop the unused sequence behind system_security_state.id

The table holds a single row with id = 1, but its SMALLINT primary key was
created as SMALLSERIAL, attaching system_security_state_id_seq. Backups
exclude this table, yet pg_dump still writes the sequence, so restoring a
backup with pg_restore --clean tried to drop a sequence the live table
depended on and every restore failed.

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-11-09
"""

from alembic import op


revision = "f7a8b9c0d1e2"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE system_security_state ALTER COLUMN id DROP DEFAULT")
    op.execute("DROP SEQUENCE IF EXISTS system_security_state_id_seq")


def downgrade():
    op.execute("CREATE SEQUENCE IF NOT EXISTS system_security_state_id_seq AS smallint")
    op.execute(
        "ALTER SEQUENCE system_security_state_id_seq OWNED BY system_security_state.id"
    )
    op.execute(
        "SELECT setval('system_security_state_id_seq', "
        "COALESCE((SELECT MAX(id) FROM system_security_state), 1))"
    )
    op.execute(
        "ALTER TABLE system_security_state ALTER COLUMN id "
        "SET DEFAULT nextval('system_security_state_id_seq')"
    )
