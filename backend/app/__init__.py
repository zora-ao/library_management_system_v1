import logging

from flask import Flask
from flask_cors import CORS

from app.blueprints.auth.routes import auth_bp
from app.blueprints.backups.routes import backups_bp
from app.blueprints.books.routes import books_bp
from app.blueprints.borrows.routes import borrows_bp
from app.blueprints.category.routes import category_bp
from app.blueprints.dashboard.routes import dashboard_bp
from app.blueprints.users.routes import users_bp

from app.extensions import db, migrate, jwt
from app.middleware.errors import error_bp
from app.config import Config
from app.security_state import configure_jwt_security
from app.maintenance import install_maintenance_guard
from app.performance import install_performance_diagnostics
from app.rate_limits import init_rate_limits


def create_app():
  app = Flask(__name__)
  app.config.from_object(Config)
  configured_log_level = str(app.config.get("LOG_LEVEL", "INFO")).upper()
  app.logger.setLevel(getattr(logging, configured_log_level, logging.INFO))

  db_uri = app.config.get("SQLALCHEMY_DATABASE_URI") or ""
  if not db_uri.startswith("postgresql"):
    engine_opts = dict(app.config.get("SQLALCHEMY_ENGINE_OPTIONS") or {})
    engine_opts.pop("connect_args", None)
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = engine_opts

  CORS(
    app,
    origins=[
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://library-management-system-libra.vercel.app",
    ],
    expose_headers=["X-Backup-Safety-Token", "Content-Disposition"],
  )

  db.init_app(app)
  migrate.init_app(app, db)
  jwt.init_app(app)
  configure_jwt_security(jwt)
  init_rate_limits(app)
  install_performance_diagnostics(app, db)
  
  # Register the blueprints
  app.register_blueprint(auth_bp)
  app.register_blueprint(backups_bp)
  app.register_blueprint(books_bp)
  app.register_blueprint(borrows_bp)
  app.register_blueprint(category_bp)
  app.register_blueprint(dashboard_bp)
  app.register_blueprint(users_bp)

  # Uptime monitors ping this to keep the free Render instance awake. It sits
  # outside /api so it skips the maintenance guard and never touches the
  # database. Flask answers HEAD requests on GET routes automatically.
  @app.get("/health")
  def health():
    return {"status": "ok"}, 200

  install_maintenance_guard(app)

  # JSON error handlers (404/500/DB rollback) — must be registered after blueprints
  app.register_blueprint(error_bp)

  return app
