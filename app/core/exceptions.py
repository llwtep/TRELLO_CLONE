class PermissionDenied(Exception):
    pass


class UserAlreadyExistError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


class UserNotVerifiedException(Exception):
    pass


class UserAlreadyVerifiedException(Exception):
    pass


class InvalidTokenException(Exception):
    pass


class DataBaseError(Exception):
    pass


class InvalidCredentials(Exception):
    pass


class BoardNotFound(Exception):
    pass

class UserNotAuthenticated(Exception):
    pass


class ListNotFound(Exception):
    pass


class CardNotFound(Exception):
    pass


class InvitationNotFound(Exception):
    pass


class InvitationAlreadyResponded(Exception):
    pass

