# Book Data Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject invalid book copy and page counts at the service boundary and enforce the same invariants in the database.

**Architecture:** `BookService` will parse multipart numeric values before any upload or model mutation, while `Book` table metadata and an Alembic migration provide durable check constraints. The migration will inspect existing rows and abort with violation counts before adding constraints; it will never rewrite existing book data.

**Tech Stack:** Python 3, Flask, Flask-SQLAlchemy, SQLAlchemy, Alembic, PostgreSQL, unittest, SQLite tests

**Spec:** `docs/superpowers/specs/2026-11-04-book-data-integrity-design.md`

## Global Constraints

- Creation defaults an omitted `total_copies` to `1`; supplied values must be whole numbers of at least `1`.
- Updates leave omitted `total_copies` unchanged and continue using `Book.adjust_total_copies` for borrowed-copy protection.
- Omitted or blank `pages` means `None` during creation; omitted pages remain unchanged during update, while blank pages clear the value.
- Numeric validation must finish before category creation, image upload, or any `Book` mutation.
- Existing invalid database rows must stop migration with a descriptive error and must never be automatically changed.
- Do not change title, author, ISBN, category authorization, or image lifecycle policy.

## Review Focus

- Boolean, float, decimal-string, signed zero, whitespace-only, and nonnumeric values must not be silently converted into valid counts.
- A rejected update must leave title, author, pages, copy counts, category, and image URL unchanged in the active session.
- Invalid creation must not create a category or call the external image uploader before failing.
- SQL `NULL` remains allowed only for `pages`; copy-count columns retain their existing non-null requirements.
- Migration downgrade must remove only the four constraints introduced by this change.

---

### Task 1: Service numeric parsing and mutation ordering

**Files:**
- Modify: `backend/tests/test_book_service.py`
- Modify: `backend/app/services/book_service.py:156-230`

**Interfaces:**
- Produces: `BookService._parse_book_integer(raw_value, label, *, minimum) -> int` for strict integer parsing that rejects booleans, floats, decimal strings, blanks, and nonnumeric values.
- Updates: `BookService.create_book` and `BookService.update_book` with the creation/update omission and blank-page semantics in the spec.
- Preserves: `Book.adjust_total_copies(new_total)` as the borrowed-copy invariant for updates.

- [ ] **Step 1: Write failing service tests**

Add a `BookNumericValidationTests` class using the existing real SQLite setup and `MultiDict` inputs:

- `test_create_defaults_omitted_total_and_allows_blank_pages` asserts total/available copies are `1` and pages are `None`.
- `test_create_accepts_positive_whole_number_fields` asserts supplied total copies and pages persist exactly.
- `test_create_rejects_malformed_total_copies_before_side_effects` covers `""`, whitespace, `"1.5"`, `"copies"`, a float, and a boolean; assert the whole-number message, no book/category rows, and no upload call.
- `test_create_rejects_nonpositive_total_copies` covers `"0"`, `"-1"`, and signed zero with `"Total copies must be 1 or greater"`.
- `test_create_rejects_malformed_or_nonpositive_pages` distinguishes malformed values from `0`/negative values and asserts no rows or upload.
- `test_update_omits_numeric_fields_without_changing_them` asserts existing count and pages remain unchanged.
- `test_update_blank_pages_clears_page_count` asserts blank input persists `None`.
- `test_rejected_update_preserves_all_book_state_and_skips_upload` supplies other changed fields plus an invalid numeric value and asserts every persisted and in-session field remains unchanged and upload is not called.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_book_service.BookNumericValidationTests -v`

Expected: failures show malformed values are silently defaulted or ignored, non-positive creation is accepted, blank pages cannot clear, or fields mutate before validation.

- [ ] **Step 3: Implement strict parsing and validation-first ordering**

Add `_parse_book_integer(raw_value, label, *, minimum) -> int` and small omission/blank handling local to create/update. Parse all numeric inputs before calling `get_or_create_category`, `upload_book_cover`, or assigning any `Book` field. Use these messages exactly: `"Total copies must be a whole number"`, `"Total copies must be 1 or greater"`, `"Pages must be a whole number"`, and `"Pages must be greater than 0"`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_book_service.BookNumericValidationTests -v`

Expected: all numeric service tests pass.

- [ ] **Step 5: Commit Task 1**

```powershell
git add backend/app/services/book_service.py backend/tests/test_book_service.py
git commit -m "fix: validate book numeric fields"
```

### Task 2: Book table check constraints

**Files:**
- Modify: `backend/app/models/book.py:7-31`
- Modify: `backend/tests/test_book_service.py`

**Interfaces:**
- Produces these model constraint names and expressions for Task 3: `ck_books_total_copies_positive` (`total_copies >= 1`), `ck_books_available_copies_nonnegative` (`available_copies >= 0`), `ck_books_available_not_above_total` (`available_copies <= total_copies`), and `ck_books_pages_positive` (`pages IS NULL OR pages > 0`).

- [ ] **Step 1: Write failing database-constraint tests**

Add `BookDatabaseConstraintTests` with one real commit attempt per invariant. Assert `sqlalchemy.exc.IntegrityError`, rollback after every attempt, and verify no invalid `Book` remains. Include valid boundary rows for total/available `1`, available `0`, and pages `None`/`1`.

- [ ] **Step 2: Run constraint tests and verify RED**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_book_service.BookDatabaseConstraintTests -v`

Expected: invalid direct writes commit successfully because the model metadata has no checks.

- [ ] **Step 3: Add named SQLAlchemy checks**

Define `Book.__table_args__` with the four exact `db.CheckConstraint` names and expressions produced by this task. Do not add constructor or property-setter policy beyond the database constraints.

- [ ] **Step 4: Run focused service and constraint tests**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_book_service.BookNumericValidationTests tests.test_book_service.BookDatabaseConstraintTests -v`

Expected: both test classes pass.

- [ ] **Step 5: Commit Task 2**

```powershell
git add backend/app/models/book.py backend/tests/test_book_service.py
git commit -m "fix: constrain book inventory data"
```

### Task 3: Fail-fast Alembic migration and final verification

**Files:**
- Create: `backend/migrations/versions/a7b8c9d0e1f2_add_book_integrity_constraints.py`
- Create: `backend/tests/test_book_integrity_migration.py`

**Interfaces:**
- Consumes: the four constraint names and SQL expressions from Task 2.
- Produces: Alembic revision `a7b8c9d0e1f2` with `down_revision = "f6d7e8a9b0c1"`.
- Produces: `upgrade()` that queries violation counts first and creates no constraint when any count is nonzero; `downgrade()` drops exactly the four constraints from `books` using `type_="check"`.

- [ ] **Step 1: Write failing migration tests**

Load the migration module by file path and test observable Alembic behavior. The test loader must call `self.fail("Book integrity migration is missing")` when the revision file is absent so the RED run is an intentional assertion failure rather than an import error:

- `test_upgrade_aborts_before_constraints_when_invalid_rows_exist` supplies nonzero violation counts, asserts a descriptive `RuntimeError` naming each nonzero category/count, and asserts `create_check_constraint` is never called.
- `test_upgrade_creates_exact_constraints_after_clean_preflight` supplies zero counts and asserts the four exact table/name/expression calls.
- `test_downgrade_drops_only_book_integrity_constraints` asserts the four exact drop calls with `type_="check"`.

- [ ] **Step 2: Run migration tests and verify RED**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_book_integrity_migration -v`

Expected: FAIL with `Book integrity migration is missing` because revision `a7b8c9d0e1f2` does not exist.

- [ ] **Step 3: Implement the migration**

Create the revision with one aggregate preflight query reporting counts for invalid total copies, negative available copies, available copies above total, and non-positive non-null pages. Raise before any DDL when a count is nonzero; otherwise add the four named checks. Downgrade in reverse creation order.

- [ ] **Step 4: Run migration and book tests**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest tests.test_book_integrity_migration tests.test_book_service -v`

Expected: all migration and book tests pass.

- [ ] **Step 5: Verify migration graph and complete backend suite**

Run: `cd backend; .\.venv\Scripts\python.exe -m flask --app run.py db heads`

Expected: exactly `a7b8c9d0e1f2 (head)`.

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest discover -s tests -v`

Expected: all runnable tests pass; the PostgreSQL backup/restore integration class may remain skipped when `TEST_DATABASE_URL` is unset. Do not apply the migration to the configured development database automatically.

- [ ] **Step 6: Review and commit Task 3 plus approved documents**

Run: `git diff --check` and inspect the complete range against the spec.

```powershell
git add backend/migrations/versions/a7b8c9d0e1f2_add_book_integrity_constraints.py backend/tests/test_book_integrity_migration.py docs/superpowers/specs/2026-11-04-book-data-integrity-design.md docs/superpowers/plans/2026-11-04-book-data-integrity.md
git commit -m "fix: enforce book data integrity"
```
