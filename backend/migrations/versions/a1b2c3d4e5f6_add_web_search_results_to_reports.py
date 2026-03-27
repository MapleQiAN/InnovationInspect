"""add web_search_results to reports

Revision ID: a1b2c3d4e5f6
Revises: 96963b31329c
Create Date: 2026-03-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '96963b31329c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('reports', sa.Column(
        'web_search_results',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
        server_default='[]',
    ))


def downgrade() -> None:
    op.drop_column('reports', 'web_search_results')
