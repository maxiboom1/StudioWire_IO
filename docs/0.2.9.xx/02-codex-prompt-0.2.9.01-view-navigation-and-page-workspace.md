# Codex implementation prompt - StudioWire IO `0.2.9.01`

## Assignment

Implement only the StudioWire IO `0.2.9.01` View navigation, CRUD UI, selection, Inspector, and page workspace shell.

This is a feature-development task. Read `AGENTS.md` and `docs/0.2.9.xx/README.md` completely. The repository must start at completed app/schema version `0.2.9.00`. If prompt 01 is not complete and passing, stop and report that prerequisite instead of folding its work into this prompt.

Do not implement source placement, device/rack View rendering, manual lines, annotations, or undo/redo yet. Do not show fake or disabled controls for those later tools.

## Target version and compatibility

Bump every synchronized app/schema/version surface from `0.2.9.00` to `0.2.9.01`.

Preserve staged files:

- Keep `0.2.8.25` supported through its existing additive migration.
- Add `0.2.9.00` to supported schema versions.
- Add an identity migration `0.2.9.00 -> 0.2.9.01`; the shape is intentionally unchanged.
- Test both direct `0.2.8.25` migration through the chain and previous-stage `0.2.9.00` import.
- Do not create another full fixture for the identity-only version.

## Navigation UX

Keep Views inside the existing Workspace app area. Do not add a new TopBar application tab.

Refactor the left navigator only as needed to present two independent sections:

- Existing location/folder/rack/device hierarchy, unchanged in behavior.
- A flat **Views** section sourced from `project.views`.

Required View navigation behavior:

- The Views section remains visible even when the project has no locations or no Views.
- Its header/context menu provides `Add View`.
- Each View is a selectable tree item showing its name and compact metadata such as `A3 · Portrait`.
- Each View context menu provides `Rename View` and `Delete View`.
- View tree order follows `project.views` array order; do not introduce sorting or reordering.
- Existing navigator device/rack drag payloads and folder drop targets must remain unchanged for later page placement.
- Existing empty-location messaging must not hide or replace the Views section.

Keep tree-model construction pure and extend focused model/branch components rather than making `LeftTree.tsx` a large monolith.

## Selection and shell integration

Extend the existing selection contract with `selectedObjectType: 'view'` and resolve it from `project.views`.

Required behavior:

- Selecting a View opens `ViewWorkspace` in the center and `ViewInspector` on the right.
- If the selected View is deleted or the project is replaced, selection falls back to the project root through the existing stale-selection effect.
- A `ValidationIssue` with object type `view` selects the affected View and switches to Workspace.
- Settings/Cables navigation and the unsaved Inspector guard continue working.
- Introduce a transient `ViewCanvasSelection` shell/UI contract now only if it is a small typed placeholder needed for later Inspector coordination; do not serialize it or show element controls before prompt 03/04.

## Add and rename dialogs

Create a focused View dialog/form rather than expanding `StudioWireShell.tsx` with form state.

Add View fields:

- `View Name`, prefilled with the next available case-insensitive `View N`.
- `Page Size`: `A3` then `A4`, with A3 selected by default.
- `Orientation`: `Portrait` then `Landscape`, with Portrait selected by default.

Behavior:

- Trim the submitted name.
- Display inline required/duplicate-name validation before dispatch.
- Create nothing until explicit submit.
- Close on success and immediately select the new View.
- Rename uses the same naming rules, preserves all other View data, and leaves the View selected.
- Escape/Cancel closes without mutation.

Use the app's existing modal, field, select, footer, and confirmation patterns.

## Delete behavior

Deleting a View never deletes devices, racks, ports, or cables.

Before dispatch, show a confirmation containing:

- View name.
- Placement count.
- Manual line count.
- Annotation count.
- Explicit statement that source project objects are unaffected.

Although these counts are normally zero at this stage, use the real arrays so the UI remains correct after later prompts.

## View Inspector

Add a focused Inspector component for the selected View. Keep the main `Inspector` coordinator small.

Expose:

- View ID as read-only metadata.
- Buffered name and description editing using the established Save/Discard/Cancel navigation guard.
- Page Size and Orientation selects.
- Counts for placements, lines, and annotations.
- Delete action using the same guarded confirmation as the navigator.

Name changes use the View-only namespace. Page changes retain all existing geometry exactly. In this stage, confirmation is only required when the View is non-empty; the full out-of-page prediction/highlighting is completed after placement geometry exists.

## Page workspace shell

Create a dedicated View workspace/controller/presentation split. Reuse or carefully extend `CanvasViewport`; do not regress rack zoom behavior.

Page rules:

- A4 portrait `210 x 297` mm.
- A4 landscape `297 x 210` mm.
- A3 portrait `297 x 420` mm.
- A3 landscape `420 x 297` mm.
- `3 CSS px/mm` at 100% zoom.
- Visible white paper, restrained border/shadow, and surrounding neutral canvas.
- Fixed subtle `2.5 mm` grid clipped to the paper.
- Page header outside the paper identifies View name, page size, and orientation without becoming serialized drawing content.

Viewport controls:

- Zoom out/in.
- Reset to 100% and top-left.
- Fit page.
- Fit width.
- Display current zoom percentage.
- Clamp to a useful range that can fit A3 while still allowing detail inspection; use `0.25..3` for this workspace.

Fit calculations must be pure/testable and account for available viewport padding. ResizeObserver may recompute a fit only when the user explicitly chose a fit mode; manual zoom exits fit mode. Zoom/pan/scroll state is transient and resets when selecting a different View.

Empty page state:

- Show a small non-persisted hint centered on the paper: `Add a device or rack to start this View.`
- Do not render tool buttons, source pickers, placement placeholders, annotations, or routes in this prompt.

## Architecture boundaries

- Keep ISO/page/zoom calculations out of React components.
- Keep View dialog validation in focused form helpers/controller logic.
- Keep `StudioWireShell.tsx`, `LeftTree.tsx`, `Workspace.tsx`, and `Inspector.tsx` as coordinators.
- Do not add a canvas library dependency for the page shell.
- Do not change the persistent View shape introduced in `0.2.9.00`.

## Tests

Add focused tests for:

- Tree model exposes an independent flat Views section alongside locations.
- Views remain reachable in projects with no locations and vice versa.
- View selection resolution and stale-selection fallback.
- Validation issue navigation to a View.
- Add dialog defaults to next unique `View N`, A3 portrait.
- Required/duplicate name validation and successful add/rename.
- Delete confirmation counts and source-object non-mutation.
- Inspector updates preserve content arrays and uses the dirty guard.
- Exact A4/A3 dimensions in both orientations.
- Zoom clamping, reset, fit-page, and fit-width math.
- Selecting a different View resets transient viewport state.
- Existing location tree drag/drop and selection tests remain passing.
- `0.2.9.00` and `0.2.8.25` migration paths import to `0.2.9.01`.

Use component tests for important interactions and pure tests for geometry. Do not add Playwright E2E.

## Documentation

Update README changelog/current support, Product Spec application layout, Data Model current version/compatibility text, and v0.2 Acceptance navigation/manual-check sections. State accurately that `0.2.9.01` supports View CRUD and a page shell but not placements or drawing tools yet.

## Verification

Run the relevant tree/selection/dialog/Inspector/page/migration tests, then:

```text
npm run typecheck
npm run build
npm run clean
npm run clean:check
```

Do not run Git commands, release packaging, Playwright installation/E2E, or later prompts. Finish with a concise summary and stop at `0.2.9.01`.
