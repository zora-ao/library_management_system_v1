"""Build the UML class diagram (library-uml.png and library-uml.pdf).

Edit the class definitions below when the code changes, then run:

    python documentation/uml/src/build_uml.py

Rendering uses a locally installed Chrome or Edge in headless mode.
Box sizes are computed from their text; connectors are computed from box
positions, so moving or growing a box never needs manual line edits.
"""

import html
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
OUT_DIR = pathlib.Path(os.environ.get("UML_OUT_DIR", HERE.parent))

# ---------------------------------------------------------------- metrics
MONO_PX = 14          # member font size
LINE_H = 21           # member line height
CHAR_W = 8.45         # Cascadia Mono advance at 14px, with a small margin
NAME_CHAR_W = 11.6    # Segoe UI Semibold at 20px, average
PAD_X = 16
PAD_Y = 10
EMPTY_SECTION = 16
HEAD_H = 48
HEAD_STEREO_H = 64
TRI_H = 22            # generalization triangle height
TRI_W = 26
SCALE = 2.4           # output pixel density


def esc(text):
  return html.escape(text, quote=True)


class M:
  """One member line. static -> underlined (class scope), abstract -> italic."""

  def __init__(self, text, static=False, abstract=False):
    self.text, self.static, self.abstract = text, static, abstract


def S(text):
  return M(text, static=True)


class Box:
  def __init__(self, name, attrs=(), methods=(), stereo=None, abstract=False, min_w=0):
    self.name, self.stereo, self.abstract = name, stereo, abstract
    self.attrs = [m if isinstance(m, M) else M(m) for m in attrs]
    self.methods = [m if isinstance(m, M) else M(m) for m in methods]
    longest = max([len(m.text) for m in self.attrs + self.methods] + [0])
    self.w = max(longest * CHAR_W + 2 * PAD_X, len(name) * NAME_CHAR_W + 2 * PAD_X, min_w)
    self.w = round(self.w)
    self.head_h = HEAD_STEREO_H if stereo else HEAD_H
    self.attr_h = self._section_h(self.attrs)
    self.meth_h = self._section_h(self.methods)
    self.h = self.head_h + self.attr_h + self.meth_h
    self.x = self.y = 0

  @staticmethod
  def _section_h(members):
    return len(members) * LINE_H + 2 * PAD_Y if members else EMPTY_SECTION

  def at(self, x, y):
    self.x, self.y = round(x), round(y)
    return self

  l = property(lambda s: s.x)
  r = property(lambda s: s.x + s.w)
  t = property(lambda s: s.y)
  b = property(lambda s: s.y + s.h)
  cx = property(lambda s: s.x + s.w / 2)

  def svg(self):
    x, y, w = self.x, self.y, self.w
    out = [
      f'<rect x="{x}" y="{y}" width="{w}" height="{self.h}" class="box"/>',
      f'<rect x="{x}" y="{y}" width="{w}" height="{self.head_h}" class="head"/>',
    ]
    name_y = y + self.head_h / 2 + 7
    if self.stereo:
      out.append(f'<text x="{x + w / 2}" y="{y + 22}" class="stereo">{esc(self.stereo)}</text>')
      name_y = y + 47
    name_cls = "name abstract" if self.abstract else "name"
    out.append(f'<text x="{x + w / 2}" y="{name_y}" class="{name_cls}">{esc(self.name)}</text>')
    sy = y + self.head_h
    out.append(f'<line x1="{x}" y1="{sy}" x2="{x + w}" y2="{sy}" class="edge"/>')
    for members, h in ((self.attrs, self.attr_h), (self.methods, self.meth_h)):
      for i, m in enumerate(members):
        cls = "member" + (" static" if m.static else "") + (" abstract" if m.abstract else "")
        ty = sy + PAD_Y + LINE_H * i + 15
        out.append(f'<text x="{x + PAD_X}" y="{ty}" class="{cls}">{esc(m.text)}</text>')
      sy += h
      if members is self.attrs:
        out.append(f'<line x1="{x}" y1="{sy}" x2="{x + w}" y2="{sy}" class="edge"/>')
    return "\n".join(out)


# ---------------------------------------------------------------- drawing
svg_parts = []


def polyline(points, dashed=False):
  pts = " ".join(f"{round(px, 1)},{round(py, 1)}" for px, py in points)
  cls = "edge dashed" if dashed else "edge"
  svg_parts.append(f'<polyline points="{pts}" class="{cls}"/>')


def triangle(tip_x, tip_y, direction):
  """Hollow generalization triangle whose tip touches the parent."""
  h, half = TRI_H, TRI_W / 2
  if direction == "up":
    pts = [(tip_x, tip_y), (tip_x - half, tip_y + h), (tip_x + half, tip_y + h)]
  elif direction == "left":
    pts = [(tip_x, tip_y), (tip_x + h, tip_y - half), (tip_x + h, tip_y + half)]
  else:  # right
    pts = [(tip_x, tip_y), (tip_x - h, tip_y - half), (tip_x - h, tip_y + half)]
  p = " ".join(f"{a},{b}" for a, b in pts)
  svg_parts.append(f'<polygon points="{p}" class="hollow"/>')


def diamond(x, top_y):
  """Filled composition diamond hanging below the whole (pointing up)."""
  p = f"{x},{top_y} {x - 10},{top_y + 15} {x},{top_y + 30} {x + 10},{top_y + 15}"
  svg_parts.append(f'<polygon points="{p}" class="filled"/>')


def open_arrow(x, y):
  """Open arrowhead pointing up, tip at (x, y)."""
  svg_parts.append(f'<polyline points="{x - 9},{y + 16} {x},{y} {x + 9},{y + 16}" class="edge"/>')


def label(x, y, text, kind="assoc", anchor="middle"):
  svg_parts.append(f'<text x="{x}" y="{y}" class="{kind}" text-anchor="{anchor}">{esc(text)}</text>')


def generalize(parent, children, bus_y, child_x=None):
  """Children inherit from parent: one triangle under the parent, one shared bus."""
  child_x = child_x or {}
  px = parent.cx
  triangle(px, parent.b, "up")
  polyline([(px, parent.b + TRI_H), (px, bus_y)])
  xs = [child_x.get(c.name, c.cx) for c in children] + [px]
  polyline([(min(xs), bus_y), (max(xs), bus_y)])
  for c in children:
    cx = child_x.get(c.name, c.cx)
    polyline([(cx, bus_y), (cx, c.t)])


def frame(x, y, w, h, title):
  tab_w = len(title) * 9.5 + 30
  svg_parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" class="frame"/>')
  svg_parts.append(
    f'<path d="M{x},{y + 30} H{x + tab_w - 10} L{x + tab_w},{y + 20} V{y}" class="frame"/>'
  )
  label(x + 12, y + 21, title, "frame-title", "start")


# ================================================================ classes
# ---- models package -------------------------------------------------------
base_entity = Box("BaseEntity", ["+ id: UUID"], [M("+ to_dict(): dict", abstract=True)],
                  stereo="«abstract»", abstract=True, min_w=330)

role = Box("Role", [S("+ SEED: tuple"), "+ name: str", "+ description: str"], min_w=250)

user = Box("User", [
  S("+ ROLE_STUDENT: str"), S("+ ROLE_LIBRARIAN: str"), S("+ ROLE_ADMIN: str"),
  S("+ ROLES: tuple"), S("+ STAFF_ROLES: tuple"),
  "+ username: str", "+ email: str", "+ phone: str", "+ role: str", "+ is_active: bool",
  "+ google_id: str", "+ avatar_url: str", "+ created_at: datetime", "- _password_hash: str",
], [
  "+ «set» password(plain: str)",
  "+ check_password(plain: str): bool",
  S("+ is_staff_role(role: str): bool"),
  S("+ is_admin_role(role: str): bool"),
  "+ is_admin(): bool",
  "+ to_dict(): UserDict",
], min_w=400)

borrow = Box("Borrow", [
  S("+ STATUS_PENDING_BORROW: str"), S("+ STATUS_READY_FOR_PICKUP: str"),
  S("+ STATUS_BORROWED: str"), S("+ STATUS_PENDING_RETURN: str"),
  S("+ STATUS_RETURNED: str"), S("+ STATUS_REJECTED: str"), S("+ STATUS_OVERDUE: str"),
  S("+ STATUSES: tuple"), S("+ OVERDUE_ELIGIBLE_STATUSES: tuple"),
  S("+ RETURNABLE_STATUSES: tuple"),
  "+ user_id: UUID", "+ book_id: UUID", "+ status: str", "+ borrowed_at: datetime",
  "+ due_date: datetime", "+ approved_at: datetime", "+ returned_at: datetime",
  "+ rejection_reason: str", "+ created_at: datetime",
], [
  "+ is_overdue(): bool",
  "+ approve(book: Book): void",
  "+ confirm_pickup(loan_days: int): void",
  "+ reject(reason: str): void",
  "+ mark_returned(book: Book): void",
  "- _require_status(allowed: tuple, message: str): void",
  S("- _isoformat_utc(value: datetime): str"),
  "+ to_dict(): BorrowDict",
])

book = Box("Book", [
  "+ isbn: str", "+ title: str", "+ author: str", "+ category_id: UUID",
  "+ description: str", "+ pages: int", "+ image_url: str", "+ is_deleted: bool",
  "+ archived_at: datetime", "+ created_at: datetime",
  "- _total_copies: int", "- _available_copies: int",
], [
  "+ «get» total_copies: int", "+ «get» available_copies: int",
  "+ «get» average_rating: float", "+ «get» total_reviews: int",
  "+ adjust_total_copies(new_total: int): void",
  "+ decrement_available(): void", "+ increment_available(): void",
  "+ to_dict(): BookDict",
], min_w=420)

category = Box("Category", ["- _name: str"],
               ["+ «get/set» name: str", "+ to_dict(): CategoryDict"], min_w=330)

review = Box("Review", [
  S("+ MIN_RATING: int = 1"), S("+ MAX_RATING: int = 5"),
  "+ book_id: UUID", "+ user_id: UUID", "+ rating: int", "+ comment: str",
  "+ created_at: datetime",
], [S("+ parse_rating(raw_rating): int"), "+ to_dict(): ReviewDict"], min_w=320)

borrow_status = Box("BorrowStatus", [S("+ SEED: tuple"), "+ code: str", "+ description: str"],
                    min_w=210)

favorite = Box("Favorite", ["+ user_id: UUID", "+ book_id: UUID", "+ created_at: datetime"],
               ["+ to_dict(): FavoriteDict"], min_w=320)

# ---- services package -----------------------------------------------------
base_service = Box("BaseService", [], [
  S("# _parse_uuid(val, param_name: str): UUID"),
  S("# _get_or_404(model, record_id, label: str): BaseEntity"),
])

book_service = Box("BookService", [
  S("+ DEFAULT_PAGE_SIZE: int = 10"), S("+ MAX_PAGE_SIZE: int = 100"),
], [S(t) for t in (
  "+ get_paginated_books(search_query, category_id, page, limit)",
  "+ get_staff_catalog(state)",
  "+ get_book_by_id(book_id, include_deleted)",
  "+ create_book(form_data, image_file)",
  "+ update_book(book_id, form_data, image_file)",
  "+ archive_book(book_id)",
  "+ restore_book(book_id)",
  "+ delete_book(book_id)",
  "+ get_related_books(book_id, limit)",
  "+ get_or_create_category(category_input)",
  "+ get_book_reviews(book_id)",
  "+ get_book_reviews_stats(book_id)",
  "+ add_review(book_id, user_id, rating, comment)",
  "+ get_user_favorites(user_id)",
  "+ add_favorite(user_id, book_id)",
  "+ remove_favorite(user_id, book_id)",
  "- _parse_book_integer(raw_value, label, minimum)",
)])

borrow_service = Box("BorrowService", [
  S("+ BORROW_DURATION: int = 14"), S("+ ACTIVE_STATUSES: tuple"),
], [S(t) for t in (
  "+ get_all_borrows_admin()",
  "+ get_borrowed_history(user_id)",
  "+ get_user_active_borrows(user_id)",
  "+ request_borrow(user_id, book_id)",
  "+ approve_borrow_request(borrow_id)",
  "+ confirm_borrow_pickup(borrow_id)",
  "+ reject_borrow_request(borrow_id, reason)",
  "+ approve_return_request(borrow_id)",
  "- _apply(borrow, change)",
)])

category_service = Box("CategoryService", [], [S(t) for t in (
  "+ get_all_categories()",
  "+ create_category(name)",
  "+ update_category(category_id, new_name)",
  "+ delete_category(category_id)",
)])

# ---- exceptions package ---------------------------------------------------
py_exception = Box("Exception", stereo="«Python built-in»", min_w=220)
py_value_error = Box("ValueError", stereo="«Python built-in»", min_w=200)
py_lookup_error = Box("LookupError", stereo="«Python built-in»", min_w=200)
library_error = Box("LibraryError", [S("+ status_code: int = 500"), "+ message: str"],
                    ["+ __init__(message: str)", "+ to_dict(): dict"], min_w=260)
validation_error = Box("ValidationError", [S("+ status_code: int = 400")], min_w=250)
conflict_error = Box("ConflictError", [S("+ status_code: int = 409")], min_w=250)
not_found_error = Box("NotFoundError", [S("+ status_code: int = 404")], min_w=250)
reg_validation_error = Box("RegistrationValidationError")
reg_conflict_error = Box("RegistrationConflictError")
duplicate_review_error = Box("DuplicateReviewError")


# ================================================================ layout
MARGIN = 30
FRAME_PAD = 40
TITLE_H = 70

# ---- bottom row first (it decides the canvas width) -----------------------
SVC_GAP = 50
svc_children = [book_service, borrow_service, category_service]
svc_inner_w = sum(b.w for b in svc_children) + SVC_GAP * (len(svc_children) - 1)
svc_frame_w = svc_inner_w + 2 * FRAME_PAD

EXC_GAP = 64
row_c = [py_value_error, validation_error, conflict_error, not_found_error, py_lookup_error]
row_c_w = sum(b.w for b in row_c) + EXC_GAP * (len(row_c) - 1)
exc_frame_w = row_c_w + 2 * FRAME_PAD

BOTTOM_GAP = 60
canvas_w_bottom = MARGIN * 2 + svc_frame_w + BOTTOM_GAP + exc_frame_w

# ---- models package -------------------------------------------------------
row1 = [role, user, borrow, book, category]
row1_gaps = [150, 130, 130, 150]
row1_w = sum(b.w for b in row1) + sum(row1_gaps)
models_frame_w_min = row1_w + 2 * FRAME_PAD
CANVAS_W = max(canvas_w_bottom, models_frame_w_min + 2 * MARGIN)
models_frame_w = CANVAS_W - 2 * MARGIN

models_top = TITLE_H
x = MARGIN + (models_frame_w - row1_w) / 2
base_entity_y = models_top + 50
row1_y = base_entity_y + base_entity.h + TRI_H + 70
for box, gap in zip(row1, row1_gaps + [0]):
  box.at(x, row1_y)
  x = box.r + gap
base_entity.at(borrow.cx - base_entity.w / 2, base_entity_y)

row2_y = max(b.b for b in row1) + 100
review.at((user.r + borrow.l) / 2 - review.w / 2, row2_y)
borrow_status.at(borrow.cx - borrow_status.w / 2, row2_y)
favorite.at((borrow.r + book.l) / 2 - favorite.w / 2, row2_y)
row2_bottom = max(b.b for b in (review, borrow_status, favorite))

# ---- associations & inheritance in the models package --------------------
generalize(base_entity, [user, review, borrow, favorite, book, category], row1_y - 48)

assoc_y = row1_y + 88


def horizontal_assoc(left_box, right_box, left_mult, right_mult, name, name_x=None):
  polyline([(left_box.r, assoc_y), (right_box.l, assoc_y)])
  label(left_box.r + 10, assoc_y - 10, left_mult, "mult", "start")
  label(right_box.l - 10, assoc_y - 10, right_mult, "mult", "end")
  label(name_x if name_x is not None else (left_box.r + right_box.l) / 2, assoc_y + 26, name)


horizontal_assoc(role, user, "1", "0..*", "has role")
horizontal_assoc(user, borrow, "1", "0..*", "places", name_x=user.r + 34)
horizontal_assoc(borrow, book, "0..*", "1", "for", name_x=book.l - 30)
horizontal_assoc(book, category, "0..*", "0..1", "classifies")

# User 1 -- 0..* Review  (writes)
wx = review.l + 20
polyline([(wx, user.b), (wx, review.t)])
label(wx - 10, user.b + 26, "1", "mult", "end")
label(wx - 10, review.t - 12, "0..*", "mult", "end")
label(wx + 12, (user.b + review.t) / 2 + 5, "writes", anchor="start")

# Borrow 0..* -- 1 BorrowStatus  (in status)
sx = borrow.cx
polyline([(sx, borrow.b), (sx, borrow_status.t)])
label(sx + 10, borrow.b + 26, "0..*", "mult", "start")
label(sx + 10, borrow_status.t - 12, "1", "mult", "start")
label(sx - 12, (borrow.b + borrow_status.t) / 2 + 5, "in status", anchor="end")

# Book 1 -- 0..* Favorite  (saved in)
fx = favorite.r - 20
polyline([(fx, book.b), (fx, favorite.t)])
label(fx + 10, book.b + 26, "1", "mult", "start")
label(fx + 10, favorite.t - 12, "0..*", "mult", "start")
label(fx - 12, (book.b + favorite.t) / 2 + 5, "saved in", anchor="end")

# User 1 -- 0..* Favorite  (saves)
saves_y = row2_bottom + 50
ux, fx2 = user.l + 70, favorite.l + 44
polyline([(ux, user.b), (ux, saves_y), (fx2, saves_y), (fx2, favorite.b)])
label(ux - 10, user.b + 26, "1", "mult", "end")
label(fx2 + 10, favorite.b + 26, "0..*", "mult", "start")
label(ux + 100, saves_y - 10, "saves")

# Book 1 <>-- 0..* Review  (has reviews, composition)
reviews_y = row2_bottom + 100
bx, rx = book.l + book.w * 0.78, review.r - 20
diamond(bx, book.b)
polyline([(bx, book.b + 30), (bx, reviews_y), (rx, reviews_y), (rx, review.b)])
label(bx + 12, book.b + 50, "1", "mult", "start")
label(rx - 10, review.b + 26, "0..*", "mult", "end")
label(bx - 120, reviews_y - 10, "has reviews")

models_bottom = reviews_y + 50
frame(MARGIN, models_top, models_frame_w, models_bottom - models_top, "models")

# ---- services package -----------------------------------------------------
bottom_top = models_bottom + BOTTOM_GAP
bottom_w = svc_frame_w + BOTTOM_GAP + exc_frame_w
svc_x = MARGIN + (CANVAS_W - 2 * MARGIN - bottom_w) / 2
x = svc_x + FRAME_PAD
svc_children_y = bottom_top + 60 + base_service.h + TRI_H + 60
for b in svc_children:
  b.at(x, svc_children_y)
  x = b.r + SVC_GAP
base_service.at(borrow_service.cx - base_service.w / 2, bottom_top + 60)
generalize(base_service, svc_children, svc_children_y - 36)

# ---- exceptions package ---------------------------------------------------
exc_x = svc_x + svc_frame_w + BOTTOM_GAP
x = exc_x + FRAME_PAD
row_a_y = bottom_top + 60
row_b_y = row_a_y + py_exception.h + TRI_H + 60
row_c_y = row_b_y + library_error.h + TRI_H + 60
for b in row_c:
  b.at(x, row_c_y)
  x = b.r + EXC_GAP
py_exception.at(conflict_error.cx - py_exception.w / 2, row_a_y)
library_error.at(conflict_error.cx - library_error.w / 2, row_b_y)
row_d_y = max(b.b for b in row_c) + TRI_H + 60
reg_validation_error.at(validation_error.cx - reg_validation_error.w / 2, row_d_y)
reg_conflict_error.at(reg_validation_error.r + 44, row_d_y)
duplicate_review_error.at(reg_conflict_error.r + 44, row_d_y)

generalize(py_exception, [py_value_error, library_error, py_lookup_error], row_b_y - 36)
generalize(library_error, [validation_error, conflict_error, not_found_error], row_c_y - 36)
generalize(validation_error, [reg_validation_error], row_d_y - 36)
generalize(conflict_error, [reg_conflict_error, duplicate_review_error], row_d_y - 36)

# Second parents (multiple inheritance from Python built-ins).
mid_c = row_c_y + 40
triangle(py_value_error.r, mid_c, "left")
polyline([(py_value_error.r + TRI_H, mid_c), (validation_error.l, mid_c)])
triangle(py_lookup_error.l, mid_c, "right")
polyline([(not_found_error.r, mid_c), (py_lookup_error.l - TRI_H, mid_c)])
lane_y = reg_conflict_error.b + 40
vx = py_value_error.cx
triangle(vx, py_value_error.b, "up")
polyline([(reg_conflict_error.cx, reg_conflict_error.b), (reg_conflict_error.cx, lane_y),
          (vx, lane_y), (vx, py_value_error.b + TRI_H)])

exc_bottom = lane_y + 40
svc_bottom = max(b.b for b in svc_children) + 40
bottom_bottom = max(exc_bottom, svc_bottom)
frame(svc_x, bottom_top, svc_frame_w, bottom_bottom - bottom_top, "services")
frame(exc_x, bottom_top, exc_frame_w, bottom_bottom - bottom_top, "exceptions")

# services «use» models
use_x = svc_x + 60
polyline([(use_x, bottom_top), (use_x, models_bottom)], dashed=True)
open_arrow(use_x, models_bottom)
label(use_x + 14, (bottom_top + models_bottom) / 2 + 5, "«use»", anchor="start")

CANVAS_H = bottom_bottom + MARGIN

# ---- legend & title -------------------------------------------------------
label(MARGIN, 42, "Library Management System · UML Class Diagram", "title", "start")
label(CANVAS_W - MARGIN, 42,
      "Visibility:  + public  ·  # protected  ·  - private  ·  underlined = class-level (static / classmethod)",
      "legend", "end")

ALL_BOXES = [
  base_entity, role, user, borrow, book, category, review, borrow_status, favorite,
  base_service, book_service, borrow_service, category_service,
  py_exception, py_value_error, py_lookup_error, library_error, validation_error,
  conflict_error, not_found_error, reg_validation_error, reg_conflict_error,
  duplicate_review_error,
]

STYLE = """
  .box { fill: #ffffff; stroke: #111; stroke-width: 1.6; }
  .head { fill: #f0f0f0; stroke: #111; stroke-width: 1.6; }
  .edge { fill: none; stroke: #111; stroke-width: 1.6; }
  .dashed { stroke-dasharray: 8 6; }
  .hollow { fill: #ffffff; stroke: #111; stroke-width: 1.6; }
  .filled { fill: #111; stroke: #111; stroke-width: 1.6; }
  .frame { fill: none; stroke: #8a8a8a; stroke-width: 1.4; }
  text { fill: #111; }
  .name { font: 600 20px 'Segoe UI', Arial, sans-serif; text-anchor: middle; }
  .stereo { font: 14px 'Segoe UI', Arial, sans-serif; text-anchor: middle; }
  .member { font: 14px 'Cascadia Mono', Consolas, monospace; white-space: pre; }
  .static { text-decoration: underline; }
  .abstract { font-style: italic; }
  .assoc { font: italic 600 15px 'Segoe UI', Arial, sans-serif; }
  .mult { font: 15px 'Cascadia Mono', Consolas, monospace; }
  .frame-title { font: 600 16px 'Segoe UI', Arial, sans-serif; fill: #444; }
  .title { font: 600 24px 'Segoe UI', Arial, sans-serif; }
  .legend { font: 15px 'Segoe UI', Arial, sans-serif; fill: #444; white-space: pre; }
"""


def build_html():
  # Connectors are drawn first so boxes sit on top of any line ends.
  body = "\n".join(svg_parts + [b.svg() for b in ALL_BOXES])
  W, H = round(CANVAS_W), round(CANVAS_H)
  svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
         f'viewBox="0 0 {W} {H}"><style>{STYLE}</style>'
         f'<rect width="{W}" height="{H}" fill="#ffffff"/>{body}</svg>')
  page = (f'<!doctype html><html><head><meta charset="utf-8"><style>'
          f'@page {{ size: {W}px {H}px; margin: 0; }} html,body {{ margin:0; background:#fff; overflow:hidden; }} svg {{ display:block; }}'
          f'</style></head><body>{svg}</body></html>')
  return page, svg, W, H


def find_browser():
  candidates = [
    os.environ.get("CHROME_PATH"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    shutil.which("chrome"), shutil.which("google-chrome"), shutil.which("chromium"),
    shutil.which("msedge"),
  ]
  for c in candidates:
    if c and pathlib.Path(c).exists():
      return c
  sys.exit("Chrome or Edge not found; set CHROME_PATH.")


def main():
  page, svg, W, H = build_html()
  (HERE / "library-uml.svg").write_text(svg, encoding="utf-8")
  browser = find_browser()
  with tempfile.TemporaryDirectory() as tmp:
    page_path = pathlib.Path(tmp) / "uml.html"
    page_path.write_text(page, encoding="utf-8")
    url = page_path.as_uri()
    common = [browser, "--headless=new", "--disable-gpu", "--hide-scrollbars",
              f"--user-data-dir={tmp}/profile"]
    subprocess.run(common + [
      f"--window-size={W},{H}", f"--force-device-scale-factor={SCALE}",
      f"--screenshot={OUT_DIR / 'library-uml.png'}", url,
    ], check=True, capture_output=True)
    subprocess.run(common + [
      "--no-pdf-header-footer", f"--print-to-pdf={OUT_DIR / 'library-uml.pdf'}", url,
    ], check=True, capture_output=True)
  print(f"Wrote {OUT_DIR / 'library-uml.png'} ({round(W * SCALE)}x{round(H * SCALE)}) and library-uml.pdf")


if __name__ == "__main__":
  main()
