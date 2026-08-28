from flask import Flask
from flask_cors import CORS

from app.blueprints.auth.routes import auth_bp
from app.blueprints.books.routes import books_bp
from app.blueprints.borrows.routes import borrows_bp
from app.blueprints.category.routes import category_bp
from app.blueprints.users.routes import users_bp

from app.extensions import db, migrate, jwt
from app.config import Config


def create_app():
  app = Flask(__name__)
  app.config.from_object(Config)

  CORS(app, origins=["http://localhost:5173"])

  db.init_app(app)
  migrate.init_app(app, db)
  jwt.init_app(app)

  # Register the blueprints
  app.register_blueprint(auth_bp)
  app.register_blueprint(books_bp)
  app.register_blueprint(borrows_bp)
  app.register_blueprint(category_bp)
  app.register_blueprint(users_bp)
  
  return app