from uuid import UUID
import asyncio
from app.services.EmailService import EmailService
from app.schemas.UserSchema import (UserCreate,
                                    UserSignIn,
                                    UserReadSchema)
from app.core.exceptions import (
    InvalidTokenException,
    UserNotFoundError,
    UserAlreadyVerifiedException,
    UserAlreadyExistError,
    UserNotVerifiedException,
    InvalidCredentials

)
from app.core.unitOfWork import UnitOfWork
from app.services.UserService import UserService
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)


class AuthService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.user_service = UserService(uow=uow)
        self.email_service = EmailService()

    async def verification_process(self, token: str) -> UserReadSchema:
        payload = decode_token(token, expected_type="access")
        if not payload:
            raise InvalidTokenException("Invalid token")
        async with self.uow() as uow:
            user = await uow.users.get_by_email(email=payload.get("email"))
            if not user:
                raise UserNotFoundError("User not found")
            if user.is_verified:
                raise UserAlreadyVerifiedException("User already verified")
            updated_user = await uow.users.update(user, {"is_verified": True})
        return UserReadSchema.model_validate(updated_user)

    async def get_current_user(self, access_token: str):
        async with self.uow() as uow:
            payload = decode_token(access_token, expected_type="access")
            if not payload:
                raise InvalidTokenException("Invalid token")
            uid = UUID(payload.get('sub'))
            user = await uow.users.get_by_id(uid=uid)
            if not user:
                raise UserNotFoundError("User not found")
            return UserReadSchema.model_validate(user)

    async def sign_up(self, user_in: UserCreate):
        try:
            new_user = await self.user_service.add_user(user=user_in)
        except UserAlreadyExistError as e:
            raise e
        asyncio.create_task(self.email_service.send_verification_email(new_user.email))
        return new_user

    async def signin(self, user_data: UserSignIn):
        async with self.uow() as uow:
            user = await uow.users.get_by_email(email=user_data.email)
            if not user:
                raise UserNotFoundError("User not found")
            if not user.is_verified:
                raise UserNotVerifiedException("User not verified")
            if not await verify_password(user_data.password,
                                         user.password_hash):
                raise InvalidCredentials("Invalid credentials")
            access_token = create_access_token({"sub": str(user.id)})
            refresh_token = create_refresh_token({"sub": str(user.id)})
            return {"access_token": access_token,
                    "refresh_token": refresh_token}

    async def refresh_token(self, refresh_token: str):
        payload = decode_token(refresh_token, expected_type="refresh")
        if not payload:
            return None
        async with self.uow() as uow:
            user = await uow.users.get_by_id(payload["sub"])
            if user is not None:
                new_access_token = create_access_token(data={"sub": payload["sub"]})
                return new_access_token
            else:
                raise UserNotFoundError("User not found")
