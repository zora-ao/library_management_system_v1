# Backend Registration Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the existing registration rules in the Flask backend and return distinct client errors for invalid input and duplicate accounts.

**Architecture:** `AuthService.register_user` will own normalization and validation so route and direct service callers share one enforcement point. Dedicated `RegistrationValidationError` and `RegistrationConflictError` exceptions will let the route map invalid data to HTTP 400 and duplicate data to HTTP 409 without parsing error strings.

**Tech Stack:** Python 3, Flask, Flask-SQLAlchemy, unittest, SQLite test database

**Spec:** `docs/superpowers/specs/2026-11-04-backend-registration-validation-design.md`

## Global Constraints

- Keep the frontend rules unchanged: username minimum 3 characters, valid email syntax, and password minimum 8 characters.
- Trim username whitespace and trim and lowercase email before persistence and duplicate checks.
- Reject malformed field types without producing HTTP 500.
- Do not change login, Google sign-in, password changes, or administrator account management.
- Add no dependency for email validation; use a small backend validator appropriate for the accepted address shape.

## Review Focus

- A JSON array, scalar, null, or malformed body must return HTTP 400 instead of raising an attribute error.
- Boolean, numeric, list, or object field values must be rejected as non-string input.
- Whitespace-only values must be treated as missing after normalization.
- Username and email values beyond their 100-character database columns must return HTTP 400.
- Rejected input must not create either a `User` or a related `Student` row.

---

### Task 1: Service-level registration validation

**Files:**
- Create: `backend/tests/test_auth_registration.py`
- Modify: `backend/app/services/auth_service.py:64-245`

**Interfaces:**
- Produces: `RegistrationValidationError(ValueError)` for invalid input. Messages are `"Username, email, and password must be strings"`, `"Username, email, and password are required"`, `"Username must be between 3 and 100 characters"`, `"Enter a valid email address"`, `"Email must be 100 characters or fewer"`, or `"Password must be at least 8 characters"` as applicable.
- Produces: `RegistrationConflictError(ValueError)` with `"Username or email already exists"` for an existing normalized username or email.
- Produces: `AuthService.validate_registration(username, email, password) -> tuple[str, str, str]`.
- Updates: `AuthService.register_user(username, email, password)` to validate before querying or writing.

- [ ] **Step 1: Write failing service tests**

Add an in-memory database test class with these tests:

- `test_register_user_normalizes_username_and_email` asserts that `"  Alice  "` and `"  ALICE@Example.COM "` persist as `"Alice"` and `"alice@example.com"`, with one related `Student`.
- `test_register_user_rejects_invalid_email` asserts `RegistrationValidationError` for `alice-at-example.com` and no `User` or `Student` rows.
- `test_register_user_rejects_short_username` asserts the same for a two-character normalized username.
- `test_register_user_rejects_short_password` asserts the same for a seven-character password.
- `test_register_user_rejects_non_string_fields` uses subtests for numeric, boolean, list, and object values.
- `test_register_user_rejects_blank_and_overlong_values` covers whitespace-only input plus username and email values over 100 characters.
- `test_register_user_raises_conflict_for_normalized_duplicate` registers one user, then asserts `RegistrationConflictError` for a case-and-whitespace variation of its email.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_auth_registration.py" -v`

Expected: FAIL because the exception classes and `validate_registration` do not exist and current service validation is missing.

- [ ] **Step 3: Implement the service validation contract**

In `auth_service.py`, define the two exception classes, an anchored email-pattern constant, and `validate_registration(username, email, password) -> tuple[str, str, str]`. Validate string types first, normalize username and email, enforce required values, username length 3-100, email length at most 100 and accepted email shape, and password length at least 8. Call it at the start of `register_user`, use normalized values in the duplicate query and created `User`, and raise `RegistrationConflictError("Username or email already exists")` for duplicates.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_auth_registration.py" -v`

Expected: all Task 1 tests pass.

- [ ] **Step 5: Commit Task 1**

```powershell
git add backend/app/services/auth_service.py backend/tests/test_auth_registration.py
git commit -m "fix: validate backend registration input"
```

### Task 2: Registration HTTP error mapping

**Files:**
- Modify: `backend/tests/test_auth_registration.py`
- Modify: `backend/app/blueprints/auth/routes.py:74-99`

**Interfaces:**
- Consumes: `RegistrationValidationError`, `RegistrationConflictError`, and normalized `AuthService.register_user` from Task 1.
- Produces: `/api/auth/register` responses of 201 for valid input, 400 for invalid input or a non-object JSON body, and 409 for normalized duplicates.

- [ ] **Step 1: Write failing route tests**

Add these tests to the registration test module:

- `test_register_route_returns_400_for_each_invalid_field` covers invalid email, short username, short password, and a non-string field; assert the JSON message and unchanged row counts.
- `test_register_route_rejects_non_object_json` uses subtests for an array, scalar, null, malformed JSON, and a missing JSON content type; each must return HTTP 400 with `{"message": "Request body must be a JSON object"}`.
- `test_register_route_returns_409_for_normalized_duplicate` creates a user, posts its uppercase and whitespace-padded email, and asserts HTTP 409.
- `test_register_route_persists_normalized_valid_input` posts valid padded input, asserts HTTP 201, and verifies the normalized database values and related student.

- [ ] **Step 2: Run the route tests and verify RED**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_auth_registration.py" -v`

Expected: route tests fail because the route still accesses and normalizes raw fields itself and maps every service `ValueError` to HTTP 409.

- [ ] **Step 3: Implement route parsing and exception mapping**

Update `routes.py` to import both registration exception types, require the parsed JSON body to be a dictionary, pass raw field values to `AuthService.register_user`, map `RegistrationValidationError` to HTTP 400, and map `RegistrationConflictError` to HTTP 409. Keep the successful HTTP 201 response unchanged and log unexpected failures through `current_app.logger.exception` without including internal exception details in the response.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_auth_registration.py" -v`

Expected: all registration service and route tests pass.

- [ ] **Step 5: Run the complete backend regression suite**

Run: `cd backend; .\.venv\Scripts\python.exe -m unittest discover -s tests -v`

Expected: all runnable tests pass; the PostgreSQL backup/restore integration class may remain skipped when `TEST_DATABASE_URL` is unset.

- [ ] **Step 6: Review the final diff and commit Task 2**

Run: `git diff --check` and `git diff -- backend/app/services/auth_service.py backend/app/blueprints/auth/routes.py backend/tests/test_auth_registration.py`

```powershell
git add backend/app/blueprints/auth/routes.py backend/tests/test_auth_registration.py
git commit -m "test: cover registration validation responses"
```
