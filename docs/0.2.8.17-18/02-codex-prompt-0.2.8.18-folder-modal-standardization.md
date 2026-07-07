# StudioWire IO 0.2.8.18 Folder Modal Standardization

## Summary

Bump the current dev version to `0.2.8.18`. Keep the project JSON shape unchanged.

Replace browser-native Folder prompts with app-native modals that use the same standardized modal shell, footer logo, field styling, and action layout introduced in `0.2.8.17`.

## Key Changes

- Bump app/schema/sample/docs/package metadata to `0.2.8.18`.
- Replace `window.prompt` usage for Folder workflows.
- Add an app-native Folder modal for:
  - Add Folder.
  - Rename Folder.
- Use the same standard modal shell as the rest of the app:
  - Header.
  - Scrollable content area.
  - Sticky footer.
  - CSS/text StudioWire IO footer mark on the left.
  - Action buttons on the right.
- Keep user-facing terminology as `Folder`.
- Keep internal storage names unchanged:
  - `subLocations`
  - `subLocationId`

## Folder Modal Behavior

- Add mode:
  - Title: `Add Folder`.
  - Field label: `Folder name`.
  - Primary action: `Add Folder`.
- Rename mode:
  - Title: `Rename Folder`.
  - Field label: `Folder name`.
  - Primary action: `Rename Folder`.
  - Initial field value is the current folder name.
- Cancel closes the modal without dispatching a command.
- Submitting trims the folder name.
- Empty trimmed names are blocked with inline validation inside the modal.
- Successful Add Folder dispatches the existing add-folder command.
- Successful Rename Folder dispatches the existing rename-folder command.
- Preserve the current context-menu entry names:
  - `Add Folder`.
  - `Rename Folder`.

## Implementation Notes

- Keep folder command/domain logic outside React rendering components.
- The left navigator should only manage modal open/close state, form state, and dispatching existing commands.
- Do not use browser-native `window.prompt` or `window.alert` for these workflows.
- Do not change folder storage shape or validation rules unless an existing validation test must be aligned with the modal behavior.
- Keep folders one level deep under locations.

## Docs And Naming

- Update README changelog.
- Update docs/version metadata as required by the repo version synchronization rules.
- Preserve the naming rule that `subLocations` / `subLocationId` are always `Folder` in UI copy.
- Do not add migrations or schema-shape changes.

## Test Plan

- Navigator/component focused tests:
  - Right-click location and choose `Add Folder` opens the app-native modal.
  - Right-click folder and choose `Rename Folder` opens the app-native modal.
  - Add Folder submit dispatches the add-folder command with trimmed name.
  - Rename Folder submit dispatches the rename-folder command with trimmed name.
  - Blank folder name shows inline validation and does not dispatch.
  - Cancel closes without dispatching.
  - `window.prompt` is not called for Add Folder or Rename Folder.
- Validation:
  - Run targeted tests for the navigator/folder modal.
  - Run `npm run typecheck`.
  - Run `npm run version:check`.
  - Run `npm run clean`.
  - Run `npm run clean:check`.

## Assumptions

- This is feature-development polish, not a release task.
- The Folder modal reuses the `0.2.8.17` standard modal/footer styling.
- Existing folder project data remains valid and unchanged.
- Existing add/rename folder reducer commands remain the source of truth.
