# Staff Sidebar Profile Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the administrator/librarian sidebar's standalone Settings and Logout rows with an accessible profile dropdown containing those actions.

**Architecture:** Keep the behavior inside the existing `NavContent` component and reuse the project's Base UI-backed dropdown primitives. Control the menu's open state so pointer hover, keyboard focus, and trigger activation share one menu, with a short close delay allowing movement from the trigger into the portalled menu.

**Tech Stack:** React 19, TypeScript, React Router, Base UI dropdown primitives, Testing Library, Vitest

**Spec:** `docs/superpowers/specs/2026-11-03-staff-sidebar-profile-menu-design.md`

## Global Constraints

- Apply the change to administrator and librarian navigation, not student catalog navigation.
- Remove Settings from the main staff navigation and remove the standalone Logout footer button.
- Preserve `/profile` navigation and the existing logout-then-`/login` behavior.
- Support expanded and collapsed desktop sidebars.
- Open on hover while retaining keyboard focus and click access.
- Reuse existing dependencies; add no new package.
- Preserve unrelated work in `frontend/src/features/details-panels.test.tsx` and the pending migration deletion.

## Review Focus

- Moving the pointer from the profile trigger to the portalled menu must not close it; pin this in Task 1's delayed-close test.
- A pending close timer must not reopen or update state after unmount; pin timer cleanup in Task 1's unmount test.
- Keyboard users must reach the same Settings and Logout actions without hover; pin focus and activation in Task 1's accessibility test.
- Collapsed mode must expose an intelligibly named avatar trigger and a usable menu; pin this in Task 1's collapsed-mode test.
- Selecting Logout must invoke logout once and only then navigate to `/login`; pin call order and destination in Task 1's action test.

---

### Task 1: Accessible staff profile actions menu

**Files:**
- Modify: `frontend/src/components/layout/NavContent.tsx`
- Modify: `frontend/src/components/layout/NavContent.test.tsx`

**Interfaces:**
- Consumes: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, and `DropdownMenuSeparator` from `@/components/ui/dropdown-menu`; existing `useAuth().logout`; React Router's `navigate`.
- Produces: an account-menu trigger named `Account menu for <username>` and menu items named `Settings` and `Logout` for administrator/librarian sidebar users.

- [ ] **Step 1: Write failing profile-menu visibility tests**

Add tests named:

- `moves Settings and Logout from standalone navigation into the profile menu for admins`
- `shows the same profile menu for librarians without administrator-only links`

Assert that Settings and Logout are absent before opening the menu, hovering the account trigger reveals both menu items, Settings is no longer a main navigation link, and the librarian still lacks Users and Data Backups.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm.cmd test -- src/components/layout/NavContent.test.tsx`

Expected: FAIL because the current sidebar exposes Settings and Logout as standalone controls and has no account menu.

- [ ] **Step 3: Write failing interaction and edge-case tests**

Add tests named:

- `keeps the menu open while moving from the profile trigger into the menu`
- `opens the account menu with keyboard focus and trigger activation`
- `uses the avatar as an accessible account trigger when collapsed`
- `navigates to Settings and logs out before navigating to login`
- `clears a pending hover-close timer when unmounted`

Use fake timers only in the delayed-close and cleanup tests. Assert the menu remains open when the trigger receives `mouseLeave` and the menu receives `mouseEnter` before the 150 ms delay; assert focus/click reveals menu items; assert collapsed mode retains the `Account menu for Alex Admin` name; assert Settings reaches `/profile`; and assert Logout is awaited before the location becomes `/login`.

- [ ] **Step 4: Run the focused tests and verify RED for the new interactions**

Run: `npm.cmd test -- src/components/layout/NavContent.test.tsx`

Expected: FAIL because hover/focus/click control, delayed close, timer cleanup, and menu actions are not implemented.

- [ ] **Step 5: Implement the controlled profile dropdown**

In `NavContent.tsx`:

- Remove the staff Settings item from `getNavItems()`.
- Add controlled menu state and one close-timeout ref, with helpers to cancel, open, and schedule close after 150 ms; clear the timeout on unmount.
- Replace the footer profile `NavLink` and standalone Logout button with one Base UI dropdown.
- Make the trigger show the full profile card when expanded and only the avatar when collapsed, with `aria-label="Account menu for <username>"`.
- Open/cancel closing on trigger `mouseEnter` and `focus`; schedule closing on trigger `mouseLeave`. Let Base UI retain control of keyboard focus transitions and outside-focus dismissal through `onOpenChange`.
- Apply the same enter/leave cancellation behavior to `DropdownMenuContent`, using `side="top"` and `align="start"` when expanded, then `side="right"` and `align="end"` when collapsed.
- Add Settings and destructive Logout menu items with existing Lucide icons.
- Settings calls `navigate("/profile")` and `onItemClick?.()`.
- Logout awaits the existing `handleLogout()` and invokes `onItemClick?.()` so the mobile drawer can close.

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run: `npm.cmd test -- src/components/layout/NavContent.test.tsx`

Expected: all `NavContent` tests PASS with no unhandled timer or accessibility warnings.

- [ ] **Step 7: Run frontend regression verification**

Run: `npm.cmd test`

Expected: all frontend tests PASS.

Run: `npm.cmd run build`

Expected: TypeScript and Vite build exit successfully.

- [ ] **Step 8: Review the diff and commit only the feature files**

Run: `git diff -- frontend/src/components/layout/NavContent.tsx frontend/src/components/layout/NavContent.test.tsx`

Confirm the diff does not include `frontend/src/features/details-panels.test.tsx` or backend migration changes.

```powershell
git add -- frontend/src/components/layout/NavContent.tsx frontend/src/components/layout/NavContent.test.tsx
git commit -m "refactor: move staff actions into profile menu"
```
