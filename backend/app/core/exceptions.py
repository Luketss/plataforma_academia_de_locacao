class AppException(Exception):
    """Erro de domínio. Vira {"success": false, "error": {code, message}}."""

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, message: str = "Recurso não encontrado"):
        super().__init__(code="NOT_FOUND", message=message, status_code=404)


class ConflictException(AppException):
    def __init__(self, message: str = "Conflito"):
        super().__init__(code="CONFLICT", message=message, status_code=409)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Não autenticado"):
        super().__init__(code="UNAUTHORIZED", message=message, status_code=401)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Acesso negado"):
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


class ValidationException(AppException):
    def __init__(self, message: str):
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=422)
