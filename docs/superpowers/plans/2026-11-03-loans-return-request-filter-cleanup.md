# Loans Return-Request Filter Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete “Return requested” choice and its unreachable local filter branch from the Loans & Returns page.

**Architecture:** Keep the cleanup localized to the active-loan filter type and `AdminBorrowsPage`. Preserve `PENDING_RETURN` as a supported loan status so existing records remain visible and actionable.

**Tech Stack:** React 19, TypeScript, Testing Library, Vitest

**Spec:** `docs/superpowers/specs/2026-11-03-loans-return-request-filter-cleanup-design.md`

## Global Constraints

- Remove only the active-loan filter option and dead local filter plumbing.
- Preserve `PENDING_RETURN` in shared borrow types, status presentation, backend services, and stored records.
- Preserve all remaining filter labels and behavior.
- Add no dependency and perform no unrelated refactor.

## Review Focus

- Existing `PENDING_RETURN` loans must remain in the active table; pin this in Task 1's page regression test.
- The status dropdown must retain All active loans, Overdue, Due today, and Borrowed; pin the complete option list in Task 1.
- “Return requested” must be absent from the native accessible dropdown, not merely visually hidden; query the select options in Task 1.
- Active summary counts must continue including `PENDING_RETURN`; retain the existing count assertion alongside the new test.
- Shared `PENDING_RETURN` workflow code must remain untouched; verify the final diff is limited to the three planned frontend files.

---

### Task 1: Remove the obsolete active-loan filter

**Files:**
- Modify: `frontend/src/pages/adminPage/AdminBorrowsPage.test.tsx`
- Modify: `frontend/src/pages/adminPage/AdminBorrowsPage.tsx`
- Modify: `frontend/src/features/borrows/lib/loanView.ts`

**Interfaces:**
- Consumes: `FilterSelect`'s native accessible `<select aria-label="Loan status">` and `ActiveLoanFilter`.
- Produces: `ActiveLoanFilter = "all" | "overdue" | "due-today" | "borrowed"` and the matching four visible dropdown choices.

- [ ] **Step 1: Write the failing regression test**

Add `removes Return requested from the active status filter while preserving pending-return loans` to `AdminBorrowsPage.test.tsx`. Assert the Loan status select exposes exactly `All active loans`, `Overdue`, `Due today`, and `Borrowed`; assert no option named `Return requested`; and assert the existing `PENDING_RETURN` fixture for Bea Cruz remains visible.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- src/pages/adminPage/AdminBorrowsPage.test.tsx`

Expected: FAIL because the select still contains `Return requested`.

- [ ] **Step 3: Remove the option and dead filter plumbing**

In `loanView.ts`, remove `"return-requested"` from `ActiveLoanFilter`. In `AdminBorrowsPage.tsx`, remove the `activeFilter === "return-requested"` condition and the `{ value: "return-requested", label: "Return requested" }` option. Do not alter `PENDING_RETURN` handling elsewhere.

- [ ] **Step 4: Run focused verification**

Run: `npm.cmd test -- src/pages/adminPage/AdminBorrowsPage.test.tsx`

Expected: all AdminBorrowsPage tests PASS.

- [ ] **Step 5: Run frontend regression verification**

Run: `npm.cmd test`

Expected: all frontend tests PASS.

Run: `npm.cmd run build`

Expected: TypeScript and Vite build successfully.

- [ ] **Step 6: Review and commit only the cleanup files**

Run: `git diff -- frontend/src/pages/adminPage/AdminBorrowsPage.test.tsx frontend/src/pages/adminPage/AdminBorrowsPage.tsx frontend/src/features/borrows/lib/loanView.ts`

Confirm no shared status, backend, or unrelated file changed.

```powershell
git add -- frontend/src/pages/adminPage/AdminBorrowsPage.test.tsx frontend/src/pages/adminPage/AdminBorrowsPage.tsx frontend/src/features/borrows/lib/loanView.ts
git commit -m "refactor: remove return-request loan filter"
```
