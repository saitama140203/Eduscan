"""add_student_additional_fields

Revision ID: 7d55d19ebf5e
Revises: 3df79a60820e
Create Date: 2025-06-26 17:35:25.951003

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '7d55d19ebf5e'
down_revision = '3df79a60820e'
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.drop_index(op.f('ix_CAIDATLOPHOC_maLopHoc'), table_name='CAIDATLOPHOC')
    op.drop_table('CAIDATLOPHOC')
    op.add_column('HOCSINH', sa.Column('diaChi', sa.String(length=500), nullable=True))
    op.add_column('HOCSINH', sa.Column('soDienThoai', sa.String(length=20), nullable=True))
    op.add_column('HOCSINH', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('HOCSINH', sa.Column('hoTenPhuHuynh', sa.String(length=255), nullable=True))
    op.add_column('HOCSINH', sa.Column('diaChiPhuHuynh', sa.String(length=500), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:

    op.drop_column('HOCSINH', 'diaChiPhuHuynh')
    op.drop_column('HOCSINH', 'hoTenPhuHuynh')
    op.drop_column('HOCSINH', 'email')
    op.drop_column('HOCSINH', 'soDienThoai')
    op.drop_column('HOCSINH', 'diaChi')
    op.create_table('CAIDATLOPHOC',
    sa.Column('maLopHoc', sa.BIGINT(), autoincrement=False, nullable=False),
    sa.Column('maxStudents', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('allowSelfEnroll', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('requireApproval', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('emailNotifications', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('smsNotifications', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('parentNotifications', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('autoGrading', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('passingScore', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=False),
    sa.Column('retakeAllowed', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('maxRetakeAttempts', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('showStudentList', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('showScores', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('allowStudentComments', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('dataRetentionDays', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('backupFrequency', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
    sa.Column('auditLogging', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('thoiGianTao', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=False),
    sa.Column('thoiGianCapNhat', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['maLopHoc'], ['LOPHOC.maLopHoc'], name=op.f('CAIDATLOPHOC_maLopHoc_fkey'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('maLopHoc', name=op.f('CAIDATLOPHOC_pkey'))
    )
    op.create_index(op.f('ix_CAIDATLOPHOC_maLopHoc'), 'CAIDATLOPHOC', ['maLopHoc'], unique=False)
    # ### end Alembic commands ### 