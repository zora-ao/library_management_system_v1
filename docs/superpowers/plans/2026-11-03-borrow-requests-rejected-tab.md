# Borrow Requests Rejected Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed Borrow Requests History view with a dedicated Rejected view while keeping returned books in Loans & Returns.

**Architecture:** Keep the existing route-backed tab structure and narrow the borrow-request view model so each tab maps to one workflow status. Update the page and sidebar to expose `/borrow-requests/rejected`; reuse the existing read-only details sheet for rejected records.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-11-03-borrow-requests-rejected-tab-design.md`

## Global Constraints

- Borrow Requests tabs are exactly Pending, For Pickup, and Rejected.
- Rejected contains only `REJECTED` records and orders them newest first by `created_at`.
- Returned, borrowed, overdue, and pending-return records remain outside Borrow Requests.
- The existing Pending, For Pickup, Loans & Returns, and backend workflows are unchanged.
- `/borrow-requests/history` falls back to `/borrow-requests/pending` through the existing invalid-tab redirect.
- No new dependencies or backend changes.

## Review Focus

- Mixed API results: the Rejected tab must exclude returned and active-loan statuses (Task 1 test).
- Multiple rejected records: newest `created_at` must appear first (Task 1 test).
- Date filtering: rejected rows must continue matching their request creation date (Task 1 test).
- Retired deep link: `/borrow-requests/history` must redirect to Pending instead of rendering stale history (Task 2 test).
- Rejected details: the rejection reason must be visible without Approve or Reject actions (Task 2 test).

---

### Task 1: Narrow the borrow-request view model

**Files:**
- Modify: `frontend/src/features/borrows/lib/borrowRequestView.ts`
- Modify: `frontend/src/features/borrows/components/BorrowRequestsTable.tsx`
- Test: `frontend/src/features/borrows/lib/borrowRequestView.test.ts`
- Test: `frontend/src/features/borrows/components/BorrowRequestWorkflow.test.tsx`

**Interfaces:**
- Consumes: `Borrow` and its existing status union.
- Produces: `BorrowRequestTab = "pending" | "pickup" | "rejected"`; `classifyBorrowRequests(rows, "rejected")` returns only `REJECTED` rows, newest by `created_at`.

- [ ] **Step 1: Write failing view-model tests**

Update `classifies and orders each workflow tab` to assert Pending and For Pickup remain unchanged, while Rejected contains only two literal `REJECTED` fixtures in newest-first order and excludes `BORROWED`, `OVERDUE`, `PENDING_RETURN`, and `RETURNED`. Add a date-filter assertion proving a rejected row matches its `created_at` local date.

- [ ] **Step 2: Run the view-model test and confirm RED**

Run: `npm.cmd test -- src/features/borrows/lib/borrowRequestView.test.ts`

Expected: FAIL because `"rejected"` is not a valid `BorrowRequestTab` and classification still uses mixed history statuses.

- [ ] **Step 3: Implement the narrowed tab contract**

In `borrowRequestView.ts`, replace `"history"` with `"rejected"`, remove `HISTORY_STATUSES` and the mixed activity-date branch, and classify Rejected as `status === "REJECTED"`, newest by `created_at`.

- [ ] **Step 4: Add a failing empty-state component test**

In `BorrowRequestWorkflow.test.tsx`, render `BorrowRequestsTable` with `tab="rejected"` and no rows; assert the page says `No rejected requests`.

- [ ] **Step 5: Run the component test and confirm RED**

Run: `npm.cmd test -- src/features/borrows/components/BorrowRequestWorkflow.test.tsx`

Expected: FAIL because the table still defines History copy and has no Rejected tab contract.

- [ ] **Step 6: Update table copy**

Replace the History empty-state entry with `rejected: "No rejected requests"`. Preserve existing status labels and row actions.

- [ ] **Step 7: Verify Task 1 GREEN**

Run: `npm.cmd test -- src/features/borrows/lib/borrowRequestView.test.ts src/features/borrows/components/BorrowRequestWorkflow.test.tsx`

Expected: both files pass.

- [ ] **Step 8: Commit Task 1**

```powershell
git add frontend/src/features/borrows/lib/borrowRequestView.ts frontend/src/features/borrows/lib/borrowRequestView.test.ts frontend/src/features/borrows/components/BorrowRequestsTable.tsx frontend/src/features/borrows/components/BorrowRequestWorkflow.test.tsx
git commit -m "refactor: isolate rejected borrow requests"
```

### Task 2: Replace the page tab and route behavior

**Files:**
- Modify: `frontend/src/pages/adminPage/BorrowRequestsPage.tsx`
- Test: `frontend/src/pages/adminPage/BorrowRequestsPage.test.tsx`

**Interfaces:**
- Consumes: Task 1's `BorrowRequestTab` and `classifyBorrowRequests` contract.
- Produces: a route-backed Rejected tab at `/borrow-requests/rejected`; legacy History URLs redirect to Pending.

- [ ] **Step 1: Add rejected and legacy-route fixtures**

Extend the page test data with two `REJECTED` records containing distinct `created_at` values and rejection reasons, plus explicit `RETURNED` and active-loan records.

- [ ] **Step 2: Write failing page behavior tests**

Add tests that:

- Render `/borrow-requests/rejected`, find the Rejected tab, verify rejected records are newest first, and verify returned/active records are absent.
- Open a rejected record and assert its rejection reason appears while `Approve request` and `Reject` buttons are absent.
- Render `/borrow-requests/history` with a location probe and assert the final path is `/borrow-requests/pending`.

- [ ] **Step 3: Run the page tests and confirm RED**

Run: `npm.cmd test -- src/pages/adminPage/BorrowRequestsPage.test.tsx`

Expected: FAIL because the page still declares History and treats Rejected as an invalid route.

- [ ] **Step 4: Implement the Rejected page tab**

In `BorrowRequestsPage.tsx`, replace `{ value: "history", label: "History" }` with `{ value: "rejected", label: "Rejected" }`. Default Rejected ordering to `"newest"`, sort it by `created_at`, and leave the existing invalid-tab redirect unchanged.

- [ ] **Step 5: Verify Task 2 GREEN**

Run: `npm.cmd test -- src/pages/adminPage/BorrowRequestsPage.test.tsx`

Expected: all page tests pass.

- [ ] **Step 6: Commit Task 2**

```powershell
git add frontend/src/pages/adminPage/BorrowRequestsPage.tsx frontend/src/pages/adminPage/BorrowRequestsPage.test.tsx
git commit -m "feat: add rejected borrow requests tab"
```

### Task 3: Align staff navigation and verify the feature

**Files:**
- Modify: `frontend/src/components/layout/NavContent.tsx`
- Test: `frontend/src/components/layout/NavContent.test.tsx`

**Interfaces:**
- Consumes: Task 2's `/borrow-requests/rejected` route.
- Produces: a Borrow Requests submenu containing Pending, For Pickup, and Rejected with no History link.

- [ ] **Step 1: Write the failing navigation test**

Update the existing Borrow Requests submenu test to assert `Rejected` links to `/borrow-requests/rejected` and `History` is absent after expanding the submenu.

- [ ] **Step 2: Run the navigation test and confirm RED**

Run: `npm.cmd test -- src/components/layout/NavContent.test.tsx`

Expected: FAIL because the sidebar still renders History.

- [ ] **Step 3: Update the sidebar child route**

In `NavContent.tsx`, replace the History child with `{ label: "Rejected", path: "/borrow-requests/rejected" }` for both admin and librarian navigation.

- [ ] **Step 4: Verify Task 3 GREEN**

Run: `npm.cmd test -- src/components/layout/NavContent.test.tsx`

Expected: all navigation tests pass.

- [ ] **Step 5: Run complete frontend verification**

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd exec -- eslint src/features/borrows/lib/borrowRequestView.ts src/features/borrows/lib/borrowRequestView.test.ts src/features/borrows/components/BorrowRequestsTable.tsx src/features/borrows/components/BorrowRequestWorkflow.test.tsx src/pages/adminPage/BorrowRequestsPage.tsx src/pages/adminPage/BorrowRequestsPage.test.tsx src/components/layout/NavContent.tsx src/components/layout/NavContent.test.tsx
```

Expected: full test suite passes, build exits 0, and targeted lint exits 0.

- [ ] **Step 6: Commit Task 3**

```powershell
git add frontend/src/components/layout/NavContent.tsx frontend/src/components/layout/NavContent.test.tsx
git commit -m "refactor: link rejected borrow requests"
```

- [ ] **Step 7: Request a fresh-context whole-change review**

Review the implementation commits against this plan and the design spec. Fix all Critical and Important findings, rerun affected tests plus the full frontend suite, and commit any review fixes separately.
