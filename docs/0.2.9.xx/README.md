# StudioWire IO v0.2.9.x View Editor Implementation Guide

## Purpose

This folder is the implementation sequence for the first StudioWire IO multi-object View editor. Apply the seven prompts in numeric order. Each prompt is self-contained, names its starting and target version, and must leave the repository buildable and clean before the next prompt starts.

Creating or revising these prompt documents does not change the application version. The product implementation started at `0.2.9.00` from the `0.2.8.25` baseline.

Implementation status: prompts 01 through 07 are complete through `0.2.9.06`. The current `0.2.9.07` maintenance release preserves that contract and fixes crosspoint navigation by distinguishing normal project edits from explicit project lifecycle replacement.

The feature is a local, frontend-only presentation layer over project data:

- A View is a named A4 or A3 page stored in the project JSON.
- A View contains live references to existing devices, terminal blocks, and racks.
- Device/rack data remains the source of truth. A View never owns or copies those records.
- View placements, labels, drawing lines, text, and visual Areas belong only to their View.
- A View line is a manual drawing annotation. Its planned port/range IDs are visual anchors only: it is not a `Cable` and must never change connectivity or cable numbering.
- PDF, SVG, Visio, print, and title-block output remain deferred document-generation work.

## Research Decisions

The starting concept is `docs/ideas/multi-device-sheet-concept.md`. It correctly established that a multi-device drawing should be a curated collection of live source objects rather than another source-of-truth topology. This sequence makes the following final decisions:

- The user-facing and code-facing entity is **View**, with the TypeScript name `ProjectView`; do not introduce a `Sheet` entity.
- The earlier automatic live per-port line-visibility/path proposal is not part of v0.2.9.x.
- Detailed device blocks still show live cable numbers and destination stubs. Manual View lines reuse their visible row-end squares as presentation anchors but remain view-only.
- Manual lines may represent an operator-described cable group such as `12x SDI`, but that meaning exists only in the free-text label.

The reviewed drawing references under `docs/ideas/Drawing references/RGE 2024 BOOK` establish the desired visual language:

- Most book pages are A3 portrait; make A3 portrait the default while supporting A4/A3 in either orientation.
- Drawings use compact technical blocks, dense port rows, strong functional headings, generous whitespace, and clear page boundaries.
- Destination stubs are more common than fully routed signal lines.
- Where lines are useful, they are deliberate, sparse, and orthogonal.
- Rack elevations are meaningful read-only drawing objects, not simple text cards.
- Functional Area rectangles are visual aids rather than data containers. Temporary multi-selection, not persistent membership, moves several elements together.

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

## Final Planned Persistent Contract

Across this prompt series, build toward the following final presentation model as a top-level sibling of `locations`, `racks`, and `devices`. Prompt 04 initially introduced boundary-anchored lines; Prompt 06 deliberately replaces those endpoints with the port/range endpoint union below. Keep every field required in the current JSON Schema; use explicit empty strings, empty arrays, and `null` instead of optional serialized properties.

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
  color: ViewLineColor;
  width: ViewLineWidth;
  labelOrientation: ViewLineLabelOrientation;
  labelPosition: number;
}

type ViewLineEndpoint =
  | {
      kind: 'port';
      placementId: string;
      portId: string;
    }
  | {
      kind: 'port_range';
      placementId: string;
      annotationId: string;
    };

type ViewLineColor =
  | 'black'
  | 'red'
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'gray'
  | 'teal';

type ViewLineWidth = 'hairline' | 'thin' | 'medium' | 'wide';
type ViewLineLabelOrientation = 'horizontal' | 'vertical';

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
    }
  | {
      id: string;
      kind: 'port_range';
      placementId: string;
      side: 'left' | 'right';
      startPortId: string;
      endPortId: string;
      label: string;
    };
```

Use exported value lists and derived union types for page sizes, orientations, source types, annotation kinds, text sizes, and Line style fields, following the existing domain-type pattern.

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

The operator creates placements only by dragging existing navigator devices/racks onto the paper. An invisible virtual grid begins at 10 mm; the existing subtle 2.5 mm paper pattern remains the only visible grid. For uniform View device scale `s`, horizontal and vertical pitch are both `(50 * 92 / 940) * s` mm. Navigator drop, pointer movement, coordinate edits, and keyboard movement share these positions. The View-wide Device Size choices are 70%, 80%, 90%, and 100%; applying one updates every device/TB placement and remaps all placements to the same logical grid cells. Racks keep their scale. Existing `xMm`, `yMm`, and `scale` fields remain the only persisted placement data.

### Live references and read-only rendering

- Resolve every placement from `project.devices` or `project.racks` on render.
- Never persist names, ports, cable numbers, rack contents, location data, or device snapshots in a placement.
- Standard devices show all I/O rows with live cable numbers and destination stubs, without `CrosspointPicker` controls.
- Terminal blocks show compact rear/front rows without patch controls.
- Racks show a compact live RU elevation without device dragging, reassignment, or rack-view removal controls.
- `labelOverride` changes only the placement header; `null` uses the current source name.
- Source edits re-render automatically and do not create View history entries.

### Manual View lines

- Starting at `0.2.9.05`, Lines attach only to a standard-device row port or a standard-device I/O Range. Stored port/range IDs resolve presentation geometry and never assert engineering connectivity.
- Reuse the existing passive white row-end squares as Line-mode buttons without drawing duplicate device anchors. A covered row is inactive and its I/O Range exposes one matching midpoint square.
- Terminal blocks, racks, missing sources, and generic placement boundaries do not expose Line anchors.
- A Line must join anchors on two different standard-device placements. Parallel Lines are allowed.
- Lines have no arrowhead and no stored engineering direction.
- Empty `waypoints` selects an automatically calculated orthogonal route.
- Default routing extends `5 mm` along each endpoint's live left/right normal before joining orthogonally.
- Manual bend editing stores absolute millimetre waypoints. Normalize consecutive duplicate/collinear points and maintain horizontal/vertical segments.
- Moving/scaling a placement or editing a range moves its resolved anchors. Manual waypoints stay fixed until the user edits them or invokes **Reset Route**.
- Lines use the fixed black/red/blue/green/orange/purple/gray/teal palette and Hairline/Thin/Medium/Wide widths. Labels stay black.
- `labelPosition` is normalized route arc length `0..1`; label dragging projects onto the orthogonal route. Orientation is horizontal or bottom-to-top vertical.

### Annotations and layers

- Text annotations are free text with `small`, `medium`, or `large` presentation sizes.
- Persisted `group` annotations are user-facing **Areas**: labeled outline rectangles that do not own or move enclosed objects.
- I/O Range annotations are standard-device-attached braces spanning live rendered rows on one side. They move/scale with the device, use stable port IDs only as presentation anchors, and never assert engineering connectivity. Same-side ranges may not overlap.
- Render order is fixed: Area rectangles, Lines, placements, Text, selection/interaction handles.
- Multi-selection is transient and includes placements, Text, and Areas. It does not create persistent membership; Lines and I/O Ranges remain independently selected.
- Z-order tools, align/distribute, logical grouping, and arbitrary shapes are deferred.

### Cleanup and validation

- Removing a placement also removes Lines whose endpoint references it and I/O Ranges whose `placementId` references it.
- Removing an I/O Range referenced by Lines confirms the attached count, then removes that range and those Lines atomically.
- Deleting a source device/rack reports affected View, placement, I/O Range, and Line counts before confirmation, then cascades only those placements and attached View content.
- Deleting a device that appears only inside a live rack elevation changes the rack rendering naturally; it does not remove the rack placement.
- Unrelated Text/Area annotations remain after source deletion.
- Current commands keep View references clean. Structurally valid imported dangling references remain loadable, produce relational errors, and render removable missing-source placeholders.
- View operations must leave settings, locations, folders, racks, devices, port groups, ports, cables, numbering ledgers, and connection semantics unchanged unless a separate existing source-deletion operation was explicitly invoked.

Use these validation codes consistently:

- `view-name-required`
- `duplicate-view-name`
- `duplicate-view-placement-source`
- `view-placement-device-missing`
- `view-placement-rack-missing`
- `view-line-placement-missing`
- `view-line-port-missing`
- `view-line-port-invalid`
- `view-line-range-missing`
- `view-line-range-invalid`
- `view-line-self-reference`
- `view-line-style-invalid`
- `view-port-range-placement-missing`
- `view-port-range-port-missing`
- `view-port-range-invalid`
- `view-port-range-overlap`
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
- Keep the project tree top-aligned and independently scrollable. Keep Views bottom-anchored in a fixed region showing exactly three `42 px` rows, with a fixed heading and an internally scrolling list from the fourth View onward.
- Center the Add View affordance and use the standard bottom-pinned modal footer.

### Canvas and tools

- Use a real paper boundary with shadow and whitespace inside the existing scrollable canvas area.
- Provide zoom out/in/reset, fit page, and fit width.
- Add tools only when functional: Select, Line, Text, Area, I/O Range. `Area` retains persisted `kind: 'group'` for compatibility.
- Devices/racks enter only through existing navigator drag payloads dropped onto the paper.
- Canvas-element selection is transient UI state coordinated between ViewWorkspace and the existing Inspector; it is not serialized. Ctrl/Cmd-click toggles movable items, plain marquee replaces, and Shift-marquee adds fully enclosed placements/Text/Areas.
- Dragging or nudging a movable multi-selection applies one shared grid-aware delta and commits one atomic canvas mutation. Lines and I/O Ranges do not join movable multi-selection.
- Commit pointer move/resize/route changes once at pointer release. Do not dispatch or autosave on every pointer move.
- Escape cancels an active creation/edit gesture. Delete removes the selected View element.
- Arrow keys nudge by one scale-aware virtual-grid cell; Shift+Arrow nudges by five cells. Both axes use the same I/O-row-derived pitch.

### Undo/redo

- Maintain a transient history per active View canvas with at most 50 past snapshots.
- Include placement, multi-selection, label, Line style/orientation/position/waypoint, Text, Area, and I/O Range canvas mutations.
- Exclude View creation/deletion/rename, page-size/orientation changes, import/new/load-sample, and underlying source edits/deletions.
- Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo.
- A new edit after undo clears redo history.
- Reset history when the active View changes or the project is replaced.

## Compatibility Policy

The user explicitly requested safe staged compatibility, overriding the normal current-shape-only internal-dev default for this series.

- `0.2.9.00` must migrate `0.2.8.25` by adding `views: []`.
- Prompts through `0.2.9.04` add identity migrations from the immediately previous v0.2.9.x version.
- `0.2.9.04 -> 0.2.9.05` deliberately removes old boundary-anchored `views[].lines`, reports the removed count, and preserves every other project record before adopting the port/range endpoint and Line-style shape. Do not retain a legacy endpoint variant or infer nearest ports.
- `0.2.9.05 -> 0.2.9.06` is an identity migration.
- Keep `0.2.8.25` and all earlier staged v0.2.9.x versions in the supported-version list so users can move directly to the final stage.
- Preserve one realistic `0.2.8.25` legacy fixture. Do not add a large fixture for every identity-only step; focused migration-unit tests are sufficient for the staged versions.
- The active localStorage key remains unchanged. Restored old data migrates before the next autosave writes the current shape.

## Prompt Sequence

1. `01-codex-prompt-0.2.9.00-view-model-and-compatibility.md`
2. `02-codex-prompt-0.2.9.01-view-navigation-and-page-workspace.md`
3. `03-codex-prompt-0.2.9.02-live-device-rack-placement.md`
4. `04-codex-prompt-0.2.9.03-view-lines-and-annotations.md`
5. `05-codex-prompt-0.2.9.04-canvas-selection-and-polish.md`
6. `06-codex-prompt-0.2.9.05-port-anchored-lines-and-styling.md`
7. `07-codex-prompt-0.2.9.06-view-editor-hardening.md`

Do not skip forward. If an earlier prompt changes a documented interface, reconcile this guide and every later unexecuted prompt before continuing.

## Series-Wide Exclusions

- No physical cable aggregation model or structured cable-group count.
- No automatic connectivity lines or automatic graph layout.
- No logical Area membership, align/distribute, z-order, generic/rack/TB Line anchors, arbitrary colors/continuous widths, or freeform drawing.
- No View duplication.
- No PDF/SVG/Visio/print/title-block output.
- No authentication, backend, database, cloud storage, or collaboration.
- No release packaging or broad new Playwright suite as part of these feature-development prompts.
