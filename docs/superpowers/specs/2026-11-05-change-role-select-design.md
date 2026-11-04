# Change Role Select Design

## Intent

Replace the native HTML role selector in the administrator's Change Role dialog with the project's shared `Select` UI primitive so it visually and behaviorally matches other application dropdowns.

## Goals

- Render the role field with `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, and `SelectItem`.
- Keep the Student, Librarian, and Admin options and the current role as the initial selection.
- Preserve keyboard accessibility, dialog behavior, save-button validation, pending state, and the existing role-update mutation.
- Add a focused UI regression test that opens the dialog, selects another role through the shared dropdown, and verifies the save action uses that role.

## Non-goals

- No backend, authorization, role-policy, profile-sheet, or user-table workflow changes.
- No redesign of other filters or dropdowns.

## Approaches

1. **Shared `Select` primitive — selected.** This is the established form-control pattern already used by category and review fields and provides consistent styling and keyboard behavior.
2. **`FilterSelect`.** Rejected because it is intended for compact table filtering rather than editing a form value inside a dialog.

## Implementation constraints

The change stays within `UserTable` and its existing tests. The visible label remains "Account role," the accessible control name remains "Account role," and no role-change request is sent until the administrator selects Save role.
