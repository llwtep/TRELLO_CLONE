from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
engine = create_async_engine(settings.DATABASE_URL,
                             echo=True,
                             pool_pre_ping=True,
                             pool_recycle=3600)

new_session = async_sessionmaker(engine,
                                 expire_on_commit=False,
                                 autoflush=True,
                                 autocommit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncSession:
    async with new_session() as session:
        try:
            yield session
        except Exception as e:
            print(str(e))
            await session.rollback()
            raise
        finally:
            await session.close()
