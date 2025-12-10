"""change_invitation_status_to_string

Revision ID: aa91f63f87df
Revises: fix_invitation_enum
Create Date: 2025-12-10 23:01:07.974304

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'aa91f63f87df'
down_revision: Union[str, Sequence[str], None] = 'fix_invitation_enum'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - convert invitation_status from enum to varchar."""
    # Alter the column to use varchar instead of enum
    # First, we need to change the column type
    op.execute("""
        ALTER TABLE board_users 
        ALTER COLUMN status TYPE VARCHAR 
        USING status::text
    """)
    
    # Drop the enum type
    op.execute("DROP TYPE IF EXISTS invitation_status")


def downgrade() -> None:
    """Downgrade schema - convert invitation_status back to enum."""
    # Recreate the enum type
    op.execute("""
        CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected')
    """)
    
    # Alter the column to use enum instead of varchar
    op.execute("""
        ALTER TABLE board_users 
        ALTER COLUMN status TYPE invitation_status 
        USING status::invitation_status
    """)
