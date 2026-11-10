from flask import Blueprint, current_app, jsonify
from sqlalchemy.exc import SQLAlchemyError
from app.exceptions import LibraryError
from app.extensions import db

error_bp = Blueprint("errors", __name__)


@error_bp.app_errorhandler(LibraryError)
def handle_library_error(error: LibraryError):
  # Polymorphism: each LibraryError subclass supplies its own status code.
  return jsonify(error.to_dict()), error.status_code

@error_bp.app_errorhandler(SQLAlchemyError)
def handle_database_error(error):
  db.session.rollback()
  # The exception text contains SQL and parameters; keep it in the server log.
  current_app.logger.exception("Unhandled database error", exc_info=error)

  return jsonify({
      "message": "Something went wrong with the database. No changes were saved.",
  }), 500

@error_bp.app_errorhandler(404)
def handle_404(error):
  return jsonify({"message": "Page not found"}), 404

@error_bp.app_errorhandler(500)
def handle_500(error):
    return jsonify({"message": "Internal server error"}), 500
