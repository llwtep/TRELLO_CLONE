from app.database.session import new_session
from contextlib import asynccontextmanager
from app.repositories.UserRepo import UserRepository
from app.repositories.BoardRepo import BoardRepository
from app.repositories.ListRepo import ListRepository
from app.repositories.CardRepo import CardRepository
from app.repositories.BoardUserRepository import BoardUserRepository


class _UnitOfWork:
    def __init__(self, session):
        self.session = session
        self.users = UserRepository(session)
        self.board = BoardRepository(session)
        self.list = ListRepository(session)
        self.card = CardRepository(session)
        self.board_user = BoardUserRepository(session)



class UnitOfWork:
    def __init__(self, session_factory=new_session):
        self.session_factory = session_factory

    @asynccontextmanager
    async def __call__(self):
        session = self.session_factory()
        uow = _UnitOfWork(session)
        try:
            yield uow
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            session.close()
