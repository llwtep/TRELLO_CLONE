import json
from app.core.unitOfWork import UnitOfWork
from fastapi import Depends, Request, HTTPException
from app.services.AuthService import AuthService
from app.core.exceptions import UserNotAuthenticated

def get_uow() -> UnitOfWork:
    return UnitOfWork()


async def get_current_user(
        request: Request,
        uow: UnitOfWork = Depends(get_uow)
):
    token = request.cookies.get("access_token")
    if not token:
        raise UserNotAuthenticated("User not authenticated")
    service = AuthService(uow)
    try:
        user = await service.get_current_user(access_token=token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user
