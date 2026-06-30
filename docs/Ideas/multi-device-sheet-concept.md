# StudioWire IO — Multi-Device "Sheet" View: Concept Document

**Status:** Concept / pre-implementation. This document captures a design discussion and is intended as a future prompt/spec input, not a final implementation plan. Many open questions remain (marked below).

**Context at time of writing:** v0.2.8.8, 246/246 tests passing, clean build. This concept does not require changes to the core domain model (`Device`, `Port`, `PortGroup`, `Cable`, `Endpoint`). It is purely an additive presentation layer.

---

## 1. Problem Statement

The current `DeviceWorkspace` renders a single device on a canvas: ports on left/right columns, fixed-row CSS Grid layout, with cable numbers, TB chain markers, and crosspoint pickers inline. This works because every line travels along one fixed row in one fixed direction — it never has to cross another line.

The open question was: how do we get a **multi-device view** (multiple devices on one canvas, with their interconnections visible) without solving general-purpose graph/diagram routing (i.e. without "building Visio in the browser")?

## 2. Reference Material Analysis

Real broadcast wiring books (RGE 2024 BOOK — Control, Peripheral, EVERTZ matrix, Rack elevation, and Network sheets) were reviewed to extract the actual professional convention, rather than guessing at one. Findings:

1. **No line bundling, ever — even at high density.** A 144-port EVERTZ matrix sheet draws 144 individual labeled rows, not consolidated "12x" bundles. The earlier idea of drawing one line for a 12-output→12-input parallel run does **not** match how this domain actually documents itself, and was dropped.

2. **Most connections are never drawn as a line at all — they terminate in a text label.** The dominant pattern is an arrow plus a short text reference to the destination (e.g. `>MTX out-491`, `>SW R-30 U-42`). Only a minority of connections — where both ends happen to live on the same sheet and there are few enough of them to stay legible — get an actual drawn line (e.g. FastServer → MV16 on the Peripheral sheet).

3. **Sheets are organized by functional zone, not "one sheet per device."** Control, Peripheral, EVERTZ matrix tiers, and Network each get their own sheet. A device/matrix can be referenced from multiple sheets. The full system is never one mega-canvas; it's a deliberately partitioned set of views cross-referenced by text labels.

4. **Color/position encode meaning structurally.** Inputs left (often red), outputs right; front/rear panels drawn as physically separate rows mirroring the real connector panel.

5. **Exception — the network/Ethernet sheet draws real routed lines** between switch blocks, because at that layer there are few enough trunk connections between any two specific blocks that a real line adds clarity instead of clutter. This is the tell for *when* a real line is worth drawing: low connection count between two specific on-sheet blocks, not high.

**Implication for this feature:** the canvas should default to label/stub rendering for every port, and treat drawn lines as a deliberate, sparingly-used editorial choice — not an automatic rendering of every resolvable connection.

## 3. Core Insight: Reuse, Don't Replace

The existing single-device canvas (`DeviceWorkspace`) is not obsolete — it's the building block. A multi-device "Sheet" is best understood as:

> A curated, positioned collection of existing single-device blocks, placed on a shared canvas, where each device's own ports default to label-stub rendering (exactly like today, just pointed at text instead of nothing) — with an explicit, per-port, user-controlled option to instead draw a real line to another device's port **only when that destination device is also present on the same sheet.**

This means:
- No new device/port rendering logic is needed for the common case — only the wiring of "is destination on this sheet → stub vs. line" and the line-drawing itself.
- No graph routing problem to solve in general — only point-to-point lines between two explicitly chosen, currently-resolved port positions.
- The domain model (`Device`, `Port`, `Cable`, `Endpoint`, the chain-walking logic in `connections.ts`) is untouched. This is purely a presentation layer.

## 4. Proposed Data Model

A new top-level entity, `Sheet`, added as a sibling array on `ProjectRoot` — same pattern as `Rack` or `Location`: it references devices by ID and never owns them.

```ts
interface Sheet {
  id: string;
  name: string;                  // e.g. "Control-1", "Peripheral 1 VTR+FS"
  description?: string;
  deviceRefs: SheetDeviceRef[];
  annotations: SheetAnnotation[];
  lineVisibility: SheetLineVisibility[];
  linePaths: SheetLinePath[];
}

interface SheetDeviceRef {
  deviceId: string;
  x: number;
  y: number;
  customLabel?: string;          // optional per-sheet display override, e.g. shorten "Yamaha PM-7" to "MIX 1"
}

interface SheetAnnotation {
  id: string;
  kind: 'text' | 'rect' | 'group-label';   // freeform text boxes, grouping borders (e.g. the red rounded-rect "FAST SERVER" boundary seen in references)
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
}
```

### 4.1 Line visibility vs. line path — a critical separation

Earlier in this discussion, a single `manualLines: { fromPortId, toPortId }` object was proposed and then correctly rejected: storing the *connection* itself in the sheet would go stale the moment the user re-patches a crosspoint, since the stored pair would no longer reflect the live data. The fix is to separate two concerns:

**Visibility** — "should this port's connection be drawn as a line on this sheet, instead of a stub?" This is the only thing that needs to be a stable, user-set flag, and it is keyed by port, not by a from/to pair:

```ts
interface SheetLineVisibility {
  portId: string;
}
```

**Path** — "given that a line is being drawn between two *live-resolved* points, how should it bend?" This is purely cosmetic geometry and never asserts a connectivity fact, so it's safe to store:

```ts
interface SheetLinePath {
  portId: string;                          // matches the visible port
  waypoints?: { x: number; y: number }[];  // optional user-dragged bend points
  style?: 'straight' | 'elbow';
}
```

### 4.2 Render-time resolution (every render, never cached)

For each port belonging to a device placed on the sheet:

1. Resolve its current connection via the existing `describePortConnection` (and the existing TB chain-walking logic) — this is the same call `DeviceWorkspace` already makes.
2. If the port has **no** `SheetLineVisibility` entry → render as a stub/label, exactly like the reference sheets (arrow + destination device/port text), reusing the existing label/cable-number badge rendering.
3. If the port **has** a `SheetLineVisibility` entry:
   - If the resolved destination device is **not** on this sheet → render as a stub anyway (visibility flag is inert/ignored until the destination is added to the sheet).
   - If the resolved destination device **is** on this sheet → draw a real line to that destination port's *current* anchor position, using `SheetLinePath` waypoints if present, otherwise a default straight/lightly-curved path.

Because nothing about the connection itself is stored — only the display preference and cosmetic geometry — a crosspoint change is always reflected correctly: the line (or stub) simply follows the live data on the next render. There is no code path by which the canvas can show a connection that isn't currently true.

### 4.3 Decided behavior: clearing visibility when a line can no longer render

If a device is removed from a sheet (or a crosspoint changes such that the destination device is no longer on the sheet), the corresponding `SheetLineVisibility` entry is **deleted**, not left inert. This was an open question during discussion; the resolved decision is to actively clear it:

- Rationale: a sheet should never carry invisible state that could re-surface unexpectedly later. Re-enabling "show as line" after re-adding a device is a single click, so the cost of clearing is low, and it keeps the sheet's stored state always consistent with what's visibly true.
- Corresponding `SheetLinePath` entries should be cleared at the same time, since a path with no visible line is meaningless.

## 5. Interaction Model (sketch, not finalized)

- **Add device to sheet**: pick from existing devices, place at a default or dragged position (reusing existing `deviceDrag.ts`).
- **Default port rendering**: every port is a stub/label by default — no setup required, matches reference-sheet convention.
- **Promote a port to a line**: user clicks a port's stub; if the live-resolved destination device is also on the sheet, offer "show as line" (writes one `SheetLineVisibility` row); otherwise this option is unavailable (nothing to connect to on this sheet).
- **Adjust line path**: once a line is shown, allow dragging a midpoint/waypoint (writes/updates `SheetLinePath`).
- **Freeform annotation tools**: simple text boxes and grouping rectangles (no routing/graph logic involved — straightforward canvas primitives).

## 6. What Is Explicitly Reused vs. New

**Reused as-is:**
- `describePortConnection` and the TB chain-walking logic in `connections.ts` — same source of truth for what's connected to what.
- `CrosspointPicker` for the underlying connect/patch interaction.
- Visual language for cable number badges, TB markers, port anchors — same components, repositioned by x/y instead of CSS Grid row.
- `CanvasViewport` (zoom/pan shell) and `deviceDrag.ts` (drag positioning).

**New work required:**
- `Sheet` entity and its CRUD (add/remove device, position, annotations).
- Stub/label rendering pointed at arbitrary text instead of the current fixed-column layout (small extension of existing rendering).
- Point-to-point line rendering between two arbitrary on-canvas anchors (SVG overlay), with optional waypoint editing.
- The on-sheet/off-sheet check that decides stub vs. line eligibility per port.

## 7. Explicitly Out of Scope / Deferred

- General graph auto-layout or auto-routing (e.g. collision-avoiding pathfinding) — not needed given the stub-by-default convention.
- Automatic line bundling for parallel multi-port runs — examined and rejected; reference material does not use this convention even at high port density.
- Any change to the underlying domain model's connectivity representation (`Endpoint`, `Cable`) — not required by this feature.
- Visio/SVG/PDF export of sheets — a separate, later concern; this document only covers the in-app sheet/canvas concept.

## 8. Open Questions (acknowledged, not resolved here)

- How are `customLabel` overrides and `group-label` annotations meant to interact with multi-sheet reuse of the same device (e.g. should renaming on one sheet ever affect another)?
- Should there be a limit or warning on how many devices/lines a single sheet can hold before it becomes the kind of unreadable mega-canvas this whole approach is meant to avoid?
- What's the default/auto-placement behavior when a device is first added to a sheet (cluster by location? simple grid? last-used position?)?
- Should `SheetLinePath` waypoints be clamped/reflowed automatically when a device is repositioned, or left for the user to fix manually (consistent with treating path data as purely cosmetic)?
- Multi-sheet export (Visio/PDF) packaging — not addressed here at all.

---

*This document reflects a design conversation only. No code has been written against this concept yet.*
