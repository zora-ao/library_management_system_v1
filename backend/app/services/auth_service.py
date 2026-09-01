from flask import current_app
from google.oauth2 import id_token
from google.auth.transport import requests
from app.models import User
from app.extensions import db
from flask_jwt_extended import create_access_token

class AuthService:

  @staticmethod
  def google_auth(token):
    google_client_id = current_app.config["GOOGLE_CLIENT_ID"]

    # this verify google token
    id_info = id_token.verify_firebase_token(
      token, requests.Request(), google_client_id
    )

    email = id_info["email"]
    google_id = id_info["sub"]
    avatar = id_info.get("picture", "")
    name = id_info.get("name", "")
    default_username = name if name else email.split("@")[0]

    # find or create the user
    user = User.query.filter(
      (User.email == email) | (User.google_id == google_id)
    ).filter()

    if not user:
      user = User(
        email=email,
        username=default_username,
        google_id=google_id,
        role="student",
        avatar_url=avatar
      )
      db.session.add(user)
      db.session.commit()

    elif not user.google_id:
      user.google_id = google_id
      db.session.commit()

    if not user.is_active:
      raise PermissionError("Account is deactivated")
    
    # issue the jwt token
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username}
      )

    return {
      "access_token": access_token,
      "user": user.to_dict()
    }

  @staticmethod
  def login_user(email, password):
    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
      raise ValueError("Invalid Email or Password")

    if not user.is_active:
      raise PermissionError("Account is deactivated")

    access_token = create_access_token(
      identity=str(user.id),
      additional_claims={"role": user.role, "username": user.username}
    )

    return {
      "token": access_token,
      "user": user.to_dict()
    }

  @staticmethod
  def register_user(username, email, password, role="student"):

    existing_user = User.query.filter(
      (User.email == email) | (User.username == username).first()
    )

    if existing_user:
      raise ValueError("Username or email already exist")

    try:
      new_user = User(
        username=username,
        email=email,
        password=password,
        role=role
      )

      db.session.add(new_user)
      db.session.commit()

      return new_user
    except Exception:
      db.session.rollback()
      raise

  @staticmethod
  def get_current_user(user_id):
    user = db.session.get(User, user_id)

    if not user or not user.is_active:
      raise ValueError("User not found or inactive")

    return user