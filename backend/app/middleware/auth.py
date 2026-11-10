from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from app.models import User


def admin_required():

  def decorator(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
      verify_jwt_in_request()

      if not User.is_staff_role(get_jwt().get("role")):
        return jsonify({
          "message": "Access denied, only Admin or Librarian are allowed"
        }), 403

      return fn(*args, **kwargs)
    return wrapper
  return decorator

def administrator_required():
  def decorator(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
      verify_jwt_in_request()
      if not User.is_admin_role(get_jwt().get("role")):
        return jsonify({"message": "Access denied, only administrators are allowed"}), 403
      return fn(*args, **kwargs)
    return wrapper
  return decorator
