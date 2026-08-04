# Codex implementation prompt - StudioWire IO `0.2.9.06`

## Assignment

Finish and harden the first usable StudioWire IO View editor at `0.2.9.06`.

This is a feature-development task. Read `AGENTS.md` and `docs/0.2.9.xx/README.md` completely. The repository must start at completed, passing `0.2.9.05` with the Fix 4 workspace, fixed navigator regions, live placements, transient multi-selection, visual Areas, refined device-attached I/O Ranges, port/range-anchored orthogonal Lines, fixed Line styles, and route-constrained labels.

Retain the completed `.05` endpoint resolver, exact style presets, normalized label geometry, and legacy-Line removal reporting as established contracts; harden those implementations rather than replacing them.

This prompt adds transactional View-canvas undo/redo, accessibility and keyboard completion, populated-format-change handling, stale-state hardening, an illustrative sample View, final documentation, and the normal feature-development gate. Do not expand into deferred editor/export features.

## Target version and final staged compatibility

Bump every synchronized app/schema/version surface to exactly `0.2.9.06`.

The final supported chain must include:

```text
0.2.8.25
0.2.9.00
0.2.9.01
0.2.9.02
0.2.9.03
0.2.9.04
0.2.9.05
0.2.9.06 (current)
```

- Add identity migration `0.2.9.05 -> 0.2.9.06`.
- Preserve the real `0.2.8.25 -> 0.2.9.00` migration and staged identity steps through `.04`.
- Preserve the deliberate `.04 -> .05` shape migration that removes old boundary-anchored View Lines, reports the removed count, and leaves every other record unchanged.
- Prove direct import/restore from `0.2.8.25` and each prior staged version reaches `0.2.9.06`.
- Keep only the realistic `0.2.8.25` shape-changing fixture; unit-test staged transitions without adding a large duplicate fixture matrix.
- Do not alter the persistent View shape in this hardening prompt.

## View-canvas history

Add transient undo/redo scoped to the active View canvas. History is UI state and is never serialized.

```ts
interface ViewCanvasSnapshot {
  placements: ViewPlacement[];
  lines: ViewLine[];
  annotations: ViewAnnotation[];
}
```

Rules:

- Keep at most 50 past snapshots; discard the oldest when exceeding the limit.
- A successful committed canvas transaction pushes the previous snapshot to `past` and clears `future`.
- Ignore failed/no-op transactions.
- Undo pushes the current snapshot to `future` and atomically restores the latest `past` through the existing replace-canvas command.
- Redo pushes current to `past` and restores the latest `future`.
- Preview-only pointer updates never enter history.
- One placement or multi-selection drag/nudge/delete is one entry, regardless of selected-item count.
- One Area/Text resize, waypoint gesture, Line-label drag, or property commit is one entry.
- Placement creation/removal/move/scale/label changes; Line creation/removal/style/label/orientation/position/waypoint changes; Text/Area creation/removal/content/geometry changes; and I/O Range creation/removal/label changes participate.
- Confirmed I/O Range removal plus attached-Line cleanup is one atomic entry.
- View creation/deletion/rename, description, page size/orientation, source-object edits, migration/import, and project lifecycle commands are excluded.
- Store selection outside snapshots. After restore, prune selected IDs that no longer exist and preserve the remaining ordered selection/primary item when possible.
- Reset both stacks when the active View changes, project is imported/replaced/new/sample-loaded, the active View is deleted, or an external operation changes its canvas arrays, including source deletion cleanup.
- Source edits that only change live rendering and do not change the three canvas arrays must not reset history.
- Track pending local snapshot signatures/references so the controller distinguishes its own reducer result from external replacement without adding persistent revision fields.

Keyboard and controls:

- Ctrl/Cmd+Z: undo.
- Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y: redo.
- Do not intercept shortcuts in input, textarea, select, or contenteditable fields.
- Add compact toolbar Undo/Redo buttons with disabled states and accessible names without wrapping the 50px header.
- Report undo/redo through the normal status region; do not add a persistent history log.

Add pure history transition helpers and focused hook/controller tests. Do not put stack logic into ViewWorkspace JSX.

## Keyboard and accessibility completion

Audit the complete View workflow for keyboard, focus, screen-reader naming, and pointer cancellation.

Required behavior:

- Every toolbar/Inspector control has a visible tooltip/title and accessible name; active tools use `aria-pressed`.
- The page is focusable and identifies View name, size, orientation, and concise editor instructions.
- Visually hidden instructions cover Select, modifier/marquee selection, port/range Line anchors, Escape, Delete, arrow nudge, undo, and redo.
- Tool activation moves focus appropriately without stealing focus during Inspector typing.
- In Line mode, the existing device row-end squares and range midpoint squares are real focusable buttons. Tab reaches only eligible anchors; Enter/Space starts or completes a Line.
- Covered port rows, terminal blocks, racks, padding rows, and missing sources never enter the Line-anchor tab order.
- Activating Text with the keyboard and pressing Enter on focused paper creates default text at the snapped/clamped visible-paper center.
- Activating Area with the keyboard and pressing Enter creates the default `60 x 40 mm` Area at that center.
- Multi-selection modifier clicks have keyboard equivalents through standard Ctrl/Cmd activation. Moving focus alone must not silently change membership.
- Pointer-only resize/waypoint/label-position handles have keyboard alternatives through Inspector numeric/route controls where applicable.
- The selected Line-label rotate control is keyboard focusable and announces the resulting direction.
- Selection, multi-selection primary state, marquee, connector focus, range focus, and bend/resize states remain visible at all supported zooms.
- Arrow/Shift+Arrow nudge acts only when the page/element has focus, moves the whole movable selection, respects collective bounds rules, and prevents page scrolling.
- Delete/Backspace never removes an element while typing in a form control.
- Escape precedence is: cancel pointer/marquee/label/route preview, cancel the first Line endpoint, return tool to Select, then clear canvas selection.
- Release pointer capture/shared drag state on pointer up, pointer cancel, lost capture, Escape, View change, project replacement, and unmount.
- Duplicate drops, invalid Line destinations, range overlaps/removal counts, missing endpoints, and migration notices use a concise `aria-live` status region.

## Populated page-format changes

Complete View format-change behavior using the same pure geometry used for rendering and validation.

On requested page-size/orientation change:

1. Calculate placement bounds, Text/Area extents, I/O Range extents, resolved Line routes/manual waypoints, and configured Line-label bounds against the target page without mutation.
2. If content is empty or everything fits, apply directly.
3. If anything would be outside, confirm with target format and counts by placement, Line, and annotation.
4. Choices are Cancel or **Keep layout**.
5. Cancel changes nothing.
6. Keep layout changes only page size/orientation and preserves every millimetre coordinate, scale, waypoint, and normalized Line-label position.

Do not scale, reflow, clamp, or delete content automatically. Page-format changes are excluded from canvas history.

## Stale-state and edge-case hardening

Cover these cases explicitly:

- Deleting the selected View returns selection to project root and clears tools, marquee, pointer state, and history.
- Removing selected placements prunes the complete multi-selection and attached Lines/I/O Ranges safely.
- Confirmed range removal clears an attached selected Line and remains one transaction.
- Source deletion cleanup clears stale nested selection and resets history only for affected active Views.
- Import/new/load sample cannot retain selection, pointer draft, modal, fit mode, or history from the previous project.
- Missing source placeholders remain movable/removable but never expose Line anchors.
- Lines with a missing placement, port, range annotation, or invalid range endpoint produce validation and render a selectable removable warning without crashing route/Inspector resolution.
- A source rename/I/O reorder/content change updates live drawing while retaining selection/history when IDs and canvas arrays remain valid.
- A removed endpoint port may make a Line dangling but cannot mutate engineering data or invent a replacement anchor.
- Source content growth may introduce out-of-page warnings without changing placement geometry.
- Empty/collinear/duplicate waypoint data normalizes for rendering without rewriting JSON until an edit is committed.
- Manual waypoints remain absolute when endpoints move; Reset Route is the only automatic clear.
- Normalized Line-label position remains finite through route, endpoint, orientation, and format changes.
- Format changes and zoom-fit recomputation do not create canvas history entries.
- Switching rapidly between Views cannot commit a late pointer-up, marquee, multi-drag, waypoint, or label edit to the wrong View. Capture initiating View ID and discard stale completion.
- Autosave receives committed reducer state only, never previews, selection, marquee, or history stacks.

Memoize pure device presentation, endpoint resolution, range geometry, and routes by relevant source/View data. Do not add arbitrary object-count limits or a new performance framework.

## Illustrative current sample

Replace `views: []` in the current sample with one realistic, structurally valid A3 portrait View using existing sample IDs.

- View:
  - ID `view-signal-overview`.
  - Name `Signal Overview`.
  - Description `Sample project View with live equipment references and a manual cable-group annotation.`
- Router placement:
  - ID `view-placement-router-1`.
  - Standard device source `device-router-1`.
  - `xMm: 25`, `yMm: 80`, `scale: 0.8`, no label override.
- Multiviewer placement:
  - ID `view-placement-multiviewer-1`.
  - Standard device source `device-multiviewer-1`.
  - `xMm: 165`, `yMm: 80`, `scale: 0.8`, no label override.
- One automatic styled Line:
  - ID `view-line-router-to-multiviewer`.
  - `from`: `{ kind: 'port', placementId: 'view-placement-router-1', portId: 'port-group-router-outputs-port-0001' }`.
  - `to`: `{ kind: 'port', placementId: 'view-placement-multiviewer-1', portId: 'port-group-multiviewer-inputs-port-0001' }`.
  - Label `4x SDI`.
  - Empty waypoints.
  - `color: 'blue'`, `width: 'medium'`, `labelOrientation: 'horizontal'`, `labelPosition: 0.5`.
- One persisted group/Area annotation:
  - ID `view-group-core-signal-path`.
  - `xMm: 15`, `yMm: 55`, `widthMm: 265`, `heightMm: 155`.
  - Label `Core Signal Path`.
- One Text annotation:
  - ID `view-text-signal-overview`.
  - `xMm: 20`, `yMm: 20`, `widthMm: 120`, text `Sample Signal Overview`, size `large`.

Ensure Area/background layering does not block placements, anchors, or the Line. The sample must pass structural and relational validation with no View errors and round-trip exactly.

## Final tests

Add focused tests for:

- History push/limit/no-op behavior and redo invalidation.
- Undo/redo atomic canvas replacement and one entry per single/multi pointer gesture or property commit.
- History reset/preservation for View/project replacement, external cleanup, live source-only edits, and range-Line cascade.
- Multi-selection restoration/pruning and wrong-View late-commit protection.
- Keyboard shortcuts, form-focus exclusions, port/range anchor navigation, Area/Text creation, nudge/delete, and rotate control.
- Escape/pointer-cancel precedence and shared drag cleanup.
- Target-format prediction, Cancel, and Keep layout with exact geometry/style/label-position preservation.
- Missing source/placement/port/range warning resilience and removability.
- Sample structural/relational validation and export/import equality.
- Full migration chain, including exact `.04 -> .05` Line removal and `.05 -> .06` identity behavior.
- View actions remain isolated from core engineering data.
- I/O Range history, stale references, device movement, and View-wide 70/80/90/100% scaling keep brace/label/range-anchor geometry attached.
- Existing navigator, device/TB/rack workspaces, cable operations, autosave, import/export, validation, and samples remain passing.

Do not add a broad Playwright suite. Component/controller tests protect behavior; manual review protects visual polish.

## Manual visual QA

Run the app locally and inspect, without committing screenshots:

- Empty/populated A4/A3 portrait/landscape at fit page, fit width, 25%, 100%, and high-detail zoom.
- Zero/three/four-plus Views and short-height navigator behavior.
- Standard device, TB, 48RU rack, and missing source; confirm only standard-device/range anchors activate.
- Modifier/marquee multi-selection and collective movement with Text/Areas/placements.
- Automatic/manual/parallel Lines, every color/width, black labels, both orientations, label dragging, and missing endpoints.
- Covered rows and range midpoint connectors at all four device scales.
- Source rename/I/O reorder/content changes updating live.
- Format change producing out-of-page content.
- Keyboard-only selection, Line, Text, Area, nudge, delete, undo, and redo.
- Narrow viewport without header wrap or Inspector overlap.

Fix clipping, unreadable text, misplaced connectors, incorrect hit targets, toolbar collisions, broken focus, or selection ambiguity before finishing.

## Documentation

Update all maintained current-version and behavior docs:

- README support/exclusions and `0.2.9.06` changelog.
- Product Spec for final View UX and source-of-truth boundary.
- Data Model for current Line fields, port/range presentation anchors, Area storage terminology, and transient selection/history.
- Validation Rules for final endpoint/style/label/bounds codes.
- Roadmap distinguishing in-app Views from future drawing documents.
- v0.2 Acceptance with automated/manual View gates.
- Keep the earlier Sheet concept marked superseded by this guide.

Do not claim PDF/SVG/Visio/print/title-block support.

## Verification

Run focused tests while iterating, then the normal complete feature-development gate:

```text
npm run check:dev
npm run clean
npm run clean:check
```

`check:dev` already includes typecheck, unit/contract tests, collection validation, build, sample validation, cleanup, and cleanliness checking. Do not run Git commands, `npm run check`, release gates, Playwright installation/E2E, source packaging, or `check:full`.

Finish with a concise implementation summary, exact verification results, compatibility/migration status, manual QA performed, and confirmation that generated artifacts were cleaned. Stop at `0.2.9.06`.

## Explicit deferrals

Do not add logical Area membership, align/distribute, z-order, rack/TB/generic Line anchors, free color picking, continuous stroke widths, arrowheads, structured cable-group counts, automatic engineering lines/layout, View duplication, print/export/title blocks, authentication, backend, database, or collaboration.
