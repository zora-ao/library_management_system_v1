from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.middleware.auth import admin_required
from app.services.borrow_service import BorrowService

borrows_bp = Blueprint("borrow", __name__, url_prefix="/api/borrows")


# Getting borrowed history (returned/rejected requests)
@borrows_bp.get("/history")
@jwt_required()
def get_borrowed_history():
    user_id = get_jwt_identity()
    history = BorrowService.get_borrowed_history(user_id)
    return jsonify([borrow.to_dict() for borrow in history]), 200


# Getting current active requests or borrowed books
@borrows_bp.get("/me")
@jwt_required()
def get_borrowed_books():
    user_id = get_jwt_identity()
    active_borrows = BorrowService.get_user_active_borrows(user_id)

    if not active_borrows:
        return jsonify({
            "message": "You don't have active borrowed books or requests",
            "borrowed_books": []
        }), 200

    result = [borrow.to_dict() for borrow in active_borrows]

    return jsonify({
        "count": len(result),
        "borrowed_books": result
    }), 200


# User requests to borrow a book
@borrows_bp.post("")
@jwt_required()
def borrow_book():
    user_id = get_jwt_identity()
    data = request.get_json()

    if data is None:
        return jsonify({"message": "Request body must be JSON"}), 400

    book_id = data.get("book_id")

    if not book_id:
        return jsonify({"message": "Book id is required"}), 400

    # Business-rule failures raise LibraryError subclasses, which the global
    # handler in app/middleware/errors.py turns into 400/404 JSON responses.
    borrow = BorrowService.request_borrow(user_id, book_id)
    return jsonify({
        "message": "Borrow request submitted successfully. Waiting for librarian approval.",
        "borrow": borrow.to_dict()
    }), 201


# Returns are recorded by staff at the library desk (see approve-return below);
# students do not submit return requests themselves.


# View all records
@borrows_bp.get("/admin/all")
@admin_required()
def get_all_borrows_admin():
    borrows = BorrowService.get_all_borrows_admin()
    return jsonify([borrow.to_dict() for borrow in borrows]), 200


# Approve a borrow request
@borrows_bp.put("/admin/<uuid:id>/approve-borrow")
@admin_required()
def approve_borrow(id):
    borrow = BorrowService.approve_borrow_request(id)
    return jsonify({
        "message": "Borrow request approved and reserved for pickup",
        "borrow": borrow.to_dict()
    }), 200


# Reject a borrow request
@borrows_bp.put("/admin/<uuid:id>/reject-borrow")
@admin_required()
def reject_borrow(id):
    data = request.get_json(silent=True)
    reason = data.get("reason") if isinstance(data, dict) else None
    if not isinstance(reason, str) or not reason.strip():
        return jsonify({"message": "Rejection reason is required"}), 400

    borrow = BorrowService.reject_borrow_request(id, reason.strip())
    return jsonify({
        "message": "Borrow request rejected",
        "borrow": borrow.to_dict()
    }), 200


# Confirm that an approved reservation was physically picked up
@borrows_bp.put("/admin/<uuid:id>/confirm-pickup")
@admin_required()
def confirm_pickup(id):
    borrow = BorrowService.confirm_borrow_pickup(id)
    return jsonify({
        "message": "Book pickup confirmed and loan started",
        "borrow": borrow.to_dict()
    }), 200


# Approve a return request
@borrows_bp.put("/admin/<uuid:id>/approve-return")
@admin_required()
def approve_return(id):
    borrow = BorrowService.approve_return_request(id)
    return jsonify({
        "message": "Book return confirmed successfully",
        "borrow": borrow.to_dict()
    }), 200
