import os
from dotenv import load_dotenv

load_dotenv()

class Config:
  SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

  # Cloudinary config
  CLOUDINARY_URI = os.getenv("CLOUDINARY_URL")
  CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
  CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")