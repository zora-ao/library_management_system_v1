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

    try:
        borrow = BorrowService.request_borrow(user_id, book_id)
        return jsonify({
            "message": "Borrow request submitted successfully. Awaiting librarian approval.",
            "borrow": borrow.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    except Exception:
        return jsonify({"message": "Something went wrong"}), 500


# User flags a book for return
@borrows_bp.put("/<uuid:id>/return")
@jwt_required()
def return_book(id):
    user_id = get_jwt_identity()

    try:
        borrow = BorrowService.request_return(id, user_id)
        return jsonify({
            "message": "Return request submitted successfully. Please submit the physical book to the library.",
            "borrow": borrow.to_dict()
        }), 200
    except PermissionError as e:
        return jsonify({"message": str(e)}), 403
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        return jsonify({"message": str(e)}), status_code
    except Exception:
        return jsonify({"message": "Something went wrong"}), 500



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
    try:
        borrow = BorrowService.approve_borrow_request(id)
        return jsonify({
            "message": "Borrow request approved successfully",
            "borrow": borrow.to_dict()
        }), 200
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        return jsonify({"message": str(e)}), status_code
    except Exception:
        return jsonify({"message": "Something went wrong"}), 500


# Reject a borrow request
@borrows_bp.put("/admin/<uuid:id>/reject-borrow")
@admin_required()
def reject_borrow(id):
    try:
        borrow = BorrowService.reject_borrow_request(id)
        return jsonify({
            "message": "Borrow request rejected",
            "borrow": borrow.to_dict()
        }), 200
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        return jsonify({"message": str(e)}), status_code
    except Exception:
        return jsonify({"message": "Something went wrong"}), 500


# Approve a return request
@borrows_bp.put("/admin/<uuid:id>/approve-return")
@admin_required()
def approve_return(id):
    try:
        borrow = BorrowService.approve_return_request(id)
        return jsonify({
            "message": "Book return confirmed successfully",
            "borrow": borrow.to_dict()
        }), 200
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        return jsonify({"message": str(e)}), status_code
    except Exception:
        return jsonify({"message": "Something went wrong"}), 500