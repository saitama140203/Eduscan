"""Merge all branches to a single head

Revision ID: a99e1a944841
Revises: 7d55d19ebf5e, abadc0ab2376
Create Date: 2025-06-29 15:34:00.071474

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a99e1a944841'
down_revision = ('7d55d19ebf5e', 'abadc0ab2376')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass 