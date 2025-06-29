"""fix_image_url_type

Revision ID: abadc0ab2376
Revises: 38fa0e9e717d
Create Date: 2024-06-29 06:22:20.916174

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'abadc0ab2376'
down_revision = '38fa0e9e717d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('PHIEUTRALOI', 'urlHinhAnh',
               existing_type=sa.VARCHAR(length=255),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.alter_column('PHIEUTRALOI', 'urlHinhAnhXuLy',
               existing_type=sa.VARCHAR(length=255),
               type_=sa.TEXT(),
               existing_nullable=True)


def downgrade() -> None:
    op.alter_column('PHIEUTRALOI', 'urlHinhAnhXuLy',
               existing_type=sa.TEXT(),
               type_=sa.VARCHAR(length=255),
               existing_nullable=True)
    op.alter_column('PHIEUTRALOI', 'urlHinhAnh',
               existing_type=sa.TEXT(),
               type_=sa.VARCHAR(length=255),
               existing_nullable=True) 