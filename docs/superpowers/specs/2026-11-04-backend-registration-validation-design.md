# Backend Registration Validation Design

## Intent

Prevent clients from bypassing the registration rules enforced by the React form. The Flask API will reject malformed registration data before creating a `User` or `Student` record.

## Scope

- Validate and normalize registration input in `AuthService` so every caller receives the same protection.
- Preserve the existing frontend rules: username must contain at least 3 characters, email must be syntactically valid, and password must contain at least 8 characters.
- Normalize username by trimming surrounding whitespace and email by trimming whitespace and converting it to lowercase.
- Return HTTP 400 for invalid registration data and HTTP 409 for an existing username or email.
- Add route and service regression tests, including malformed field types, and verify that rejected requests do not create database records.

Login, Google sign-in, password changes, stronger password-complexity rules, and administrator account management are outside this change.

## Approaches Considered

1. Route-only validation is small, but service callers can bypass it.
2. Service-level validation with separate validation and conflict exceptions gives consistent enforcement and accurate HTTP status codes. This is the selected approach.
3. Model-level validation is broad but could unexpectedly change Google sign-in and other account workflows.

## Design

`AuthService.register_user` will accept raw registration values, validate their types and content, normalize the username and email, then perform the existing duplicate lookup and transactional creation. Dedicated exception types will distinguish invalid input from duplicate-account conflicts. The registration route will translate those exceptions into 400 and 409 JSON responses respectively.

Tests will be written first and observed failing before production code is changed. They will cover valid normalized registration, invalid email, short username, short password, non-string fields, duplicate accounts, and database non-creation for rejected data.

## Success Criteria

- Direct API requests cannot register malformed email addresses, short usernames, short passwords, or non-string values.
- Valid input is normalized consistently before persistence.
- Existing duplicate-account behavior remains HTTP 409.
- The focused registration tests and complete backend test suite pass.
