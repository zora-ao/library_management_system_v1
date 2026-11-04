# Book Data Integrity Design

## Intent

Prevent invalid copy counts and page counts from entering the library database through the API, direct service calls, or future database write paths. Invalid existing records must be reported rather than silently rewritten.

## Scope

- Validate numeric book fields in `BookService` before creating or mutating a `Book`.
- Keep creation backward-compatible by defaulting an omitted `total_copies` field to `1`; a supplied value must be a whole number of at least `1`.
- Leave `total_copies` unchanged when omitted during an update. A supplied update must remain compatible with the existing borrowed-copy calculation.
- Treat omitted or blank `pages` as no page count (`None`); on update, blank input clears the existing page count. A supplied value must be a positive whole number.
- Return the existing HTTP 400 response path for invalid numeric input through `ValueError` messages.
- Add named SQLAlchemy and PostgreSQL constraints for total copies, available copies, the relationship between them, and optional positive page counts.
- Add an Alembic migration whose preflight query aborts with a descriptive error if any current row violates a proposed constraint. The migration will not repair, delete, or otherwise rewrite those rows.

Title, author, ISBN, category authorization, image lifecycle handling, and other entity constraints are outside this change.

## Approaches Considered

1. Service-only validation gives useful API errors but leaves direct database writes unprotected.
2. Service validation plus database constraints provides both useful errors and durable data integrity. This is the selected approach.
3. Model setters and constructor validation complicate SQLAlchemy loading and still cannot replace database constraints.

## Design

`BookService` will use a focused numeric parser that distinguishes omitted, blank, malformed, and valid multipart form values. `create_book` and `update_book` will finish numeric validation before uploading an image or changing a model, preventing partial in-session mutations when validation fails. Existing `Book.adjust_total_copies` will continue enforcing the borrowed-copy rule during updates.

The `Book` table metadata and migration will define these named checks:

- `ck_books_total_copies_positive`: `total_copies >= 1`
- `ck_books_available_copies_nonnegative`: `available_copies >= 0`
- `ck_books_available_not_above_total`: `available_copies <= total_copies`
- `ck_books_pages_positive`: `pages IS NULL OR pages > 0`

The migration will query for violating rows before creating any check constraint and raise a clear error containing violation counts. Its downgrade will remove only these four named constraints.

## Testing

Tests will be written first and observed failing. Service tests will cover creation and update with zero, negative, decimal, nonnumeric, omitted, and blank input; valid persistence; clearing optional pages; and preserving state after rejected updates. Model/database tests will verify direct invalid inserts and updates are rejected by check constraints. Migration tests will verify the preflight failure and the exact constraint operations without requiring production data.

## Success Criteria

- No application path can create a book with fewer than one total copy, negative availability, availability above total copies, or a non-positive page count.
- API validation fails before image upload or model mutation.
- Existing invalid data stops the migration with a descriptive report and is never automatically changed.
- Valid create, update, borrowing, returning, archive, and restore tests continue to pass.
