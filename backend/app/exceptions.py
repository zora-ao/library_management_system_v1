"""Domain exception hierarchy for the library application.

Every error the application raises on purpose derives from ``LibraryError``
and carries its own HTTP ``status_code``. One error handler (see
``app.middleware.errors``) turns any of them into a JSON response, so routes
do not need a try/except block for every expected failure.

Each subclass also inherits from the matching built-in exception, so code that
catches ``ValueError`` or ``LookupError`` keeps working.
"""


class LibraryError(Exception):
  """Base class for expected, user-facing application errors."""

  status_code = 500

  def __init__(self, message: str):
    super().__init__(message)
    self.message = message

  def to_dict(self) -> dict:
    return {"message": self.message}


class ValidationError(LibraryError, ValueError):
  """The request breaks a business rule or contains invalid input."""

  status_code = 400


class NotFoundError(LibraryError, LookupError):
  """The requested record does not exist."""

  status_code = 404


class ConflictError(LibraryError):
  """The request clashes with data that already exists (e.g. a duplicate)."""

  status_code = 409
