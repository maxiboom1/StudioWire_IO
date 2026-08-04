# Codex implementation prompt - StudioWire IO `0.2.9.04`

## Assignment

Finish and harden the first usable StudioWire IO View editor at `0.2.9.04`.

This is a feature-development task. Read `AGENTS.md` and `docs/0.2.9.xx/README.md` completely. The repository must start at completed, passing `0.2.9.03` with View CRUD, live placements, manual lines, text, and grouping rectangles.

This prompt adds transactional View-canvas undo/redo, accessibility and keyboard completion, populated-format-change handling, stale-state hardening, an illustrative sample View, final documentation, and the normal feature-development gate. Do not expand into deferred editor/export features.

## Target version and final staged compatibility

Bump every synchronized app/schema/version surface to exactly `0.2.9.04`.

The final supported internal chain must include:

```text
0.2.8.25
0.2.9.00
0.2.9.01
0.2.9.02
0.2.9.03
0.2.9.04 (current)
```

- Add identity migration `0.2.9.03 -> 0.2.9.04`.
- Preserve the real `0.2.8.25 -> 0.2.9.00` migration and every staged identity step.
- Prove direct import/restore from `0.2.8.25` and each prior staged version reaches `0.2.9.04`.
- Keep only the realistic `0.2.8.25` shape-changing fixture; unit-test identity stages without adding a large duplicate fixture set.
- Do not alter the persistent View shape.

## View-canvas history

Add transient undo/redo scoped to the active View canvas. History is UI state, never serialized.

Define a canvas snapshot containing only:

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
- Undo pushes the current snapshot to `future` and atomically restores the latest `past` snapshot through the existing replace-canvas command.
- Redo pushes current to `past` and restores the latest `future` snapshot.
- One drag, scale, annotation resize, or waypoint gesture is one history entry because preview updates remain local until pointer release.
- Placement creation/removal/move/scale/label changes, line creation/removal/label/waypoint changes, and text/group creation/removal/content/geometry changes participate.
- View creation/deletion/rename, description, page size/orientation, source-object edits, and project lifecycle commands are excluded.
- Clear selection when restored content no longer contains the selected element.
- Reset both stacks when the active View changes, project is imported/replaced/new/sample-loaded, the active View is deleted, or an external operation changes the active View's canvas arrays (for example source deletion cleanup).
- Source edits that only change live rendering and do not change the three canvas arrays must not reset history.
- Track pending local snapshot signatures/references so the controller distinguishes its own reducer result from an external canvas replacement without adding persistent revision fields.

Keyboard and controls:

- Ctrl/Cmd+Z: undo.
- Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y: redo.
- Do not intercept browser/editor shortcuts while focus is in an input, textarea, select, or contenteditable field.
- Add toolbar Undo/Redo buttons with disabled states and accessible names.
- Report undo/redo actions through the normal status region without adding a persistent history log.

Add pure history transition helpers and focused hook/controller tests. Do not put all stack logic into ViewWorkspace JSX.

## Keyboard and accessibility completion

Audit the complete View workflow for keyboard, focus, screen-reader naming, and pointer cancellation.

Required behavior:

- Every toolbar control has a visible tooltip/title and accessible name; active tools use `aria-pressed`.
- The page is focusable and identifies View name, size, orientation, and editor instructions.
- A concise visually hidden instruction explains Select, anchor-based Line creation, Escape, Delete, arrow nudge, and undo/redo.
- Tool activation moves focus appropriately without stealing focus during Inspector typing.
- Line anchor handles are actual focusable buttons while Line is active. Tab navigates them and Enter/Space starts/finishes a line, including validation that endpoints use different placements.
- Activating Text with the keyboard and pressing Enter on focused paper creates the default text at the center of the visible paper area, snapped/clamped.
- Activating Group with the keyboard and pressing Enter creates the default `60 x 40 mm` group at the center of the visible paper area.
- Pointer-only resize/waypoint handles have accessible keyboard alternatives through Inspector numeric fields and route controls.
- Selection and focus states remain visible at all supported zoom levels.
- Arrow/Shift+Arrow nudge works only when the page/element has focus, respects page bounds for normal records, and does not scroll the page during a handled nudge.
- Delete/Backspace never removes a canvas element while typing in a form control.
- Escape precedence is: cancel active pointer/draft, cancel line endpoint, return tool to Select, then clear element selection.
- Pointer capture/shared drag state is released on pointer up, pointer cancel, lost capture, Escape, View change, project replacement, and unmount.
- Status/validation feedback for duplicate drops, invalid line destinations, overlaps, and missing sources is concise and announced through an existing or focused `aria-live` region.

## Populated page-format changes

Complete View format-change behavior in the Inspector using the same pure page/geometry helpers used for rendering and validation.

On requested page-size/orientation change:

1. Calculate all placement bounds, text/group extents, line anchor routes, and manual waypoints against the target page without mutating state.
2. If content is empty or everything fits, apply directly.
3. If any item would be outside, show a confirmation containing target format and counts by placement, line, and annotation.
4. Choices are Cancel or `Keep layout`.
5. Cancel leaves page metadata and geometry unchanged.
6. Keep layout changes only size/orientation, preserves every millimetre coordinate/scale/waypoint, and allows validation/highlighting to guide repair.

Do not scale, reflow, clamp, or delete content automatically. Page-format changes are excluded from canvas undo history.

## Stale-state and edge-case hardening

Cover these cases explicitly:

- Deleting the selected View returns selection to project root and clears canvas tool/history state.
- Removing a selected placement clears it and any attached selected line safely.
- Source deletion cleanup clears stale nested selection and resets history for affected active Views.
- Import/new/load sample cannot leave a selection, pointer draft, modal, fit mode, or history referring to the previous project.
- A missing source placeholder remains removable and never crashes bounds/anchor/Inspector resolution.
- Lines with missing endpoint placements produce validation but are skipped safely by rendering.
- A source rename/I/O change/rack-content change updates live drawing while retaining placement selection and history when IDs/canvas arrays still exist.
- Source content growth may produce out-of-page warnings but never mutates placement geometry.
- Empty/collinear/duplicate waypoint data is normalized for rendering without silently rewriting imported JSON until the user commits an edit.
- Manual waypoints remain absolute when endpoints move; Reset route is the only automatic clear.
- Format changes and zoom-fit recomputation do not create canvas history entries.
- Switching rapidly between Views cannot commit a late pointer-up edit to the wrong View; capture the initiating View ID and discard if no longer active.
- Autosave receives only committed reducer state, never transient pointer drafts or history stacks.

Memoize pure presentation models/routes by relevant source/View data to keep normal multi-block Views responsive, but do not add arbitrary placement/line-count limits or a new performance framework.

## Illustrative current sample

Replace `views: []` in the current sample with one realistic, structurally valid View using existing sample IDs. Use deterministic stable IDs and this content:

- View ID: `view-signal-overview`.
- Name: `Signal Overview`.
- Description: `Sample project View with live equipment references and a manual cable-group annotation.`
- A3 portrait.
- Rack placement:
  - ID `view-placement-rack-mcr-a`.
  - Source `rack-mcr-a`.
  - `xMm: 25`, `yMm: 55`, `scale: 0.8`, no label override.
- Device placement:
  - ID `view-placement-multiviewer-1`.
  - Source `device-multiviewer-1`.
  - `xMm: 165`, `yMm: 80`, `scale: 0.8`, no label override.
- One automatic line:
  - ID `view-line-rack-to-multiviewer`.
  - Rack right offset `0.5` to multiviewer left offset `0.5`.
  - Label `4x SDI`.
  - Empty waypoints.
- One group annotation:
  - ID `view-group-core-signal-path`.
  - `xMm: 15`, `yMm: 35`, `widthMm: 265`, `heightMm: 210`.
  - Label `Core Signal Path`.
- One text annotation:
  - ID `view-text-signal-overview`.
  - `xMm: 20`, `yMm: 15`, `widthMm: 120`, text `Sample Signal Overview`, size `large`.

Ensure group/background layering does not block the placements/line. The sample View must pass structural and relational validation with no View errors.

## Final tests

Add focused tests for:

- History push/limit/no-op behavior.
- Undo/redo transitions, redo invalidation, and atomic canvas replacement.
- One history entry per pointer gesture and property commit.
- History reset/preservation rules for View changes, project replacement, external cleanup, and live source-only edits.
- Keyboard shortcuts and form-focus exclusions.
- Keyboard line/text/group creation and accessible control names/states.
- Escape/Delete/nudge/pointer-cancel precedence.
- Target-format prediction, direct change, cancel, and Keep layout with exact geometry preservation.
- Stale selection and wrong-View late-commit protection.
- Missing source/endpoint and source-growth resilience.
- Sample View structural/relational validation and export/import equality.
- Full migration chain from every declared supported staged version.
- View canvas actions remain isolated from core engineering data.
- Existing navigator, device/TB/rack workspaces, cable operations, autosave, import/export, validation, and current sample tests remain passing.

Do not add a broad Playwright suite. Component and controller tests should protect interactions; manual review protects visual polish.

## Manual visual QA

Run the app locally and inspect, without committing screenshots:

- Empty and populated A4/A3 portrait and landscape pages.
- Fit page, fit width, 25%, 100%, and a high-detail zoom.
- Standard device, terminal block, 48RU rack, and missing-source placeholder.
- Automatic and manually bent lines, parallel labeled lines, text, and groups.
- Selection/focus/anchor/resize/bend handles at multiple zoom levels.
- Source rename and I/O/rack-content changes updating live.
- Format change that makes content out of bounds.
- Keyboard-only add, line, text, group, nudge, delete, undo, and redo.
- Narrow viewport behavior without toolbar/Inspector overlap.

Fix visible clipping, unreadable text at reasonable zoom, toolbar collision, incorrect hit targets, or broken focus before finishing.

## Documentation

Update all maintained current-version and behavior docs:

- README current support, exclusions, and `0.2.9.04` changelog.
- `docs/PRODUCT_SPEC.md` for complete View UX and source-of-truth boundary.
- `docs/DATA_MODEL.md` for final persistence/history distinction and compatibility chain.
- `docs/VALIDATION_RULES.md` for final View codes/bounds behavior.
- `docs/ROADMAP.md` distinguishing in-app Views from future exported drawing documents.
- `docs/V0_2_ACCEPTANCE.md` with automated and manual View acceptance.
- Keep `docs/ideas/multi-device-sheet-concept.md` marked as superseded by this implementation guide.

Do not claim PDF/SVG/Visio/print/title-block support.

## Verification

Run focused tests while iterating, then the normal complete feature-development gate:

```text
npm run check:dev
npm run clean
npm run clean:check
```

`check:dev` already includes typecheck, unit/contract tests, bundled collection validation, build, sample validation, and cleanup. Do not run Git commands, `npm run check`, release gates, Playwright installation/E2E, source packaging, or `check:full`.

Finish with a concise implementation summary, exact verification commands/results, compatibility status, manual QA performed, and confirmation that generated artifacts were cleaned. Stop at `0.2.9.04`.
