"""Build a short UML class diagram with only the core classes (library-uml-core.png).

It reuses the box and connector helpers from build_uml.py, so both diagrams
look the same. Members are trimmed to the ones worth explaining in class.

    python documentation/uml/src/build_uml_core.py
"""

import pathlib
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build_uml as u  # noqa: E402  (its own full layout is built on import, then discarded)
from build_uml import Box, M, S, TRI_H  # noqa: E402

u.svg_parts.clear()

# ================================================================ classes
base_entity = Box("BaseEntity", ["+ id: UUID"], [M("+ to_dict(): dict", abstract=True)],
                  stereo="«abstract»", abstract=True, min_w=300)

user = Box("User", [
  "+ username: str", "+ email: str", "+ role: str", "+ is_active: bool",
  "- _password_hash: str",
], [
  "+ «set» password(plain: str)",
  "+ check_password(plain: str): bool",
  "+ is_admin(): bool",
  "+ to_dict(): UserDict",
], min_w=330)

borrow = Box("Borrow", [
  "+ user_id: UUID", "+ book_id: UUID", "+ status: str",
  "+ due_date: datetime", "+ returned_at: datetime",
], [
  "+ approve(book: Book): void",
  "+ confirm_pickup(loan_days: int): void",
  "+ reject(reason: str): void",
  "+ mark_returned(book: Book): void",
  "+ is_overdue(): bool",
  "- _require_status(allowed, message)",
  "+ to_dict(): BorrowDict",
], min_w=330)

book = Box("Book", [
  "+ isbn: str", "+ title: str", "+ author: str", "+ category_id: UUID",
  "- _total_copies: int", "- _available_copies: int",
], [
  "+ «get» available_copies: int",
  "+ «get» average_rating: float",
  "+ decrement_available(): void",
  "+ increment_available(): void",
  "+ to_dict(): BookDict",
], min_w=330)

category = Box("Category", ["- _name: str"],
               ["+ «get/set» name: str", "+ to_dict(): CategoryDict"], min_w=280)

review = Box("Review", [
  "+ book_id: UUID", "+ user_id: UUID", "+ rating: int", "+ comment: str",
], [S("+ parse_rating(raw): int"), "+ to_dict(): ReviewDict"], min_w=280)

favorite = Box("Favorite", ["+ user_id: UUID", "+ book_id: UUID", "+ created_at: datetime"],
               ["+ to_dict(): FavoriteDict"], min_w=280)

ALL_BOXES = [base_entity, user, borrow, book, category, review, favorite]

# ================================================================ layout
# One row, ordered so every directly related pair sits side by side:
#   Review - User - Borrow - Book - Category - Favorite
MARGIN, TITLE_H = 40, 80
row = [review, user, borrow, book, category, favorite]
gaps = [120, 140, 140, 140, 120]
row_w = sum(b.w for b in row) + sum(gaps)
CANVAS_W = row_w + 2 * MARGIN + 40

base_y = TITLE_H + 20
row_y = base_y + base_entity.h + TRI_H + 70
x = (CANVAS_W - row_w) / 2
for box, gap in zip(row, gaps + [0]):
  box.at(x, row_y)
  x = box.r + gap
base_entity.at((review.l + favorite.r) / 2 - base_entity.w / 2, base_y)
row_bottom = max(b.b for b in row)

# ---- inheritance: every core model is a BaseEntity -----------------------
u.generalize(base_entity, row, row_y - 46)

# ---- associations between neighbours -------------------------------------
assoc_y = row_y + 70


def horizontal(left, right, lm, rm, name):
  u.polyline([(left.r, assoc_y), (right.l, assoc_y)])
  u.label(left.r + 10, assoc_y - 10, lm, "mult", "start")
  u.label(right.l - 10, assoc_y - 10, rm, "mult", "end")
  u.label((left.r + right.l) / 2, assoc_y + 26, name)


horizontal(review, user, "0..*", "1", "writes")
horizontal(user, borrow, "1", "0..*", "places")
horizontal(borrow, book, "0..*", "1", "for")
horizontal(book, category, "0..*", "0..1", "classifies")

# ---- associations routed under the row -----------------------------------
near_y = row_bottom + 60
far_y = row_bottom + 120
HOP = 9

# Book 1 -- 0..* Favorite (saved in)
sx1, sx2 = book.r - 60, favorite.l + 60
u.polyline([(sx1, book.b), (sx1, near_y), (sx2, near_y), (sx2, favorite.b)])
u.label(sx1 + 10, book.b + 26, "1", "mult", "start")
u.label(sx2 + 10, favorite.b + 26, "0..*", "mult", "start")
u.label((category.l + category.r) / 2, near_y - 10, "saved in")

# User 1 -- 0..* Favorite (saves), the outer route
ux, fx = user.cx, favorite.r - 60
u.polyline([(ux, user.b), (ux, far_y), (fx, far_y), (fx, favorite.b)])
u.label(ux - 10, user.b + 26, "1", "mult", "end")
u.label(fx + 10, favorite.b + 26, "0..*", "mult", "start")
u.label((borrow.l + borrow.r) / 2, far_y + 26, "saves")

# Book 1 <>-- 0..* Review (has reviews); hops over the "saves" line at x = ux.
bx, rx = book.l + 60, review.cx
u.diamond(bx, book.b)
u.svg_parts.append(
  f'<path d="M{rx},{review.b} V{near_y} H{ux - HOP} '
  f'A{HOP},{HOP} 0 0 1 {ux + HOP},{near_y} H{bx} V{book.b + 30}" class="edge"/>'
)
u.label(bx + 12, book.b + 50, "1", "mult", "start")
u.label(rx + 10, review.b + 26, "0..*", "mult", "start")
u.label((borrow.l + borrow.r) / 2, near_y - 10, "has reviews")

CANVAS_H = far_y + 90
u.label(MARGIN, 48, "Library Management System · Core Classes", "title", "start")
u.label(CANVAS_W - MARGIN, 48,
        "+ public  ·  - private  ·  underlined = static  ·  italic = abstract", "legend", "end")
u.label(MARGIN, CANVAS_H - 24,
        "△ inheritance: every class reuses BaseEntity.id   ·   ◆ composition: reviews are deleted with their book",
        "legend", "start")


def main():
  u.ALL_BOXES[:] = ALL_BOXES
  u.CANVAS_W, u.CANVAS_H = CANVAS_W, CANVAS_H
  page, svg, W, H = u.build_html()
  out = u.OUT_DIR / "library-uml-core.png"
  browser = u.find_browser()
  with tempfile.TemporaryDirectory() as tmp:
    page_path = pathlib.Path(tmp) / "uml.html"
    page_path.write_text(page, encoding="utf-8")
    subprocess.run([browser, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--user-data-dir={tmp}/profile", f"--window-size={W},{H}",
                    f"--force-device-scale-factor={u.SCALE}", f"--screenshot={out}",
                    page_path.as_uri()], check=True, capture_output=True)
  print(f"Wrote {out} ({round(W * u.SCALE)}x{round(H * u.SCALE)})")


if __name__ == "__main__":
  main()
