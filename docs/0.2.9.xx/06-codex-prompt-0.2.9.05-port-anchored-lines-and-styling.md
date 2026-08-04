# Codex implementation prompt - StudioWire IO `0.2.9.05`

## Assignment

Replace generic placement-boundary View-line anchors with standard-device I/O and I/O Range anchors, then add restrained Line color, width, label-orientation, and route-constrained label-position controls at `0.2.9.05`.

This is a feature-development task. Read `AGENTS.md` and `docs/0.2.9.xx/README.md` completely before editing. The repository must start at completed, passing `0.2.9.04` with the compact Fix 4 workspace, top/fixed navigator regions, transient multi-selection, Area terminology, refined I/O Ranges, and the existing neutral orthogonal Line editor.

This prompt intentionally changes the persistent View-line shape. Update `docs/DATA_MODEL.md` and `docs/VALIDATION_RULES.md` before implementing schema or validation behavior.

Visual thesis: a Line originates from connection points already visible in the technical device drawing. Reuse those exact white squares and keep editing affordances subordinate to the drawing.

## Target version and compatibility

- Bump every synchronized app/schema/version surface to exactly `0.2.9.05`.
- Replace the `0.2.9.04` View-line schema with the model below.
- Add a deliberate shape-changing migration `0.2.9.04 -> 0.2.9.05` that removes every old boundary-anchored record from `views[].lines` while preserving every other project field and View collection exactly.
- The migration must count removed lines. File import reports that count in its normal import result/status; autosave restore reports one concise recovery notice when the count is non-zero.
- Preserve the staged chain from `0.2.8.25`, `0.2.9.00`, `0.2.9.01`, `0.2.9.02`, `0.2.9.03`, and `0.2.9.04`. Earlier formats migrate through `.04`, then apply the same line-removal step.
- Do not retain a legacy boundary endpoint union and do not attempt nearest-port inference. Old Lines are the only intentionally discarded data.
- Retain the current localStorage key. The next successful autosave writes the `.05` shape.

## Persistent Line model

Add exported value lists and derived union types following the existing domain pattern:

```ts
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

interface ViewLine {
  id: string;
  from: ViewLineEndpoint;
  to: ViewLineEndpoint;
  label: string;
  waypoints: ViewPoint[];
  color: ViewLineColor;
  width: ViewLineWidth;
  labelOrientation: ViewLineLabelOrientation;
  labelPosition: number; // normalized route arc length, 0..1
}
```

Creation defaults:

```ts
{
  color: 'black',
  width: 'thin',
  labelOrientation: 'horizontal',
  labelPosition: 0.5,
  waypoints: []
}
```

These remain neutral View-only drawing marks. `portId` and `annotationId` are stable visual anchors only; they do not represent, infer, validate, create, remove, connect, disconnect, count, or own physical cables or engineering endpoints.

## Eligible anchors

New Lines may connect only:

- A rendered row belonging to a standard device (`device.kind === 'device'`).
- An I/O Range attached to a standard-device placement.

They may not connect to:

- Terminal blocks.
- Racks.
- Missing-source placeholders.
- Text or Area annotations.
- Two anchors belonging to the same placement.

Parallel Lines between different placements remain allowed. Lines have no arrowheads or engineering direction; `from` and `to` are storage names only.

### Reuse existing device squares

The outer end of every populated standard-device row already renders the passive white `device-cable-picker is-read-only` square in the shared DeviceDiagram. Reuse that element:

- Outside Line mode it remains the existing passive span.
- In Line mode it becomes a focusable button with the same classes, dimensions, position, and normal visual appearance.
- Hover/focus may add a restrained outline without enlarging or shifting the square.
- The accessible name identifies the View line action and current I/O label.
- The stored endpoint uses the owning standard-device row's `portId`, even when the live row drawing contains an inline terminal-block marker or front continuation point. Do not store an inline TB exit-port ID.
- Empty padding rows do not expose anchors.

Extend the shared DeviceDiagram through focused optional View-line anchor props/presentation data. Do not fork or duplicate the device renderer, row-ordering rules, or connection-summary logic.

### I/O Range anchor precedence

- When an I/O Range covers one or more rows, those existing row squares remain visible but are not interactive Line anchors while Line mode is active.
- The range renders one square matching the existing device-square size and style at the vertical midpoint of its brace, on the outside edge away from the device.
- That range square stores `{ kind: 'port_range', placementId, annotationId }`.
- Different ranges on the same side expose independent anchors.
- A missing/invalid range shows its existing warning and cannot create a new Line.

Do not add top, bottom, corner, rack, TB, or generic boundary anchors. Remove the previous three-large-anchors-per-side UI completely.

## Endpoint resolution and routing

Use pure endpoint-resolution helpers shared by rendering, routing, validation, bounds prediction, and tests.

- A port endpoint resolves the current placement, confirms it references a standard device, resolves `portId` on that device, finds the port's current rendered column/row, and returns the exact center of the reused outer white square plus its left/right outward normal.
- A range endpoint resolves the annotation, confirms its `placementId` matches, resolves current range rows, and returns the exact center of the range square plus its outward normal.
- Row insertion/reorder and View-wide device scaling move endpoints live without rewriting the Line.
- Empty `waypoints` continues to request an automatic orthogonal route.
- Begin automatic routing by extending each endpoint `5 mm` along its outward normal, then join with the existing deterministic orthogonal strategy.
- Manual waypoints remain absolute millimetre coordinates. Moving devices, changing scale, editing ranges, or dragging labels never rewrites them.
- Reset Route remains the only user action that clears manual waypoints.
- Normalize duplicate/collinear points for rendering without silently rewriting stored imported data until the user commits a route edit.

If one endpoint cannot resolve, render a small selectable missing-endpoint warning at the surviving endpoint. If neither resolves, render one selectable warning chip in a stable top-left View warning lane. Either warning opens the Line Inspector so the Line can be removed. Do not fabricate an anchor or mutate the source device.

## Line styles

Use these fixed technical presets and no free color picker:

| Stored color | Stroke color |
| --- | --- |
| `black` | `#172B31` |
| `red` | `#D83A34` |
| `blue` | `#3465EB` |
| `green` | `#0A8F5B` |
| `orange` | `#C87019` |
| `purple` | `#7A3CE0` |
| `gray` | `#66757B` |
| `teal` | `#087F7C` |

Use these base widths at 100% page zoom; normal page zoom scales the complete drawing:

| Stored width | SVG stroke width |
| --- | --- |
| `hairline` | `1 px` |
| `thin` | `2 px` |
| `medium` | `3 px` |
| `wide` | `5 px` |

- The transparent hit stroke remains large enough for reliable selection regardless of visible width.
- Line labels are always black, independent of Line color, and retain a restrained white halo for legibility.
- Selection must not replace the chosen stroke color. Render a separate secondary halo/outline beneath the actual stroke.
- Out-of-page warning treatment must remain distinguishable without permanently replacing the configured color.
- Toolbar creation uses defaults; style changes occur in the Line Inspector after selection.

## Label position and orientation

`labelPosition` is normalized distance along the complete rendered orthogonal polyline:

- `0` is the resolved `from` endpoint and `1` is the resolved `to` endpoint.
- New Lines start at `0.5`.
- Resolve the label point by total Manhattan/segment length, not array index or Euclidean shortcut across bends.
- Pointer-dragging the label projects the pointer onto the closest horizontal or vertical route segment and stores the corresponding normalized total distance.
- Preview locally during drag and commit once on pointer release. Alt/grid snapping does not apply because the label is constrained to the route.
- If the route later changes, the same normalized value places the label at the same relative distance along the new route.
- Zero-length/degenerate routes fall back safely to the first resolved point and never emit NaN.

Orientation choices:

- `horizontal`: normal left-to-right text.
- `vertical`: bottom-to-top text, matching the I/O Range reading direction.

When a labeled Line is selected, show a small circular rotate affordance next to the label. Activating it toggles horizontal/vertical without moving the label. Give it a visible focus state, title, and accessible name. Do not display it on every unselected Line.

## Line Inspector

Keep the existing right Inspector and replace the old read-only From/To/Route rows with:

- **Line Label** text input.
- **Color** fixed swatches with selected state, tooltip, and accessible name.
- **Width** four stroke samples labeled Hairline, Thin, Medium, and Wide.
- **Label Direction** Horizontal/Vertical segmented control.
- **Reset Route**, disabled for automatic routes.
- **Remove** in the standard destructive action area.
- The existing statement that the Line is View-only and does not create engineering connectivity.

Double-clicking the label focuses Line Label. The on-canvas rotate control and Inspector direction control update the same field.

## Cleanup and validation

Removing an I/O Range referenced by Lines requires a confirmation that reports the attached-Line count. Confirming removes the range and those Lines atomically; Cancel changes nothing.

Placement/source deletion keeps the existing cascade and removes Lines whose endpoints use that placement. Removing unrelated Text/Areas or editing source metadata does not remove Lines.

Add or revise validation codes consistently:

- `view-line-placement-missing`
- `view-line-port-missing`
- `view-line-port-invalid`
- `view-line-range-missing`
- `view-line-range-invalid`
- `view-line-self-reference`
- `view-line-style-invalid`
- `view-geometry-invalid`
- `view-item-outside-page` warning, including the configured label position/orientation extent

Structurally valid dangling port/range references remain loadable. New domain operations reject invalid endpoints, invalid enum values, non-finite/out-of-range label positions, non-orthogonal manual geometry, or same-placement Lines.

## Architecture boundaries

- Keep endpoint resolution, covered-row suppression, route geometry, polyline length/projection, style maps, validation, and cleanup as pure domain/presentation helpers.
- Keep DeviceDiagram reusable; add narrow optional callbacks rather than View-specific project mutations.
- Keep label/waypoint gestures in focused controllers with one pointer-release commit.
- Extend the existing View action family and context commands; keep the root reducer and ProjectContext coordination thin.
- Do not add a general graph library, arbitrary SVG editor, engineering cable-group model, or duplicated device DOM.

## Tests

Add focused tests for:

- `.04 -> .05` migration removes only old Lines, reports the exact count, and preserves all placements/annotations and engineering collections exactly.
- Direct import through every supported earlier version reaches `.05` through the same migration chain.
- Port endpoint resolution at both sides, after row insertion/reorder, placement movement, and 70/80/90/100% scale changes.
- Range endpoint resolution, midpoint geometry, covered-row suppression, and different-side ranges.
- Existing white squares becoming buttons only in Line mode without geometry changes.
- TB/rack/missing-source/empty-row anchors being unavailable.
- Same-placement rejection, parallel Lines, and port-to-range/range-to-range combinations across different devices.
- Automatic orthogonal routes, manual waypoint preservation, bend editing, and Reset Route.
- Palette/width maps, default styles, selection halo, black label rendering, and out-of-page treatment.
- Manhattan arc-length label placement, closest-segment projection, horizontal/vertical rendering, route-change stability, and degenerate routes.
- One transactional label drag/orientation/style commit and form-focused Delete protection.
- Missing endpoint warnings remain selectable and removable.
- I/O Range removal confirmation/cascade and placement/source cleanup counts.
- Line operations leave devices, ports, cables, endpoints, numbering ledgers, racks, locations, and folders byte-equivalent.
- Exact JSON round-trip of the new Line model.

Do not add a broad Playwright suite. Use focused domain/controller/component tests and manual visual inspection.

## Documentation and verification

Update README, Product Spec, Data Model, Validation Rules, Roadmap, v0.2 Acceptance, the shared `0.2.9.x` guide, and the hardening prompt. Document clearly that View Line port IDs are presentation anchors rather than engineering connections.

Manually inspect:

- Sparse and high-port-count devices at all four sizes.
- Individual port, port-to-range, and range-to-range Lines on left/right sides.
- Covered-row suppression and the range midpoint square.
- Every color/width, selected/unselected/warning states, label drag across bends, and both label orientations.
- Automatic/manual/parallel Lines at several zoom levels and narrow viewport widths.

Run focused tests while iterating, followed by:

```text
npm run test:run
npm run typecheck
npm run version:check
npm run build
npm run clean
npm run clean:check
```

Do not run Git operations, release packaging, browser installation, a new Playwright suite, or release-only gates. Finish at `0.2.9.05` with generated artifacts removed.

## Explicit deferrals

Do not add rack/TB anchors, generic boundary anchors, logical Area grouping, align/distribute, free color picking, continuous stroke widths, arrowheads, structured cable counts, automatic engineering lines, print/export, authentication, backend, or database work.
