from sqlalchemy import event

from app.extensions import db


class BorrowStatus(db.Model):
  """Lookup table for borrow states; borrows.status references borrow_statuses.code."""

  __tablename__ = "borrow_statuses"

  # Seed rows, inserted when the table is created. Must match Borrow.STATUSES.
  SEED = (
    ("PENDING_BORROW", "Requested by a student, waiting for staff approval"),
    ("READY_FOR_PICKUP", "Approved and waiting at the desk for pickup"),
    ("BORROWED", "Checked out to the student"),
    ("PENDING_RETURN", "Return started, waiting for staff to confirm"),
    ("RETURNED", "Returned and checked in"),
    ("REJECTED", "Request declined by staff"),
    ("OVERDUE", "Past the due date and not yet returned"),
  )

  code = db.Column(db.String(30), primary_key=True)
  description = db.Column(db.String(255), nullable=False)


@event.listens_for(BorrowStatus.__table__, "after_create")
def _seed_borrow_statuses(table, connection, **_kwargs):
  connection.execute(
    table.insert(),
    [{"code": code, "description": description} for code, description in BorrowStatus.SEED],
  )
