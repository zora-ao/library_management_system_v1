import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class Config:
  LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
  PERFORMANCE_DIAGNOSTICS = os.getenv(
    "PERFORMANCE_DIAGNOSTICS", "false"
  ).strip().lower() in {"1", "true", "yes", "on"}
  SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  SQLALCHEMY_ENGINE_OPTIONS = {
    "pool_pre_ping": True,
    "connect_args": {
      "connect_timeout": 10,
      "keepalives": 1,
      "keepalives_idle": 30,
      "keepalives_interval": 10,
      "keepalives_count": 3,
    },
  }

  # Render terminates requests at one proxy and sets RENDER=true, so trust a
  # single X-Forwarded-For hop there. Override with TRUSTED_PROXY_COUNT.
  TRUSTED_PROXY_COUNT = int(os.getenv("TRUSTED_PROXY_COUNT", "1" if os.getenv("RENDER") else "0"))
  RATELIMIT_ENABLED = os.getenv("RATELIMIT_ENABLED", "true").strip().lower() not in {"0", "false", "no", "off"}
  RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

  JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
  JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=4)

  # Cloudinary config
  CLOUDINARY_URI = os.getenv("CLOUDINARY_URL")
  CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
  CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

  # OAuth — token verification only needs the client ID
  GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

  BACKUP_TOKEN_SIGNING_KEY = os.getenv("BACKUP_TOKEN_SIGNING_KEY")
  BACKUP_SAFETY_TOKEN_MAX_AGE_SECONDS = 900
  BACKUP_RESTORE_TOKEN_MAX_AGE_SECONDS = 900
  BACKUP_SCRYPT_N = 32768
  BACKUP_SCRYPT_R = 8
  BACKUP_SCRYPT_P = 1
  BACKUP_MAX_BYTES = 262_144_000
  MAX_CONTENT_LENGTH = BACKUP_MAX_BYTES + 1_048_576
  BACKUP_OPERATION_TIMEOUT_SECONDS = 300
  BACKUP_PG_COMPRESSION_LEVEL = os.getenv("BACKUP_PG_COMPRESSION_LEVEL", "1")
  BACKUP_PG_BIN_DIR = os.getenv("BACKUP_PG_BIN_DIR")

