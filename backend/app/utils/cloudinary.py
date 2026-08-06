import re
import cloudinary
import cloudinary.uploader
from flask import current_app

def init_cloudinary():
  cloudinary.config(
    cloud_url = current_app.config["CLOUDINARY_URI"],
    api_key = current_app.config["CLOUDINARY_API_KEY"],
    api_secret = current_app.config["CLOUDINARY_API_SECRET"],
    secure = True
  )

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

def delete_book_cover(image_url):
  if not image_url:
    return None

  init_cloudinary()

  try:
    match = re.search(r'/upload/(?:v\d+/)?(.+)\.[a-zA-Z]+$', image_url)
    if match:
      public_id = match.group(1)
      result = cloudinary.uploader.destroy(public_id)
      return result
  except Exception as e:
    print(f"Failed to delete Cloudinary image: {str(e)}")
    return None