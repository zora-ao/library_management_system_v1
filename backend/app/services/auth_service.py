import re
import socket
import time
from flask import current_app
from google.auth.exceptions import GoogleAuthError
from google.oauth2 import id_token
from google.auth.transport import requests
import requests as http_requests
import urllib3.util.connection as urllib3_connection
from app.models import User, Student
from app.extensions import db
from flask_jwt_extended import create_access_token
from app.security_state import get_auth_epoch

# Prefer IPv4 for outbound HTTPS calls (e.g. Google OAuth cert fetches) so
# broken local IPv6 routes do not stall token verification for 60-100 seconds.
urllib3_connection.allowed_gai_family = lambda: socket.AF_INET


class _CachedGoogleRequest(requests.Request):
  """Caches Google OAuth2 public certificate GET responses in memory."""

  def __init__(self, session=None):
    super().__init__(session=session or http_requests.Session())
    self._cert_cache = {}

  def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
    normalized_method = (method or "GET").upper()
    now = time.monotonic()

    if normalized_method == "GET":
      cached = self._cert_cache.get(url)
      if cached and now < cached[0]:
        return cached[1]

    response = super().__call__(
      url,
      method=normalized_method,
      body=body,
      headers=headers,
      timeout=timeout or 5,
      **kwargs,
    )

    if normalized_method == "GET" and getattr(response, "status", None) == 200:
      cache_control = ""
      if getattr(response, "headers", None):
        cache_control = (
          response.headers.get("Cache-Control")
          or response.headers.get("cache-control")
          or ""
        )
      match = re.search(r"max-age=(\d+)", cache_control)
      ttl = int(match.group(1)) if match else 3600
      if ttl > 0:
        self._cert_cache[url] = (now + ttl, response)

    return response


_GOOGLE_AUTH_REQUEST = _CachedGoogleRequest()


class AuthService:

  @staticmethod
  def issue_access_token(user):
    return create_access_token(
      identity=str(user.id),
      additional_claims={
        "role": user.role,
        "username": user.username,
        "auth_epoch": get_auth_epoch(),
      },
    )

  @staticmethod
  def change_password(user_id, current_password, new_password):
    user = db.session.get(User, user_id)

    if not user:
      raise ValueError("User not found")
    if user.google_id or not user._password_hash:
      raise ValueError("Password security for this account is managed by Google")
    if not user.check_password(current_password):
      raise ValueError("Current password is incorrect")
    if user.check_password(new_password):
      raise ValueError("New password must be different from the current password")

    try:
      user.password = new_password
      db.session.commit()
    except Exception:
      db.session.rollback()
      raise

  @staticmethod
  def _available_google_username(preferred_username):
    base_username = preferred_username.strip()[:90] or "google_user"
    candidate = base_username
    suffix = 2

    while User.query.filter_by(username=candidate).first():
      candidate = f"{base_username}_{suffix}"
      suffix += 1

    return candidate

  @staticmethod
  def google_auth(token):
    google_client_id = current_app.config["GOOGLE_CLIENT_ID"]

    if not google_client_id:
      raise RuntimeError("Google OAuth is not configured")

    # Google Identity Services returns an OAuth 2.0 ID token, not a
    # Firebase Authentication token.
    try:
      id_info = id_token.verify_oauth2_token(
        token,
        _GOOGLE_AUTH_REQUEST,
        google_client_id,
        clock_skew_in_seconds=10,
      )
    except (ValueError, GoogleAuthError) as exc:
      current_app.logger.warning(
        "Google ID token verification failed: %s",
        exc
      )
      raise ValueError("Invalid Google credential") from exc

    if not id_info.get("email") or not id_info.get("sub"):
      raise ValueError("Google credential is missing required account information")

    if not id_info.get("email_verified", False):
      raise ValueError("Google account email is not verified")

    email = id_info["email"].strip().lower()
    google_id = id_info["sub"]
    avatar = id_info.get("picture", "")
    name = id_info.get("name", "")
    default_username = name if name else email.split("@")[0]

    # Find the Google identity and email separately so an accidental conflict
    # cannot link two existing accounts together.
    user_by_google_id = User.query.filter_by(google_id=google_id).first()
    user_by_email = User.query.filter_by(email=email).first()

    if (
      user_by_google_id
      and user_by_email
      and user_by_google_id.id != user_by_email.id
    ):
      raise ValueError("Google account conflicts with an existing user")

    user = user_by_google_id or user_by_email

    try:
      if not user:
        user = User(
          email=email,
          username=AuthService._available_google_username(default_username),
          google_id=google_id,
          role="student",
          avatar_url=avatar
        )
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id,
            enrollment_status="Enrolled"
        )

        db.session.add(student)
        db.session.commit()

      elif not user.google_id:
        user.google_id = google_id
        db.session.commit()
    except Exception:
      db.session.rollback()
      raise

    if not user.is_active:
      raise PermissionError("Account is deactivated")
    
    # issue the jwt token
    access_token = AuthService.issue_access_token(user)

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

    access_token = AuthService.issue_access_token(user)

    return {
      "token": access_token,
      "user": user.to_dict()
    }

  @staticmethod
  def register_user(username, email, password):

    existing_user = User.query.filter(
      (User.email == email) | (User.username == username)
    ).first()

    if existing_user:
      raise ValueError("Username or email already exist")

    try:
      new_user = User(
        username=username,
        email=email,
        password=password
      )

      db.session.add(new_user)
      db.session.flush()

      new_student = Student(
            user_id=new_user.id,
            enrollment_status="Enrolled"
        )

      db.session.add(new_student)
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
