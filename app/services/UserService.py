from app.schemas.UserSchema import UserCreate, UserReadSchema
from app.core.security import hash_password
from app.core.unitOfWork import UnitOfWork
from app.database.models.User import UserModel
from app.core.exceptions import (UserNotFoundError,
                                 UserAlreadyExistError)


class UserService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def get_user_by_email(self, email: str) -> UserReadSchema:
        async with self.uow() as uow:
            user = await uow.users.get_by_email(email=email)
            if not user:
                raise UserNotFoundError("User not found")
            return UserReadSchema.model_validate(user)

    async def add_user(self, user: UserCreate) -> UserReadSchema:
        async with self.uow() as uow:
            existing_user = await uow.users.get_by_email(email=user.email)
            if existing_user:
                raise UserAlreadyExistError("User already exist")
            try:
                hashed_pass = hash_password(user.password)
            except ValueError as e:
                raise ValueError(f"Password error {str(e)}")

            new_user = UserModel(
                email=user.email,
                username=user.username,
                password_hash=hashed_pass
            )
            user_entity = await uow.users.add(new_user)
            return UserReadSchema.model_validate(user_entity)

    # async def get_all_users(self, role: str) -> List[UserReadSchema]:
    #     if role != UserRole.ADMIN:
    #         raise PermissionDenied("Only Admin can view")
    #     async with self.uow() as uow:
    #         users = await uow.users.get_all()
    #         if not users:
    #             raise UserNotFoundError("Users not found")
    #         return [UserReadSchema.model_validate(user) for user in users]
    #
    # async def get_user_by_id(self, user_id: str, role: str) -> UserReadSchema:
    #     if role != UserRole.ADMIN:
    #         raise PermissionDenied("Only Admin can view")
    #     async with self.uow() as uow:
    #         user = await uow.users.get_by_id(UUID(user_id))
    #         if not user:
    #             raise UserNotFoundError("User not found")
    #         return UserReadSchema.model_validate(user)
    #
    # async def delete_user_by_id(self, user_id: str, role: str) -> dict:
    #     if role != UserRole.ADMIN:
    #         raise PermissionDenied("Only Admin can view")
    #     async with self.uow() as uow:
    #         user = await uow.users.get_by_id(uid=UUID(user_id))
    #         if not user:
    #             raise UserNotFoundError("User not found")
    #         await uow.users.delete(user)
    #         return {"msg": f"User: {user.id} successfully deleted"}
    #
    # async def update_user_by_id(self, user_id_to_change: str,
    #                             update_data: UserUpdate,
    #                             owner: UserReadSchema) -> UserReadSchema:
    #     async with self.uow() as uow:
    #         target_user = await uow.users.get_by_id(UUID(user_id_to_change))
    #
    #         if not target_user:
    #             raise UserNotFoundError("User not found")
    #         if owner.role != UserRole.ADMIN and user_id_to_change != str(owner.id):
    #             raise PermissionDenied("Permission denied")
    #
    #         update_fields = update_data.model_dump(exclude_unset=True, exclude_none=True)
    #         if owner.role != UserRole.ADMIN and "role" in update_fields:
    #             update_fields.pop("role")
    #         updated_user = await uow.users.update(target_user, update_fields)
    #         return UserReadSchema.model_validate(updated_user)
    #
    # async def delete_unverified_users(self):
    #     async with self.uow() as uow:
    #         deleted_count = await uow.users.delete_old_unverified()
    #         return deleted_count