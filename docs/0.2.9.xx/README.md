# StudioWire IO v0.2.9.x View Editor Implementation Guide

## Purpose

This folder is the implementation sequence for the first StudioWire IO multi-object View editor. Apply the five prompts in numeric order. Each prompt is self-contained, names its starting and target version, and must leave the repository buildable and clean before the next prompt starts.

Creating this prompt folder does not change the application version. The first product implementation starts at `0.2.9.00` from the current `0.2.8.25` repository.

Implementation status: prompts 01 (`0.2.9.00` model and compatibility foundation) and 02 (`0.2.9.01` navigation and page workspace) are complete. Prompts 03 through 05 remain intentionally unimplemented and must still be applied in order.

The feature is a local, frontend-only presentation layer over project data:

- A View is a named A4 or A3 page stored in the project JSON.
- A View contains live references to existing devices, terminal blocks, and racks.
- Device/rack data remains the source of truth. A View never owns or copies those records.
- View placements, labels, drawing lines, text, and grouping rectangles belong only to their View.
- A View line is a manual drawing annotation. It is not a `Cable`, does not reference ports, and must never change connectivity or cable numbering.
- PDF, SVG, Visio, print, and title-block output remain deferred document-generation work.

## Research Decisions

The starting concept is `docs/ideas/multi-device-sheet-concept.md`. It correctly established that a multi-device drawing should be a curated collection of live source objects rather than another source-of-truth topology. This sequence makes the following final decisions:

- The user-facing and code-facing entity is **View**, with the TypeScript name `ProjectView`; do not introduce a `Sheet` entity.
- The earlier live per-port line-visibility/path proposal is not part of v0.2.9.x.
- Detailed device blocks still show live cable numbers and destination stubs, but lines drawn between blocks are intentionally manual and view-only.
- Manual lines may represent an operator-described cable group such as `12x SDI`, but that meaning exists only in the free-text label.

The reviewed drawing references under `docs/ideas/Drawing references/RGE 2024 BOOK` establish the desired visual language:

- Most book pages are A3 portrait; make A3 portrait the default while supporting A4/A3 in either orientation.
- Drawings use compact technical blocks, dense port rows, strong functional headings, generous whitespace, and clear page boundaries.
- Destination stubs are more common than fully routed signal lines.
- Where lines are useful, they are deliberate, sparse, and orthogonal.
- Rack elevations are meaningful read-only drawing objects, not simple text cards.
- Functional grouping rectangles are visual aids rather than data containers.

Representative sources reviewed:

- `BOOK  CONTROL/RGE Control-CONTROL MCR+PLAY.pdf`
- `BOOK  CONTROL/RGE Control-CONTROL ST-MTX.pdf`
- `BOOK  EVERTZ/EVERTZ-1 (001-144).pdf`
- `BOOK  EVERTZ/EVERTZ-7 Fiber+MV.pdf`
- `BOOK  Peripheral/RGE Peripheral-1 VTR+FS.pdf`
- `BOOK  Peripheral/RGE Peripheral-5 INTRCOM DANTE.pdf`
- `BOOK TX/TX-PATCH.pdf`
- `RACK 2025-RACK ST+A.pdf`
- `RGE ETH all.pdf`

## Persistent Contract

Add this presentation model as a top-level sibling of `locations`, `racks`, and `devices`. Keep every field required in the current JSON Schema; use explicit empty strings, empty arrays, and `null` instead of optional serialized properties.

```ts
interface ProjectRoot {
  views: ProjectView[];
}

interface ProjectView {
  id: string;
  name: string;
  description: string;
  pageSize: 'a4' | 'a3';
  orientation: 'portrait' | 'landscape';
  placements: ViewPlacement[];
  lines: ViewLine[];
  annotations: ViewAnnotation[];
}

interface ViewPlacement {
  id: string;
  sourceType: 'device' | 'rack';
  sourceId: string;
  xMm: number;
  yMm: number;
  scale: number;
  labelOverride: string | null;
}

interface ViewLine {
  id: string;
  from: ViewLineEndpoint;
  to: ViewLineEndpoint;
  label: string;
  waypoints: ViewPoint[];
}

interface ViewLineEndpoint {
  placementId: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  offset: number;
}

interface ViewPoint {
  xMm: number;
  yMm: number;
}

type ViewAnnotation =
  | {
      id: string;
      kind: 'text';
      xMm: number;
      yMm: number;
      widthMm: number;
      text: string;
      size: 'small' | 'medium' | 'large';
    }
  | {
      id: string;
      kind: 'group';
      xMm: number;
      yMm: number;
      widthMm: number;
      heightMm: number;
      label: string;
    };
```

Use exported value lists and derived union types for page sizes, orientations, source types, anchor sides, annotation kinds, and text sizes, following the existing domain-type pattern.

## Domain Rules

### Names and identity

- View names are required, trimmed for storage, and case-insensitively unique among Views.
- View names use their own namespace. They do not conflict with locations, folders, racks, devices, or terminal blocks.
- View, placement, line, and annotation IDs participate in the existing project-wide duplicate-ID validation.
- One exact `{ sourceType, sourceId }` pair may appear only once in a View.
- A rack and a device mounted in that rack may both appear because their source types/IDs differ.

### Pages and coordinates

- Coordinates and geometry are stored in millimetres.
- ISO dimensions are:
  - A4 portrait: `210 x 297` mm.
  - A4 landscape: `297 x 210` mm.
  - A3 portrait: `297 x 420` mm.
  - A3 landscape: `420 x 297` mm.
- Screen rendering uses `3 CSS px` per millimetre at 100% zoom. Zoom is a viewport concern and is never persisted.
- The base drawing grid is `2.5 mm`. Starting with the `0.2.9.02-fix-4` maintenance pass, placement interactions use an invisible alignment grid with the same scaled I/O-row pitch on both axes; holding Alt still bypasses pointer snapping.
- Default page format is A3 portrait.
- Placement scale is uniform, defaults to `1`, and is structurally constrained to `0.25..3`.
- The editor normally keeps content within the page. Format changes retain stored geometry; content that no longer fits is highlighted and reported as a warning.

### Deterministic drawing geometry

Use pure helpers for page dimensions, snapping, placement bounds, anchor points, overlap checks, and orthogonal paths. Rendering and validation must share these calculations.

Natural dimensions at scale `1`:

- Standard device/TB block width: `92 mm`.
- Device/TB header height: `10 mm`.
- Device/TB row height: `2.4 mm`; height is `10 + max(rowCount, 1) * 2.4` mm.
- Rack block width: `58 mm`.
- Rack header height: `8 mm`.
- Rack RU height: `3 mm`; height is `8 + rack.heightRu * 3` mm.
- Missing-source placeholder: `60 x 30 mm`.

Multiply natural width/height by the placement scale. Rendering may tune internal typography and padding, but it must not change these outer geometry calculations without updating their tests and this guide.

Object-picker insertion scans from a `10 mm` page margin in `5 mm` increments, left-to-right then top-to-bottom, and chooses the first fitting non-overlapping placement. If none fits, use a visible `2.5 mm` diagonal cascade from the top-left margin and report that the new block overlaps existing content.

#### Fix 3 alignment amendment

The implemented Fix 3 contract supersedes the earlier placement scan for operator placement UI without changing the JSON model. An invisible virtual grid begins at 10 mm; the existing subtle 2.5 mm paper pattern remains the only visible grid. For uniform View device scale `s`, column pitch is `92 * s + 10` mm and row pitch is `(50 * 92 / 940) * s` mm. Picker insertion, navigator drop, pointer movement, coordinate edits, and keyboard movement share these positions. The View-wide Device Size choices are 70%, 80%, 90%, and 100%; applying one updates every device/TB placement and remaps all placements to the same logical grid cells. Racks keep their scale. Existing `xMm`, `yMm`, and `scale` fields remain the only persisted data.

### Live references and read-only rendering

- Resolve every placement from `project.devices` or `project.racks` on render.
- Never persist names, ports, cable numbers, rack contents, location data, or device snapshots in a placement.
- Standard devices show all I/O rows with live cable numbers and destination stubs, without `CrosspointPicker` controls.
- Terminal blocks show compact rear/front rows without patch controls.
- Racks show a compact live RU elevation without device dragging, reassignment, or rack-view removal controls.
- `labelOverride` changes only the placement header; `null` uses the current source name.
- Source edits re-render automatically and do not create View history entries.

### Manual View lines

- Lines attach to placement IDs, never source IDs, port IDs, cable IDs, or endpoint IDs.
- Endpoint offset is constrained to `0..1`. The editor presents anchors at offsets `0.25`, `0.5`, and `0.75` on each side.
- A line must join two different placements. Parallel lines between the same placements are allowed.
- Lines have no arrowhead and no stored engineering direction.
- Empty `waypoints` selects an automatically calculated orthogonal route.
- Default routing uses a midpoint channel for opposing horizontal or vertical sides. Mixed/same-side routes extend `5 mm` along each endpoint normal before joining orthogonally.
- Manual bend editing stores absolute millimetre waypoints. Normalize consecutive duplicate/collinear points and maintain horizontal/vertical segments.
- Moving/resizing a placement moves its anchors. Manual waypoints stay fixed until the user edits them or invokes **Reset route**, which restores `waypoints: []`.

### Annotations and layers

- Text annotations are free text with `small`, `medium`, or `large` presentation sizes.
- Group annotations are labeled outline rectangles. They do not own or move enclosed objects.
- Render order is fixed: group rectangles, lines, placements, text, selection/interaction handles.
- Color/style controls, z-order tools, multi-select, align/distribute, and arbitrary shapes are deferred.

### Cleanup and validation

- Removing a placement also removes lines whose `from` or `to` endpoint references it.
- Deleting a source device/rack reports affected View/placement/line counts before confirmation, then cascades only those placements and attached lines.
- Deleting a device that appears only inside a live rack elevation changes the rack rendering naturally; it does not remove the rack placement.
- Unrelated text/group annotations remain after source deletion.
- Current commands keep View references clean. Structurally valid imported dangling references remain loadable, produce relational errors, and render removable missing-source placeholders.
- View operations must leave settings, locations, folders, racks, devices, port groups, ports, cables, numbering ledgers, and connection semantics unchanged unless a separate existing source-deletion operation was explicitly invoked.

Use these validation codes consistently:

- `view-name-required`
- `duplicate-view-name`
- `duplicate-view-placement-source`
- `view-placement-device-missing`
- `view-placement-rack-missing`
- `view-line-placement-missing`
- `view-line-self-reference`
- `view-geometry-invalid`
- `view-item-outside-page` (warning)

## UX Contract

### Navigation and creation

- Keep Views inside the existing Workspace top-level app area; do not add another TopBar app tab.
- Add a flat **Views** navigator group independent of the location hierarchy.
- Provide Add View on the Views group and Rename/Delete on each View context menu.
- The creation dialog includes name, A4/A3, and portrait/landscape, prefilled with the next available `View N`, A3, portrait.
- Selecting a View opens its page in the center workspace and its properties in the existing right Inspector.
- Deleting a non-empty View confirms counts and never affects source objects.
- Existing devices and racks enter a View only by dragging them from the navigator onto the paper; no separate object picker is shown.
- The View workspace header stays compact. A placement Inspector can open its source directly and makes clear that Display Label affects only the current View.
- Keep the Views section anchored at the bottom of the navigator area, center the Add View affordance, and use the standard bottom-pinned modal footer.

### Canvas and tools

- Use a real paper boundary with shadow and whitespace inside the existing scrollable canvas area.
- Provide zoom out/in/reset, fit page, and fit width.
- Add tools only when functional: Select, Line, Text, Group.
- Devices/racks enter only through existing navigator drag payloads dropped onto the paper.
- Canvas-element selection is transient UI state coordinated between ViewWorkspace and the existing Inspector; it is not serialized.
- Commit pointer move/resize/route changes once at pointer release. Do not dispatch or autosave on every pointer move.
- Escape cancels an active creation/edit gesture. Delete removes the selected View element.
- Arrow keys nudge by one scale-aware virtual-grid cell; Shift+Arrow nudges by five cells. Both axes use the same I/O-row-derived pitch.

### Undo/redo

- Maintain a transient history per active View canvas with at most 50 past snapshots.
- Include placement, label, line, waypoint, text, and group canvas mutations.
- Exclude View creation/deletion/rename, page-size/orientation changes, import/new/load-sample, and underlying source edits/deletions.
- Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo.
- A new edit after undo clears redo history.
- Reset history when the active View changes or the project is replaced.

## Compatibility Policy

The user explicitly requested safe staged compatibility, overriding the normal current-shape-only internal-dev default for this series.

- `0.2.9.00` must migrate `0.2.8.25` by adding `views: []`.
- Every later prompt adds an identity migration from the immediately previous v0.2.9.x version because the persistent shape is introduced completely in `0.2.9.00`.
- Keep `0.2.8.25` and all earlier staged v0.2.9.x versions in the supported-version list so users can move directly to the final stage.
- Preserve one realistic `0.2.8.25` legacy fixture. Do not add a large fixture for every identity-only step; focused migration-unit tests are sufficient for the staged versions.
- The active localStorage key remains unchanged. Restored old data migrates before the next autosave writes the current shape.

## Prompt Sequence

1. `01-codex-prompt-0.2.9.00-view-model-and-compatibility.md`
2. `02-codex-prompt-0.2.9.01-view-navigation-and-page-workspace.md`
3. `03-codex-prompt-0.2.9.02-live-device-rack-placement.md`
4. `04-codex-prompt-0.2.9.03-view-lines-and-annotations.md`
5. `05-codex-prompt-0.2.9.04-view-editor-hardening.md`

Do not skip forward. If an earlier prompt changes a documented interface, reconcile this guide and every later unexecuted prompt before continuing.

## Series-Wide Exclusions

- No physical cable aggregation model or structured cable-group count.
- No automatic connectivity lines or automatic graph layout.
- No multi-select, align/distribute, z-order, color/style editor, or arbitrary freeform drawing.
- No View duplication.
- No PDF/SVG/Visio/print/title-block output.
- No authentication, backend, database, cloud storage, or collaboration.
- No release packaging or broad new Playwright suite as part of these feature-development prompts.
