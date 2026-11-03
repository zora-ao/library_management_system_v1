# Loans Return-Request Filter Cleanup Design

## Intent

Remove the obsolete “Return requested” choice from the Loans & Returns active-loan status filter because the current student experience does not offer a return-request action.

## Goals

- Remove “Return requested” from the active-loan dropdown.
- Remove the unreachable `return-requested` filter value and its filtering condition.
- Keep the remaining active-loan filters unchanged.

## Non-goals

- Removing the `PENDING_RETURN` borrow status from shared types, backend services, or stored records.
- Changing how staff record physical returns.
- Changing status labels for any existing `PENDING_RETURN` records.
- Altering student borrowing behavior.

## Approaches

- Selected: remove the visible option and its dead local filter plumbing. This keeps the page implementation aligned with the choices users can actually select.
- Rejected: remove only the visible option while retaining the unreachable type member and branch, because that would leave dead code.

## Implementation and verification

Update the `ActiveLoanFilter` type and Loans & Returns page filter logic/options. Add a page-level regression assertion that the dropdown no longer offers “Return requested” while the supported filters remain available, then run the focused tests, full frontend suite, and production build.
