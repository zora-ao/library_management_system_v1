"""Add borrows.created_at and normalize status values

Revision ID: b7f3a91c4d2e
Revises: 8c05d0a4ae4d
Create Date: 2026-10-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b7f3a91c4d2e'
down_revision = '8c05d0a4ae4d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('borrows', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))

    op.execute("""
        UPDATE borrows SET status = CASE
            WHEN status = 'borrowed' THEN 'BORROWED'
            WHEN status = 'overdue' THEN 'BORROWED'
            WHEN status = 'returned' THEN 'RETURNED'
            ELSE status
        END
    """)


def downgrade():
    op.execute("UPDATE borrows SET status = lower(status)")
    op.drop_column('borrows', 'created_at')
