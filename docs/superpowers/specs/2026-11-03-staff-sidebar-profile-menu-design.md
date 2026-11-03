# Staff Sidebar Profile Menu Design

## Intent

Consolidate the administrator and librarian account actions into the sidebar profile area. Hovering the profile should reveal Settings and Logout without leaving permanent action rows at the bottom of the sidebar.

## Goals

- Remove Settings from the main staff navigation.
- Remove the standalone Logout footer button.
- Add a profile menu containing Settings and Logout for administrators and librarians.
- Open the menu on pointer hover while also supporting keyboard focus and click.
- Support both expanded and collapsed desktop sidebar layouts.
- Keep Settings navigation and Logout behavior unchanged.

## Non-goals

- Changing student navigation or the student catalog account menu.
- Redesigning the Settings page or authentication flow.
- Changing mobile-sidebar navigation beyond inheriting the same accessible profile menu behavior where `NavContent` is reused.

## Approach

Use the project's existing Radix-based `DropdownMenu` components, controlled by the profile trigger's hover, focus, and click interactions. The menu will be positioned above the profile area to remain visible near the bottom edge. Settings will navigate to `/profile`; Logout will call the existing logout function and navigate to `/login`.

Alternatives considered:

- A CSS-only hover menu was rejected because it would not provide reliable keyboard, click, touch, or outside-click behavior.
- A custom React popover was rejected because it would duplicate positioning and accessibility behavior already supplied by Radix.

## Interaction details

- Entering the profile trigger or menu keeps the menu open.
- Leaving the combined trigger/menu region closes it after a short delay, preventing accidental closure while moving between them.
- Keyboard focus and trigger activation open the same menu.
- Selecting Settings closes the menu and navigates to `/profile`.
- Selecting Logout closes the menu, performs logout, and navigates to `/login`.
- In collapsed mode, the avatar remains the trigger and the menu opens beside/above it without expanding the sidebar.

## Verification

Component tests will cover admin and librarian visibility, hover opening, keyboard/click access, Settings navigation, Logout behavior, and collapsed mode. The frontend test suite and build will be run after implementation.
