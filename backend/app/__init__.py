from flask import Flask
from flask_cors import CORS

from app.blueprints.auth.routes import auth_bp
from app.blueprints.books.routes import books_bp

from app.extensions import db, migrate, jwt
from app.config import Config

from app.models.user import User
from app.models.book import Book

def create_app():
  app = Flask(__name__)
  app.config.from_object(Config)

  CORS(app)

  db.init_app(app)
  migrate.init_app(app, db)
  jwt.init_app(app)

  # Register the blueprints
  app.register_blueprint(auth_bp)
  app.register_blueprint(books_bp)
  
  return app