from typing import Any

from flask import Blueprint, current_app, jsonify, request

from app.dsa import normalize_isbn, normalize_text
from app.middleware.auth import admin_required
from app.services.dsa_demo_service import DsaDemoService


dsa_bp = Blueprint("dsa", __name__, url_prefix="/api/dsa")

_OPERATIONS = (
    "linear_contains",
    "search_compare",
    "merge_sort",
    "hash_compare",
    "bst_range",
)
_SEARCH_FIELDS = ("title", "author", "isbn")
_BINARY_SORTABLE_FIELDS = ("title", "author")
_SORT_FIELDS = ("title", "author", "available_copies", "created_at")
_DIRECTIONS = ("asc", "desc")


def _require_text(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} must be a non-empty string")
    if len(value) > 200:
        raise ValueError(f"{key} must be at most 200 characters")
    return value


def _validated_limit(payload: dict[str, Any]) -> int:
    limit = payload.get("limit", 25)
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
        raise ValueError("limit must be an integer from 1 to 100")
    return limit


def _validate_linear_contains(payload: dict[str, Any]) -> None:
    _require_text(payload, "query")
    fields = payload.get("fields")
    if not isinstance(fields, list) or not fields:
        raise ValueError("fields must contain one to three search fields")
    if len(fields) > 3:
        raise ValueError("fields must contain one to three search fields")
    seen: list[str] = []
    for field in fields:
        if field not in _SEARCH_FIELDS:
            raise ValueError(f"Unsupported search field: {field}")
        if field in seen:
            raise ValueError("fields must not contain duplicates")
        seen.append(field)


def _validate_search_compare(payload: dict[str, Any]) -> None:
    _require_text(payload, "query")
    field = payload.get("field")
    if field not in _BINARY_SORTABLE_FIELDS:
        raise ValueError("field must be title or author for binary comparison")


def _validate_merge_sort(payload: dict[str, Any]) -> None:
    field = payload.get("field")
    if field not in _SORT_FIELDS:
        raise ValueError(f"Unsupported sort field: {field}")
    direction = payload.get("direction")
    if direction not in _DIRECTIONS:
        raise ValueError("direction must be asc or desc")


def _validate_hash_compare(payload: dict[str, Any]) -> None:
    query = _require_text(payload, "query")
    if not normalize_isbn(query):
        raise ValueError("query must contain an ISBN value")


def _validate_bst_range(payload: dict[str, Any]) -> None:
    range_start = _require_text(payload, "range_start")
    range_end = _require_text(payload, "range_end")
    if normalize_text(range_start) > normalize_text(range_end):
        raise ValueError("range_start must not be greater than range_end")


def _validate_payload(data: Any) -> tuple[str, dict[str, Any]]:
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")
    operation = data.get("operation")
    if operation not in _OPERATIONS:
        raise ValueError("Unsupported DSA operation")

    payload = dict(data)
    payload["limit"] = _validated_limit(payload)
    if operation == "linear_contains":
        _validate_linear_contains(payload)
    elif operation == "search_compare":
        _validate_search_compare(payload)
    elif operation == "merge_sort":
        _validate_merge_sort(payload)
    elif operation == "hash_compare":
        _validate_hash_compare(payload)
    else:
        _validate_bst_range(payload)
    return operation, payload


@dsa_bp.post("/books/run")
@admin_required()
def run_book_dsa():
    try:
        operation, payload = _validate_payload(request.get_json(silent=True))
        return jsonify(DsaDemoService.run(operation, payload)), 200
    except ValueError as error:
        return jsonify({"message": str(error)}), 400
    except Exception:
        current_app.logger.exception("dsa_operation_failed")
        return jsonify({"message": "Unable to run DSA operation"}), 500
