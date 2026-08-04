# Codex implementation prompt - StudioWire IO `0.2.9.03`

## Assignment

Implement only the StudioWire IO `0.2.9.03` manual View-line, text, and grouping-rectangle drawing tools.

This is a feature-development task. Read `AGENTS.md` and `docs/0.2.9.xx/README.md` completely. The repository must start at completed, passing `0.2.9.02` with live placement rendering. Do not implement the final undo/redo/accessibility hardening prompt yet.

## Target version and compatibility

Bump every synchronized app/schema/version surface to `0.2.9.03`.

- Keep `0.2.8.25`, `0.2.9.00`, `0.2.9.01`, and `0.2.9.02` supported.
- Add an identity migration `0.2.9.02 -> 0.2.9.03`.
- Preserve the additive `0.2.8.25` migration and all staged chains.
- Do not change the persistent View shape introduced in `0.2.9.00`.

## Non-negotiable semantic boundary

A `ViewLine` is a drawing annotation only. It must never:

- Store a port ID, cable ID, endpoint ID, direction, cable count, or connection state.
- Call connect/disconnect operations.
- Create, retire, renumber, reserve, or release cables.
- Claim that its two source devices/racks are physically connected.

The only user-defined meaning is `ViewLine.label`, for example `12x SDI`, `Dante Primary`, or `Fiber trunks`. Render a neutral line without an arrowhead.

Detailed device blocks continue showing live cable numbers and destination stubs independently of manual View lines.

## Tool model and toolbar

Add a typed transient tool mode owned by the View editor controller:

```ts
type ViewEditorTool = 'select' | 'line' | 'text' | 'group';
```

Toolbar requirements:

- Clearly labeled/titled buttons for Select, Line, Text, and Group.
- Active tool has a visible pressed state and `aria-pressed`.
- Tool buttons appear only while a View is selected.
- Switching Views resets to Select and cancels any draft.
- Escape cancels the current creation gesture and returns to Select.
- Clicking a finished element selects it and returns to Select after one-shot Text/Group creation; Line remains active only long enough to finish one line, then also returns to Select.
- Do not add color, stroke-style, arrow, z-order, multi-select, or align controls.

Keep draft geometry in the controller. Persist only a completed line/annotation, and commit pointer editing once on release.

## Line creation workflow

When Line is active:

1. Show connection handles at offsets `0.25`, `0.5`, and `0.75` on all four sides of each valid placement.
2. Clicking/pressing a handle starts a draft with `{ placementId, side, offset }`.
3. Show an orthogonal preview following the pointer in page millimetres.
4. Finish only on a handle belonging to a different placement.
5. Clicking the same placement, empty paper, or a missing-source placeholder does not persist a line and gives concise guidance.
6. On a valid second endpoint, create one View line with `label: ''` and `waypoints: []`, select it, return to Select, and focus its Inspector label input.
7. If the label remains empty, the line is still valid and may be labeled later; do not invent a structured default.

Parallel lines between the same two placements are allowed. Self-lines are not.

Use placement IDs in endpoints so anchors follow movement and scaling. Do not use source IDs.

## Orthogonal routing

Put all routing in pure helpers that operate in millimetres and are tested without the DOM.

Anchor calculation:

- Resolve placement bounds from the shared geometry helper.
- `left/right` interpolate Y by endpoint offset.
- `top/bottom` interpolate X by endpoint offset.

Automatic route for `waypoints: []`:

- Opposing left/right sides: use the midpoint X channel, producing start -> `(midX,startY)` -> `(midX,endY)` -> end.
- Opposing top/bottom sides: use the midpoint Y channel.
- Same-side endpoints: extend both endpoints `5 mm` outward on their side normal, route through a channel a further `5 mm` outside the more-extreme block edge, then return.
- Mixed horizontal/vertical sides: extend each endpoint `5 mm` along its normal, then join the extension points with one orthogonal bend; choose horizontal-first when absolute X separation is greater than or equal to Y separation, otherwise vertical-first.
- Remove consecutive duplicate and collinear points before rendering.

Manual route behavior:

- `waypoints` contains the complete stored internal bend sequence between calculated anchors.
- Render start + normalized waypoints + end as an SVG polyline/path in the line layer below placements.
- Selected lines show bend/segment handles.
- Dragging a bend maintains orthogonality by moving the adjacent horizontal/vertical legs together; do not permit diagonal stored segments.
- Double-clicking a segment inserts an orthogonal bend pair at the clicked projected millimetre coordinate.
- Selecting a bend and pressing Delete removes the bend/pair while keeping the line; selecting the line body and pressing Delete removes the line.
- `Reset route` clears `waypoints` to restore automatic routing.
- Moving/scaling a placement recalculates endpoint anchors. Non-empty manual waypoints remain absolute.

The line label is rendered in a small white-backed capsule at the geometric midpoint of the rendered route, stays horizontal, and moves automatically as the path changes.

## Line selection and Inspector

Extend transient `ViewCanvasSelection` with a discriminated line selection. The existing View Inspector displays:

- Read-only source and destination placement display labels.
- `Line Label` text input, persisted as entered after normal trim-on-commit behavior.
- Read-only route mode: `Automatic` or `Manual`.
- `Reset route`, disabled when already automatic.
- `Delete line`.
- `Back to View properties`.

Double-clicking a line label focuses the same Inspector input. Inspector updates use the common canvas commit path so prompt 05 can record them in history.

## Text tool

Text creation:

- Clicking the page creates a selected text annotation at the snapped page coordinate.
- Default width `40 mm`, text `Text`, size `medium`.
- Clamp the initial box within the page where possible.
- Immediately focus the Inspector text input.

Text rendering/editing:

- Render above placements/lines according to the fixed layer order.
- Use restrained fixed presentation sizes mapped consistently from `small`, `medium`, and `large`.
- Selected text can be dragged with the same snap/Alt/keyboard rules as placements.
- A right-edge or bottom-right handle changes `widthMm`, with a minimum of `10 mm`; height remains content-derived.
- Double-click focuses its Inspector text input.

Text Inspector fields/actions:

- Text content; persisted content must remain non-empty. If the user submits only whitespace, keep the previous value and show validation rather than storing invalid data.
- Size select: Small, Medium, Large.
- Width in millimetres.
- Delete text.
- Back to View properties.

## Group tool

Group creation:

- Pointer-down on empty paper starts a rectangle; drag sets the opposite corner.
- Show a local snapped preview and normalize drag direction.
- Minimum persisted size `20 x 15 mm`.
- A click without sufficient drag creates a `60 x 40 mm` group clamped within the page.
- Default label `Group` and immediate Inspector focus after creation.

Group behavior:

- Render as a restrained outline and label integrated with the top border in the background layer.
- It is visual only: it does not contain, select, move, or delete enclosed placements/annotations.
- Selected group can move and resize from edges/corners using page snapping; commit once on release.
- Double-click focuses its Inspector label input.

Group Inspector fields/actions:

- Required non-empty label.
- X/Y/width/height in millimetres using shared geometry rules.
- Delete group.
- Back to View properties.

## Selection, keyboard, and interaction precedence

- Fixed hit/layer order remains group backgrounds, lines, placements, text, selection controls.
- Interaction hit testing must still allow selecting a group border behind other elements.
- Clicking empty paper clears selection.
- Delete removes the selected element; do not delete while focus is inside an input/textarea.
- Arrow and Shift+Arrow nudge selected placements, text, and groups using the established steps. Lines are moved only through endpoints/waypoints, not as a whole.
- Escape cancels drafts/active drags before clearing selection.
- Pointer capture must be released on completion/cancel/unmount even before final hardening.

## Cleanup and bounds

- Removing a placement deletes its attached lines through the existing pure operation and clears stale transient line selection.
- Source deletion cleanup does the same across Views.
- A line with a missing imported placement endpoint remains a validation error; render it only when both placement bounds resolve. Inspector/navigation must not crash.
- Extend `view-item-outside-page` warnings to text/group extents and manual route waypoints outside the paper.
- Do not auto-clamp existing annotations/routes after a page-format change; highlight/report them for manual repair.

## Architecture boundaries

- Pure route/point/normalization/hit-test helpers live outside React.
- SVG drawing presentation contains no domain mutation logic.
- The controller owns transient tool/draft/selection state and dispatches completed View commands.
- The existing Inspector remains a coordinator with focused View-element panels.
- Do not install a canvas/graph/routing library.

## Tests

Add focused tests for:

- Endpoint anchor positions at all sides/offsets and scales.
- Automatic opposing/same/mixed-side routes and point normalization.
- Line creation rejects same-placement/empty destinations and allows parallel lines.
- Line creation stores placement IDs only and returns focus to the label field.
- Placement movement changes line anchors while manual waypoints remain unchanged.
- Bend insertion/movement/removal stays orthogonal; Reset route clears waypoints.
- Placement/source deletion removes attached lines and stale selection safely.
- Text/group defaults, drag normalization, resizing, required labels/text, nudge, and delete.
- Layer/hit behavior for group borders, lines, placements, and text.
- Out-of-page warnings include annotation extents/manual waypoints.
- Input-focused Delete does not remove canvas content.
- Snapshot/deep-equality tests prove line and annotation operations leave devices, racks, ports, cables, endpoints, numbering ledgers, locations, and folders unchanged.
- Existing device/rack placement, source edit/delete, import/export, and migration tests remain passing.

Use component tests for important tool interactions and pure tests for geometry/routing. Do not add Playwright E2E or image snapshots. Manually inspect representative device/rack arrangements with sparse and parallel labeled lines at several zoom levels.

## Documentation and verification

Update README changelog/current support, Product Spec drawing-tool behavior, Data Model semantics, Validation Rules, Roadmap boundaries, and v0.2 Acceptance/manual visual checks. State prominently that View lines are not engineering connectivity.

Run focused tests, then:

```text
npm run typecheck
npm run build
npm run clean
npm run clean:check
```

Do not run Git commands, release gates, source packaging, Playwright installation/E2E, or prompt 05. Finish with a concise summary and stop at `0.2.9.03`.
