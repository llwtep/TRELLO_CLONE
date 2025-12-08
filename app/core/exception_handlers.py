from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from app.core.exceptions import (
    UserAlreadyExistError,
    UserNotFoundError,
    UserAlreadyVerifiedException,
    InvalidTokenException,
    InvalidCredentials,
    UserNotVerifiedException,
    BoardNotFound,
    UserNotAuthenticated,
    ListNotFound,
    CardNotFound
)


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(UserAlreadyExistError)
    async def user_exists_handler(_, __):
        return JSONResponse(status_code=409, content={"detail": "User already exists"})

    @app.exception_handler(UserNotFoundError)
    async def user_not_found_handler(_, __):
        return JSONResponse(status_code=404, content={"detail": "User not found"})

    @app.exception_handler(InvalidCredentials)
    async def invalid_credentials_handler(_, __):
        return JSONResponse(status_code=401, content={"detail": "Invalid credentials"})

    @app.exception_handler(UserNotVerifiedException)
    async def not_verified_handler(_, __):
        return JSONResponse(status_code=403, content={"detail": "User not verified"})

    @app.exception_handler(InvalidTokenException)
    async def invalid_token_handler(_, __):
        return JSONResponse(status_code=400, content={"detail": "Invalid or expired token"})

    @app.exception_handler(BoardNotFound)
    async def border_not_found(_, __):
        return JSONResponse(status_code=404, content={"detail": "Border not found in db"})
    @app.exception_handler(UserNotAuthenticated)
    async def user_not_authenticated_handler(_, __):
        return JSONResponse(status_code=401, content={"detail": "User not authenticated"})

    @app.exception_handler(ListNotFound)
    async def list_not_found(_, __):
        return JSONResponse(status_code=404, content={"detail": "List not found"})

    @app.exception_handler(CardNotFound)
    async def card_not_found(_, __):
        return JSONResponse(status_code=404, content={"detail": "Card not found"})
