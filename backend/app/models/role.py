from sqlalchemy import event

from app.extensions import db


class Role(db.Model):
  """Lookup table for account roles; users.role references roles.name."""

  __tablename__ = "roles"

  # Seed rows, inserted when the table is created. Must match User.ROLES.
  SEED = (
    ("student", "Borrows, reviews and saves books from the catalog"),
    ("librarian", "Manages the catalog, borrow requests and returns"),
    ("admin", "Full access, including user management and backups"),
  )

  name = db.Column(db.String(20), primary_key=True)
  description = db.Column(db.String(255), nullable=False)


@event.listens_for(Role.__table__, "after_create")
def _seed_roles(table, connection, **_kwargs):
  connection.execute(
    table.insert(),
    [{"name": name, "description": description} for name, description in Role.SEED],
  )
