# Borrow Requests Rejected Tab Design

## Intent

Keep the Borrow Requests workspace focused on the request lifecycle. Rejected requests need their own view, while completed circulation records belong in Loans & Returns.

## Goals

- Replace the Borrow Requests **History** tab with a **Rejected** tab.
- Show only records with status `REJECTED` in that tab, newest first.
- Keep returned books exclusively in **Loans & Returns > Return History**.
- Remove borrowed, overdue, pending-return, and returned loans from Borrow Requests tab classification.
- Update the staff sidebar submenu to use **Rejected** and route to `/borrow-requests/rejected`.
- Preserve the existing Pending and For Pickup workflows and actions.

## Non-goals

- Changing backend borrow statuses or API responses.
- Changing approval, rejection, pickup, or return mutations.
- Redesigning Loans & Returns or the student borrowing pages.
- Adding a rejected-request summary card or changing the current three summary cards.

## Constraints and behavior

- The tab remains route-backed, using `/borrow-requests/rejected`.
- The old `/borrow-requests/history` route is no longer a valid tab and follows the page's existing fallback to `/borrow-requests/pending`.
- Rejected requests use their request creation date for date filtering and ordering because the current model has no separate rejection timestamp.
- Opening a rejected row remains read-only: staff can inspect its details and rejection reason, but approval and rejection controls stay unavailable.
- Empty-state copy should explicitly say there are no rejected requests.

## Approaches considered

### 1. Replace History with Rejected -- selected

Borrow Requests contains Pending, For Pickup, and Rejected. Returned books remain in Loans & Returns. This gives each workspace one clear responsibility and avoids duplicated circulation records.

### 2. Add both Rejected and Returned tabs

This makes both statuses easy to reach from Borrow Requests, but duplicates the existing Return History and blurs the boundary between request processing and active/completed loans.

### 3. Keep History and add a status filter

This changes less code, but the tab would still mix request outcomes with active and completed loans, leaving the original organization problem in place.

## Testing

- View-model tests verify each tab contains only its intended statuses and that Rejected is newest first.
- Page tests verify the Rejected route/tab and ensure returned and active loans are absent.
- Navigation tests verify the sidebar links to Rejected instead of History.
- Existing Pending and For Pickup workflow tests remain green.
