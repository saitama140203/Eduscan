"""allow_null_ma_to_chuc_for_system_templates

Revision ID: 3df79a60820e
Revises: 38fa0e9e717d
Create Date: 2025-06-26 03:17:04.977986

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3df79a60820e'
down_revision = '38fa0e9e717d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Cho phép maToChuc = NULL để Admin có thể tạo system templates
    op.alter_column('MAUPHIEUTRALOI', 'maToChuc',
                    existing_type=sa.BIGINT(),
                    nullable=True)


def downgrade() -> None:
    # Revert back to nullable=False
    op.alter_column('MAUPHIEUTRALOI', 'maToChuc',
                    existing_type=sa.BIGINT(),
                    nullable=False) 