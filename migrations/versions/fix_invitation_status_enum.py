"""fix invitation_status enum values

Revision ID: fix_invitation_enum
Revises: a1b2c3d4e5f6
Create Date: 2025-12-10 22:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fix_invitation_enum'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix invitation_status enum to use lowercase values."""
    
    # First, alter existing data to use lowercase (if any exists)
    op.execute("""
        UPDATE board_users 
        SET status = LOWER(status::text)::invitation_status
        WHERE status IS NOT NULL;
    """)
    
    # Drop and recreate the enum with proper values
    # We need to drop the constraint first, then the type, then recreate
    op.execute("ALTER TABLE board_users ALTER COLUMN status TYPE varchar(20);")
    op.execute("DROP TYPE IF EXISTS invitation_status CASCADE;")
    op.execute("CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected');")
    op.execute("""
        ALTER TABLE board_users 
        ALTER COLUMN status TYPE invitation_status 
        USING status::invitation_status;
    """)


def downgrade() -> None:
    """Revert the enum fix."""
    # This is a fix migration, downgrade just ensures enum exists
    op.execute("ALTER TABLE board_users ALTER COLUMN status TYPE varchar(20);")
    op.execute("DROP TYPE IF EXISTS invitation_status CASCADE;")
    op.execute("CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected');")
    op.execute("""
        ALTER TABLE board_users 
        ALTER COLUMN status TYPE invitation_status 
        USING status::invitation_status;
    """)
