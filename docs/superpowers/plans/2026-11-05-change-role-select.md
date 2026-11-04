# Change Role Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native Change Role selector with the application's shared `Select` UI while preserving role-update behavior.

**Architecture:** Keep role state and mutations in `UserTable`; only swap the dialog's native control for the existing shared select primitives. Extend the existing `UserTable` interaction tests so styling consistency, accessible operation, and mutation timing are verified through the rendered UI.

**Tech Stack:** React, TypeScript, Base UI through `@/components/ui/select`, Vitest, Testing Library, user-event

**Spec:** `docs/superpowers/specs/2026-11-05-change-role-select-design.md`

## Global Constraints

- Options remain exactly Student (`student`), Librarian (`librarian`), and Admin (`admin`).
- The accessible control name remains `Account role`.
- The selected user's current role is the initial value.
- No update request occurs until `Save role` is activated.
- Backend and broader user-management behavior remain unchanged.

## Review Focus

- Opening the dialog for a student shows Student and leaves Save role disabled; pin in `shows the current role in the shared select`.
- Choosing Librarian enables Save role and submits `student-1` with `librarian`; pin in `submits a role selected from the shared dropdown`.
- Merely choosing an option does not submit early; pin in `submits a role selected from the shared dropdown`.
- Canceling and reopening resets the draft to the user's persisted role; pin in `discards an unsaved role selection`.
- Keyboard users can open the trigger and choose an option; pin in `supports keyboard role selection`.

---

### Task 1: Shared Change Role Select

**Files:**
- Modify: `frontend/src/features/auth/components/UserTable.tsx`
- Test: `frontend/src/features/auth/components/UserTable.test.tsx`

**Interfaces:**
- Consumes: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, and `SelectValue` from `@/components/ui/select`; existing `roleDraft: UserRole` and `updateRole.mutate(...)`.
- Produces: an accessible `Account role` shared-select trigger whose `onValueChange` updates `roleDraft` only for non-null role values.

- [ ] **Step 1: Add failing shared-select interaction tests**

Add these focused cases to `UserTable.test.tsx`:

- `shows the current role in the shared select`: open Bianca's profile and Change Role dialog; assert the `Account role` combobox has `data-slot="select-trigger"`, displays `Student`, and Save role is disabled.
- `submits a role selected from the shared dropdown`: open the trigger, choose Librarian, assert no mutation occurred before Save, click Save role, then expect `updateRole` with `{ userId: "student-1", role: "librarian" }` and mutation callbacks.
- `discards an unsaved role selection`: choose Librarian, cancel, reopen the dialog, and assert Student is restored with Save role disabled.
- `supports keyboard role selection`: focus the trigger, use keyboard input to open and choose Librarian, and assert the trigger displays Librarian.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- src/features/auth/components/UserTable.test.tsx --reporter=verbose`

Expected: FAIL because the Account role control is still a native select and does not expose the shared `data-slot="select-trigger"` behavior.

- [ ] **Step 3: Replace the native selector with the shared primitives**

In `UserTable.tsx`:

- Import the five shared select exports named in Interfaces.
- Remove the custom native-select wrapper and direct `ChevronDown` dependency.
- Render a full-width, 44px-tall `SelectTrigger` with `aria-label="Account role"` and `SelectValue`.
- Render the three exact `SelectItem` values inside `SelectContent`.
- Use `onValueChange` to set `roleDraft` only when the value is non-null, casting the known option value to `UserRole`.
- Keep all dialog copy, Save/Cancel behavior, mutation payloads, and disabled rules unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm.cmd test -- src/features/auth/components/UserTable.test.tsx --reporter=verbose`

Expected: all `UserTable` tests PASS.

- [ ] **Step 5: Run full frontend verification**

Run: `npm.cmd test -- --reporter=verbose`

Expected: all frontend tests PASS.

Run: `npm.cmd run build`

Expected: TypeScript and Vite production build PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- frontend/src/features/auth/components/UserTable.tsx frontend/src/features/auth/components/UserTable.test.tsx docs/superpowers/specs/2026-11-05-change-role-select-design.md docs/superpowers/plans/2026-11-05-change-role-select.md
git commit -m "refactor: use shared change role select"
```
