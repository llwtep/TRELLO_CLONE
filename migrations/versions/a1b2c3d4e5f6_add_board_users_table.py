"""add board_users table

Revision ID: a1b2c3d4e5f6
Revises: e4733106694b
Create Date: 2025-12-10 21:57:31.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e4733106694b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum type for invitation status only if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create board_users table
    op.create_table('board_users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('board_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'accepted', 'rejected', name='invitation_status', create_type=False), nullable=False),
        sa.Column('invited_by', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['board_id'], ['boards.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )



def downgrade() -> None:
    """Downgrade schema."""
    # Drop board_users table
    op.drop_table('board_users')
    
    # Drop enum type
    invitation_status_enum = postgresql.ENUM('pending', 'accepted', 'rejected', name='invitation_status')
    invitation_status_enum.drop(op.get_bind(), checkfirst=True)
