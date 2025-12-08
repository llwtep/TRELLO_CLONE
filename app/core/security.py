import asyncio
from datetime import timedelta, datetime, UTC
from typing import Optional
import jwt
from jwt import PyJWTError
from passlib.context import CryptContext
from app.config import settings
from concurrent.futures import ThreadPoolExecutor

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 15

pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')
executor = ThreadPoolExecutor(max_workers=4)


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")
    return pwd_context.hash(password)


async def verify_password(password: str, hashed_password: str) -> bool:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(executor, pwd_context.verify, password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({'exp': expire,
                      "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    expire = datetime.now(UTC) + timedelta(days=7)
    to_encode = {"sub": data["sub"],
                 "exp": expire,
                 "type": "refresh"}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload
    except PyJWTError:
        return None
