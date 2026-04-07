from fastapi import HTTPException, status


class KaleidoException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, details: dict | None = None):
        self.code = code
        self.error_details = details
        super().__init__(status_code=status_code, detail=message)


class NotFoundError(KaleidoException):
    def __init__(self, resource: str, resource_id: str | None = None):
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with id '{resource_id}' not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=message,
        )


class ValidationError(KaleidoException):
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=message,
            details=details,
        )


class AuthenticationError(KaleidoException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTHENTICATION_ERROR",
            message=message,
        )


class AuthorizationError(KaleidoException):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code="AUTHORIZATION_ERROR",
            message=message,
        )
