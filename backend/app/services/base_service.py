from uuid import UUID

from app.exceptions import NotFoundError, ValidationError
from app.extensions import db


class BaseService:
  """Shared helpers inherited by every service class.

  Services are stateless: each request gets its data from the database, so
  the helpers are class-level and need no instance.
  """

  @staticmethod
  def _parse_uuid(val, param_name="ID"):
    if isinstance(val, str):
      try:
        return UUID(val)
      except ValueError:
        raise ValidationError(f"Invalid {param_name} format")
    return val

  @staticmethod
  def _get_or_404(model, record_id, label, *, for_update=False):
    """Load a row by primary key or raise NotFoundError("<label> not found")."""
    record = db.session.get(model, record_id, with_for_update=for_update)
    if record is None:
      raise NotFoundError(f"{label} not found")
    return record
