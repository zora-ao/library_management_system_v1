from app.models import Category, Book
from app.extensions import db

class CategoryService:

  @staticmethod
  def get_all_categories():

    return Category.query.order_by(Category._name.asc()).all()

  @staticmethod
  def create_category(name):
    # this will create a new category and if category name existing it will just return it

    if not name or not name.strip():
      raise ValueError("Category name is required")

    clean_name = name.strip()

    existing = Category.query.filter(
      db.func.lower(Category._name) == clean_name.lower()
    ).first()

    if existing:
      return existing.to_dict()

    try:
      category = Category(name=clean_name)

      db.session.add(category)
      db.session.commit()

      return {
        "message": "Category created successfull",
        "category": category.to_dict()
      }
    
    except Exception:
      db.session.rollback()
      raise

  @staticmethod
  def update_category(category_id, new_name):

    if not new_name or not new_name.strip():
      raise ValueError("Category name is required")

    category = db.session.get(Category, category_id)

    if not category:
      raise ValueError("Category not found")

    try:
      category.name = new_name.strip()
      db.session.commit()

      return { "message": "Category updated successfully" }
    except Exception:
      db.session.rollback()
      raise

  @staticmethod
  def delete_category(category_id):

    category = db.session.get(Category, category_id)

    if not category:
      return { "message": "Category not found" }

    # check if books is borrowed
    linked_books = Book.query.filter_by(
      category_id=category_id, is_deleted=False
    ).first()

    if linked_books:
      raise ValueError("Cannot delete category while books are assigned to it. Reassign or delete the books first.")

    try:
      db.session.delete(category)
      db.session.commit()

      return { "message": "Category deleted successfully" }
    except Exception:
      db.session.rollback()
      raise


