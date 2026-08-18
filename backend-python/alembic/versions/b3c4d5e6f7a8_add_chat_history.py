"""add chat_history and conversation_id columns to trips

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-08-18 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.database import PortableJSON


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('trips', sa.Column('chat_history', PortableJSON(), nullable=True))
    op.add_column('trips', sa.Column('conversation_id', sa.String(36), nullable=True))
    op.create_index('ix_trips_conversation_id', 'trips', ['conversation_id'])


def downgrade() -> None:
    op.drop_index('ix_trips_conversation_id', table_name='trips')
    op.drop_column('trips', 'conversation_id')
    op.drop_column('trips', 'chat_history')
