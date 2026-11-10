from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.middleware.auth import admin_required
from app.models import User
from app.services.dashboard_service import DashboardService


dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.get("")
@admin_required()
def get_dashboard():
    raw_offset = request.args.get("timezone_offset_minutes", "0")
    try:
        timezone_offset_minutes = int(raw_offset)
    except (TypeError, ValueError):
        return jsonify({"message": "timezone_offset_minutes must be an integer"}), 400

    if not -840 <= timezone_offset_minutes <= 840:
        return jsonify({"message": "timezone_offset_minutes is out of range"}), 400

    timezone_name = request.args.get("timezone") or None
    if timezone_name:
        try:
            ZoneInfo(timezone_name)
        except (ZoneInfoNotFoundError, ValueError):
            return jsonify({"message": "timezone is invalid"}), 400

    include_user_count = User.is_admin_role(get_jwt().get("role"))
    return jsonify(
        DashboardService.get_summary(
            include_user_count=include_user_count,
            timezone_offset_minutes=timezone_offset_minutes,
            timezone_name=timezone_name,
        )
    ), 200
