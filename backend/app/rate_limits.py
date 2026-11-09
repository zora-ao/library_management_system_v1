"""Request rate limits for the authentication endpoints.

Limits are counted per client IP. Login is additionally counted per target
email, so guessing one account's password is throttled even when many users
share an IP (a school network, or a proxy whose client IP we cannot see).
"""

from flask import jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix


LOGIN_PER_IP = "20 per minute"
LOGIN_PER_ACCOUNT = "5 per minute;30 per hour"
REGISTER_PER_IP = "5 per minute;30 per hour"
GOOGLE_PER_IP = "20 per minute"
PASSWORD_CHANGE_PER_IP = "5 per minute"

TOO_MANY_REQUESTS_MESSAGE = "Too many attempts. Please wait a minute and try again."


def login_account_key() -> str:
  data = request.get_json(silent=True)
  email = data.get("email") if isinstance(data, dict) else None
  if not isinstance(email, str) or not email.strip():
    return f"login-ip:{get_remote_address()}"
  return f"login-account:{email.strip().lower()}"


limiter = Limiter(
  key_func=get_remote_address,
  default_limits=[],
  storage_uri="memory://",
  headers_enabled=True,
)


def init_rate_limits(app) -> None:
  # Behind Render's proxy every request arrives from the proxy's address; trust
  # exactly the configured number of proxy hops so X-Forwarded-For cannot be
  # spoofed by clients to dodge the limits.
  trusted_proxies = int(app.config.get("TRUSTED_PROXY_COUNT") or 0)
  if trusted_proxies > 0:
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=trusted_proxies, x_proto=trusted_proxies)

  limiter.init_app(app)

  @app.errorhandler(429)
  def handle_rate_limited(error):
    response = jsonify({"message": TOO_MANY_REQUESTS_MESSAGE})
    response.status_code = 429
    retry_after = getattr(error, "retry_after", None)
    if retry_after:
      response.headers["Retry-After"] = str(retry_after)
    return response
