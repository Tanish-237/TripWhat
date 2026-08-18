"""add trip_state column to trips

Revision ID: a1b2c3d4e5f6
Revises: f037fe63e86e
Create Date: 2026-08-12 01:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.database import PortableJSON


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f037fe63e86e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('trips', sa.Column('trip_state', PortableJSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('trips', 'trip_state')
