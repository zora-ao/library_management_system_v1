import os
import re
import cloudinary
import cloudinary.uploader
from flask import current_app

def init_cloudinary():
  # The SDK reads CLOUDINARY_URL once at import time, which can happen before
  # app.config loads backend/.env. Re-read it now so uploads work locally too.
  cloudinary_url = current_app.config.get("CLOUDINARY_URI")
  if cloudinary_url:
    os.environ["CLOUDINARY_URL"] = cloudinary_url
  cloudinary.reset_config()

  overrides = {"secure": True}
  if current_app.config.get("CLOUDINARY_API_KEY"):
    overrides["api_key"] = current_app.config["CLOUDINARY_API_KEY"]
  if current_app.config.get("CLOUDINARY_API_SECRET"):
    overrides["api_secret"] = current_app.config["CLOUDINARY_API_SECRET"]
  cloudinary.config(**overrides)

def upload_book_cover(file):
  init_cloudinary()

  result = cloudinary.uploader.upload(
    file,
    folder="library_books",
    transformation=[
          {"width": 500, "height": 750, "crop": "limit"},
          {"quality": "auto"}
      ]
  )

  return result.get("secure_url")

def upload_avatar(file):
  init_cloudinary()

  result = cloudinary.uploader.upload(
        file,
        folder="library_avatars",
        transformation=[
            {
                "width": 300,
                "height": 300,
                "crop": "fill",
                "gravity": "face",
            },
            {
                "quality": "auto",
            },
        ],
    )

  return result.get("secure_url")

def delete_avatar(image_url):
  if not image_url:
      return None

  init_cloudinary()

  try:
      match = re.search(
          r"/upload/(?:v\d+/)?(.+)\.[a-zA-Z]+$",
          image_url,
      )

      if match:
          public_id = match.group(1)
          return cloudinary.uploader.destroy(public_id)

  except Exception as e:
      print(f"Failed to delete Cloudinary avatar: {str(e)}")

  return None