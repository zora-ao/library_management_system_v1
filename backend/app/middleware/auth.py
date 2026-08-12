from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

def admin_required():

  def decorator(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
      verify_jwt_in_request()

      claims = get_jwt()
      user_role = claims.get("role", "").lower()

      if user_role not in ["admin", "librarian"]:
        return jsonify({
          "message": "Access denied, only Admin or Librarian are allowed"
        }), 403

      return fn(*args, **kwargs)
    return wrapper
  return decorator
  