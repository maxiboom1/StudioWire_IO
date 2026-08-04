# Codex implementation prompt - StudioWire IO `0.2.9.02`

## Assignment

Implement only the StudioWire IO `0.2.9.02` live device, terminal-block, and rack placement editor.

This is a feature-development task. Read `AGENTS.md` and `docs/0.2.9.xx/README.md` completely. The repository must start at completed, passing `0.2.9.01`. Do not absorb missing earlier work into this prompt.

This stage adds source placement, movement, scaling, labels, and read-only technical rendering. Do not add manual line, text, group, or undo/redo tools yet.

## Target version and compatibility

Bump all synchronized app/schema/version surfaces to `0.2.9.02`.

- Keep `0.2.8.25`, `0.2.9.00`, and `0.2.9.01` supported.
- Add an identity migration `0.2.9.01 -> 0.2.9.02`.
- Preserve the existing `0.2.8.25 -> 0.2.9.00` additive migration and full chain.
- Do not change the persistent View shape or add an identity fixture matrix.

## Goal and safety boundary

A user can add an existing device, terminal block, or rack to the current View, position and uniformly scale it, and optionally override its displayed header. The block always resolves live source data.

Every canvas interaction in this prompt may mutate only the selected View's `placements` array plus normal project stamp/change-log metadata. It must not modify device metadata, rack assignment, ports, cables, endpoints, numbering ledgers, locations, or folders.

## Source picker

Add a compact `Add object` control to the View toolbar. It opens an accessible searchable picker rather than a large permanent panel.

Picker behavior:

- Two logical result types: Devices (including terminal blocks) and Racks.
- Group results by Location, then Folder when present.
- Search case-insensitively across visible source name, device sub-name/model when available, rack name, Location, and Folder.
- Show source type and location context so duplicate-looking equipment can be distinguished.
- Exclude exact source pairs already placed in this View or show them disabled as `Already in View`.
- Keyboard users can search, choose a result, create it, and focus the resulting placement.
- Closing/canceling creates nothing.

Picker insertion uses the deterministic algorithm from the implementation guide:

- Default scale `1`.
- Scan from a `10 mm` page margin in `5 mm` steps, left-to-right then top-to-bottom.
- Use the shared placement-bounds helper and choose the first fitting, non-overlapping candidate.
- If no candidate fits, add a `2.5 mm` diagonal cascade position from the top-left and report that overlap needs manual adjustment.

If the exact source already exists, select/focus its current placement and report `Object is already in this View`; do not create a duplicate or stamp the project.

## Navigator drop onto View

Reuse the existing `NavigatorDragPayload` for both devices and racks. Do not create a second incompatible data-transfer protocol.

Required drop behavior:

- The paper is the drop target, not the surrounding workspace.
- Convert pointer position through page rect, current zoom, and the `3 px/mm` scale.
- Place the object's top-left at the snapped `2.5 mm` coordinate; holding Alt bypasses snapping.
- Clamp a normally dropped default-scale block so its known bounds fit inside the current page.
- Show a lightweight valid/duplicate drop preview.
- Duplicate drops select the existing placement without mutation.
- Clear shared drag state on drop, drag end, cancellation, View change, and unmount.
- Existing folder/rack drop workflows still interpret the same payload correctly outside a View.

## Geometry and interaction controller

Keep pointer-draft state local to a focused `useViewEditorController`-style hook. Commit one reducer action on pointer release; never dispatch on every pointer move.

Use the shared outer geometry exactly:

- Standard device/TB natural width `92 mm`.
- Header height `10 mm`.
- Row height `2.4 mm`; natural height `10 + max(rowCount, 1) * 2.4` mm.
- Rack natural width `58 mm`.
- Rack height `8 + rack.heightRu * 3` mm.
- Missing placeholder `60 x 30 mm`.
- Multiply width/height by placement scale.
- Scale range `0.25..3`.

Selection/movement/scaling:

- Clicking a block selects its placement; clicking empty paper clears selection.
- Selected state is transient and coordinated with the existing right Inspector.
- Drag by the placement header/frame. Use pointer capture and a local preview transform.
- Snap committed top-left coordinates to `2.5 mm`; Alt bypasses snap.
- Clamp normal moves inside the current page. Existing out-of-page records may still be selected/moved back.
- One bottom-right resize handle changes uniform scale while keeping top-left fixed.
- Resize preview is local and commits once on release, clamped to `0.25..3`.
- Arrow keys move by `2.5 mm`; Shift+Arrow by `10 mm`.
- Delete removes the selected placement and any attached lines through the domain helper, even though lines are not yet created by this UI.
- Escape cancels an in-progress drag/resize and restores stored geometry.

Add focus-visible selection and accessible labels such as `Router 1 placement, selected`.

## Placement Inspector

When a placement is selected, the existing View Inspector switches from View metadata to placement properties:

- Resolved source type/name/location/rack context as read-only information.
- `Display Label` input: empty submission stores `labelOverride: null`; otherwise store the trimmed override.
- `Scale` shown as a bounded percentage control derived from `0.25..3`.
- Numeric read-only or editable X/Y in millimetres using the same snapping/clamping helpers.
- `Remove from View` action; copy must state that the source object is unaffected.
- A `Back to View properties` action clears transient element selection.

Property updates use the same controller commit path as canvas changes so prompt 05 can add history cleanly.

## Shared read-only device presentation

Do not render the existing full `DeviceWorkspace` inside a scaled wrapper. Extract a pure presentation model from its current port-group/port/connection assembly so both the existing single-device canvas and new compact View block use the same domain truth.

The pure device presentation model should expose ordered left/right row slots containing:

- Port identity and label.
- Direction/side.
- Effective category/interface color and connector icon key.
- Cable number(s).
- Terminal-block chain marker summary.
- Resolved remote destination stub label from the existing connection-chain logic.

Keep `describePortConnection` and existing TB chain walking as the sole source of live connection descriptions.

Standard View device block:

- Header uses `labelOverride ?? device.name`; second line uses current Device sub-name when present.
- Render every row at the compact geometry, inputs left and outputs/bidirectional right following existing conventions.
- Show connector anchors/icons, port labels, cable numbers, TB marker summary, and remote destination stubs at readable zoom.
- Do not render `CrosspointPicker`, buttons, editable labels, or core-data drag handles.
- Source changes update immediately without modifying `ProjectView`.

Terminal-block View block:

- Use the same pure connection/presentation data but a compact rear/front two-face layout.
- Show current TB name/label and matching rear/front rows.
- Do not expose patch/disconnect controls.

Refactor the existing single-device/TB workspaces only enough to reuse pure data/presentation primitives; preserve their current interactive behavior and tests.

## Read-only rack presentation

Reuse `buildRackCanvasModel` and extract/refactor rack elevation presentation so it supports a read-only View mode.

The View rack block shows:

- Placement label override or live rack name.
- RU labels in the rack's numbering direction.
- Live mounted device/TB names and occupied RU spans.
- Existing placement-diagnostic styling where relevant.

It must not make mounted devices draggable, accept rack drops, move rack assignments, show add/remove-rack-view controls, or call `moveMountedDevice`.

## Bounds, missing references, and source deletion

- Render a clear `Missing device` or `Missing rack` placeholder for an imported dangling placement; keep it selectable and removable.
- Extend `view-item-outside-page` warning calculation using the shared natural-size formulas and current live source row/RU counts.
- Visually mark selected/out-of-page blocks without clipping away their selection affordances.
- If a live device gains enough I/O rows to exceed the page, do not alter View geometry; show the warning/highlight.

Update existing device/TB/rack delete confirmations to include the pure impact summary:

- Number of affected Views.
- Number of direct placements removed.
- Number of attached manual lines removed.
- Clear statement that unrelated annotations remain.

After confirmation, use the cleanup already added in prompt 01. Deleting a mounted device updates a placed rack's live contents but does not remove that rack placement.

## Architecture boundaries

- Pure presentation/geometry/search/model helpers live outside React.
- Pointer state and commit coordination live in a focused hook.
- Keep ViewWorkspace, Inspector, existing device workspace, and rack components below the repository's component-size guidance through decomposition.
- Do not add React Flow, Fabric, Konva, or another canvas dependency.
- Do not add line/text/group/undo controls prematurely.

## Tests

Add focused tests for:

- Picker grouping/search/filtering and keyboard selection.
- Deterministic first-fit/cascade placement.
- Navigator device/rack payload drops with zoom/snap/Alt/clamp behavior.
- Duplicate source prevention/select-existing behavior.
- Pointer movement and scaling commit once on release and cancel cleanly.
- Keyboard nudge/delete and selection reset on View/project changes.
- Placement Inspector label/scale/coordinates/removal.
- Pure device row ordering, cable/destination/TB summaries, and live source updates.
- View renderers contain no crosspoint/rack-assignment controls.
- Read-only rack elevation uses live mounted content.
- Missing-source placeholder and bounds warning behavior.
- Source-deletion impact copy and cascade.
- Placement actions leave all engineering arrays deep-equal.
- Existing DeviceWorkspace, TerminalBlockWorkspace, rack drag/drop, navigator, and migration tests remain passing.

Do not add broad E2E or screenshot-baseline tests. Perform a manual visual check using temporary local data with a standard device, TB, 48RU rack, and a high-port-count device at several zoom levels.

## Documentation and verification

Update README changelog/current support, Product Spec View behavior, Data Model live-reference rules, Validation Rules bounds behavior, and v0.2 Acceptance/manual visual checks.

Run focused tests, then:

```text
npm run typecheck
npm run build
npm run clean
npm run clean:check
```

Do not run Git commands, release gates, source packaging, Playwright installation/E2E, or later prompts. Finish with a concise summary and stop at `0.2.9.02`.
