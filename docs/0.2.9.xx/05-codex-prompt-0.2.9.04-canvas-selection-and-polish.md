# Codex implementation prompt - StudioWire IO `0.2.9.04`

## Assignment

Implement the first View-editor follow-up stage at `0.2.9.04`: correct the navigator proportions, add transient multi-selection and collective movement, rename the visual-only Group tool to Area, and refine I/O Range presentation.

This is a feature-development task. Read `AGENTS.md` and `docs/0.2.9.xx/README.md` completely before editing. The repository must start at completed, passing `0.2.9.03` with the Fix 4 workspace, navigator-only placement drag/drop, move-only placements, line/text/Group/I/O Range tools, and the simplified Inspectors.

Visual thesis: preserve the quiet technical-drawing surface. Use precise selection outlines and the existing drawing geometry; do not introduce oversized handles, extra panels, decorative cards, or persistent selection chrome.

## Target version and compatibility

- Bump every synchronized app/schema/version surface to exactly `0.2.9.04`.
- Add identity migration `0.2.9.03 -> 0.2.9.04`.
- Preserve import support from `0.2.8.25`, `0.2.9.00`, `0.2.9.01`, `0.2.9.02`, and `0.2.9.03`.
- Do not change the persistent project or View shape in this prompt.
- Multi-selection, marquee state, collective previews, and selection bounds are transient UI state and must never enter project JSON or autosave.

## Navigator layout correction

Correct the left navigator without changing its data hierarchy or item actions.

- The Project navigator label and its first location/empty-state content begin at the top of the available navigator region. Remove any flex alignment that vertically centers the project tree.
- The project tree owns the flexible remaining height, uses `min-height: 0`, and scrolls internally when its content exceeds that region.
- Keep Views anchored immediately above the fixed version footer.
- Give the Views region a fixed height sufficient for its heading and exactly three `42 px` View rows. The heading stays visible; only the View-item list scrolls when a fourth item exists.
- A project with zero, one, or two Views retains the same fixed Views-region height instead of moving the project tree downward.
- Preserve Add/Rename/Delete behavior, active selection, context menus, drag payloads, the centered Add View affordance, and the fixed app/schema footer.
- Avoid nested page-level scrolling: the project tree and View list are the only independently scrollable navigator regions.

## User-facing Area terminology

The existing persisted annotation remains:

```ts
interface ViewGroupAnnotation {
  id: string;
  kind: 'group';
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  label: string;
}
```

Change only the user-facing term:

- Toolbar: **Area**.
- Inspector: **Area Inspector** and **Area Label**.
- Creation defaults and notices use Area.
- Maintained current documentation describes an Area and notes that `kind: 'group'` is the compatibility storage name.
- An Area is a labeled visual background. It has no members, ownership, containment, automatic inclusion, or Visio-style logical grouping.
- Moving an Area alone never moves objects that happen to be inside its rectangle.
- Inspector help says: `Visual background only. Multi-select items to move them together temporarily.`

Do not rename the schema variant, TypeScript storage type, IDs, or existing serialized records in this prompt.

## Multi-selection contract

Replace the single-item-only canvas selection coordination with a focused transient selection model that supports a primary item plus an ordered unique set of selected items.

Movable multi-select items are:

- Every View placement: standard device, terminal block, rack, and missing-source placeholder.
- Text annotations.
- Area annotations (`kind: 'group'`).

Lines and I/O Ranges remain single-select Inspector elements. They do not join a movable multi-selection:

- An I/O Range moves because its owning device placement moves.
- Automatic line endpoints follow moved placements.
- Manual line waypoints remain absolute, preserving the existing contract.
- Clicking a Line or I/O Range replaces the current selection with that one element.

Selection interactions:

- Plain click on a movable element selects only it.
- Ctrl-click on Windows/Linux or Cmd-click on macOS toggles one movable item without disturbing the others.
- Clicking an already-selected item without a modifier preserves the multi-selection so the operator can drag it.
- Clicking empty paper without a modifier clears selection and returns the Inspector to View properties.
- Starting a Select-tool drag on empty paper draws a restrained marquee rectangle.
- Plain marquee replaces the current movable selection.
- Shift-marquee adds fully enclosed movable items to the current selection.
- An element qualifies only when its complete current rendered bounds are inside the normalized marquee. Do not use intersection selection; a large background Area must not be selected by every marquee drawn within it.
- Marquee hit testing uses the same pure bounds helpers as drawing and validation, including current placement scale and live source size.
- Escape cancels a marquee or collective-drag preview without committing and retains the selection that existed before the gesture.

Keep element references discriminated by kind and ID. Normalize duplicates and prune stale IDs whenever View/project content changes. Keep selection ordering deterministic so one primary item can drive focus, Inspector identity, and grid snapping.

## Collective movement and deletion

Add pure helpers and one focused gesture controller for multi-element translation. Do not dispatch one reducer action per selected item.

- Beginning a drag on any selected movable element captures immutable starting geometry for the whole selection.
- Calculate one millimetre delta from the primary item. Without Alt, snap the primary item's target position to the Fix 4 equal-axis, I/O-row-derived virtual grid, then apply that exact delta to every selected record.
- Alt temporarily bypasses pointer snapping but does not change membership.
- Never snap each member independently; relative offsets must remain byte-exact apart from the shared delta.
- Arrow keys move the entire focused selection by one virtual-grid step. Shift+Arrow moves it by five steps.
- If the collective bounds begin fully inside the page, constrain the shared delta so the complete selection remains inside. If any selected record already begins outside, do not force a reflow or scale; allow collective repair movement and retain existing out-of-page warnings.
- Text and Area dimensions never change during collective movement.
- Commit one atomic canvas mutation on pointer release or one keyboard command. Pointer movement updates local previews only.
- Delete and the multi-selection Inspector's **Remove Selected** action remove all selected movable items in one domain operation. Placement removal must reuse existing cleanup so attached Lines and I/O Ranges are removed; unrelated annotations remain.
- Clear the selection after collective removal. Failed/no-op operations leave project state and selection unchanged.
- Prove collective move/removal does not change devices, ports, cables, endpoints, numbering ledgers, rack assignments, locations, or folders.

Render one selection outline per selected item and a slightly stronger outline on the primary item. Do not add a large union bounding box or resize handles.

## Multi-selection Inspector

When two or more movable items are selected, use the existing right Inspector region for a **Selection Inspector**.

- Show total count and counts for placements, Text, and Areas.
- State that movement is temporary canvas selection, not persistent grouping.
- Provide **Remove Selected** in the standard destructive action area.
- Do not show misleading shared X/Y fields or attempt mixed-property editing.
- When the selection returns to one item, show its normal Placement/Text/Area Inspector.

## I/O Range visual refinement

Keep the existing `port_range` model and row-resolution behavior unchanged. Refine only its rendering and hit target:

- Use an approximately `14 px` total unscaled overlay width instead of `25 px`.
- Draw a `1 px` black vertical brace with short `4 px` inward end caps.
- Use the established green accent for the vertical label, approximately `7 px`, bold but restrained, with about `1 px` between text and brace.
- Keep bottom-to-top vertical reading and mirror left/right placement correctly.
- Explicitly remove inherited rounded/pill button appearance. Normal rendering is transparent; hover/focus/selection may use a subtle technical highlight that does not widen the brace.
- Preserve the current missing-range warning, selection behavior, double-click label focus, out-of-page highlighting, and pointer hit accessibility.
- Because the overlay remains inside the complete device transform, brace, label, spacing, and row alignment must scale together at 70%, 80%, 90%, and 100%.

Do not add an I/O Range line connector in this prompt; that belongs to `0.2.9.05`.

## Architecture boundaries

- Keep selection normalization, marquee geometry, collective bounds, shared translation, and removal cleanup as pure modules outside React.
- Keep the View workspace as a coordinator; use focused hooks for selection and pointer gestures.
- Extend the dedicated View action family with one atomic multi-element canvas mutation rather than expanding the root reducer.
- Reuse current placement/annotation bounds, grid, page, and source-cleanup helpers.
- Do not introduce persistent group membership, another properties sidebar, a generic diagramming framework, or per-frame pointer dispatches.

## Tests

Add focused tests for:

- Project-tree top alignment, independent scrolling, fixed three-row Views region, and fourth-View list overflow.
- Plain, modifier, and Shift-marquee selection behavior.
- Full-containment marquee geometry, including an Area that surrounds the marquee but is not selected.
- Selection normalization, primary item stability, stale-ID pruning, and line/range single-selection replacement.
- One shared snapped delta, Alt bypass, collective arrow/Shift-arrow nudge, relative-position preservation, and page-bound handling.
- One reducer/context transaction per collective move/delete and no pointer-move dispatch noise.
- Placement cleanup during multi-delete and preservation of unrelated annotations.
- Placement-attached I/O Ranges and automatic line endpoints following a collective placement move.
- Area terminology in toolbar/Inspector while serialized `kind: 'group'` remains exact.
- I/O Range brace/label alignment and proportional presentation at 70/80/90/100%.
- Byte-equivalent engineering data before and after every new selection operation.
- `0.2.9.03 -> 0.2.9.04` import and exact View round-trip.

Do not add a broad Playwright suite for these interactions. Use focused domain/controller/component tests and manual visual review.

## Documentation and verification

Update README, Product Spec, Data Model, Validation Rules if affected, Roadmap, v0.2 Acceptance, the shared `0.2.9.x` guide, and the later prompts. Do not claim logical grouping.

Manually inspect:

- Empty, one-, three-, and four-plus-View navigators at normal and short viewport heights.
- Marquee and modifier selection with devices, TBs, racks, Text, and nested visual Areas.
- Collective drag/nudge at multiple zooms and with Alt.
- I/O Ranges on both sides at all four device sizes and high-detail zoom.

Run focused tests while iterating, followed by:

```text
npm run test:run
npm run typecheck
npm run version:check
npm run build
npm run clean
npm run clean:check
```

Do not run Git operations, release packaging, browser installation, a new Playwright suite, or release-only gates. Finish at `0.2.9.04` with generated artifacts removed.

## Explicit deferrals

Do not implement logical Area membership, align/distribute, z-order tools, port-anchored lines, Line style controls, undo/redo, View duplication, print/export, authentication, backend, or database work in this prompt.
