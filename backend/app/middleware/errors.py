from flask import Blueprint, jsonify
from sqlalchemy.exc import SQLAlchemyError
from app.extensions import db

error_bp = Blueprint("errors", __name__)

@error_bp.app_errorhandler(SQLAlchemyError)
def handle_database_error(error):
  db.session.rollback()

  return jsonify({
      "message": "A database error occurred. Transaction rolled back.",
      "error": str(error)
  }), 500

@error_bp.app_errorhandler(404)
def handle_404(error):
  return jsonify({"message": "Requested resource or endpoint not found"}), 404

@error_bp.app_errorhandler(500)
def handle_500(error):
    return jsonify({"message": "Internal server error"}), 500