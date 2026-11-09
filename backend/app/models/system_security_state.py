from app.extensions import db


class SystemSecurityState(db.Model):
  __tablename__ = "system_security_state"

  # Single-row table (id is always 1). autoincrement=False keeps Postgres from
  # attaching a sequence: backups exclude this table, and a dumped sequence
  # that the live table still uses makes pg_restore --clean fail.
  id = db.Column(db.SmallInteger, primary_key=True, autoincrement=False)
  auth_epoch = db.Column(db.String(36), nullable=False)
  maintenance_mode = db.Column(db.Boolean, nullable=False, default=False)
  restore_started_at = db.Column(db.DateTime(timezone=True), nullable=True)
  updated_at = db.Column(
    db.DateTime(timezone=True),
    nullable=False,
    server_default=db.func.now(),
    onupdate=db.func.now(),
  )
