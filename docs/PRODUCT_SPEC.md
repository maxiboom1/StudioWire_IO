# StudioWire IO Product Spec v0.2.9.02

StudioWire IO v0.2.9.02 is the current local, frontend-only broadcast engineering project editor. The application edits structured project data and validates that data before it is saved or exported as JSON.

Drawings, spreadsheets, and CAD artifacts are not source documents. They are generated views or future v0.3.0.0 exports of the project data.

Project Views are persistent presentation data inside the normal project JSON, not engineering source records. Version `0.2.9.02` adds live device, terminal-block, and rack placement, movement, display labels, and read-only technical rendering over the existing View model. The `0.2.9.02-fix-2` maintenance UI is move-only and does not expose placement resizing. Manual line/text/group drawing tools remain staged for `0.2.9.03`.

## Application Layout

### Top Navbar

The top navbar provides project-level actions and status:

- StudioWire IO logo/name.
- Current project name.
- New project.
- Load sample project.
- Import JSON.
- Export JSON.
- Validate.
- Settings.
- Current status message.

The navbar must not contain authentication, cloud sync, or multi-user controls in the current local-only release line.

### Left Tree

The left tree is the primary project navigator. It shows the hierarchy of:

- Project settings.
- Locations.
- Folders within locations.
- A flat mixed list of racks, devices, and terminal blocks under each location or folder.
- A separate flat Views section that is independent from Locations and remains visible when no locations exist.

Selecting an item in the tree opens it in the center workspace and exposes editable fields in the right inspector.

The Locations section includes an Add Location action using the standard app modal layout. Each location branch includes Add Rack, Add Device, Add Folder, and Add TB actions. Racks, devices, and terminal blocks can be dragged between folders or back to the parent location when the move is valid. The Views section provides Add View plus per-View Rename and Delete actions without participating in location drag/drop.

### Center Workspace

The center workspace is the main editing area. It presents the currently selected project object in a focused view:

- Project dashboard summary.
- Settings editor.
- Location summary.
- Rack layout summary.
- Canvas-first rack, device, terminal-block, cable, and project views over structured project data.
- A page-bound View workspace with exact A3/A4 portrait or landscape dimensions, a fixed 2.5 mm grid, and zoom, reset, Fit Page, and Fit Width controls.

The workspace should prefer structured tables, forms, and generated technical views over freeform drawing source documents.

### Right Inspector

The right inspector edits properties for the selected object. It should show only fields that belong to the selected object type in the current data model.

Examples:

- Project metadata and settings.
- Location name and description.
- Folder name, description, contained-item counts, and guarded deletion.
- Rack name, height, numbering direction, assigned device list, and standard-device rack unassign controls.
- Device name, code, manufacturer, model, role, notes, location, folder, rack placement, and rack units.
- Locked cable range note for device port groups.
- View ID, name, description, page size, orientation, canvas counts, and guarded deletion. When a View placement is selected, the same Inspector switches to its presentation label, coordinates, fixed-size note, live source context, and source-safe removal.

Object inspectors use one compact, continuous accordion. One parent section is open at a time, nested Device I/O sections may be opened independently, content scrolls within the inspector, and Save/Delete actions remain visible. Dirty inspector navigation is guarded by Save, Discard, and Cancel. Locations, folders, and racks are deleted only when no child objects reference them. Device and TB deletion safely removes owned topology while preserving surviving planned cable slots.

The inspector must not invent fields that are not documented in `DATA_MODEL.md`.

### Bottom Validation Panel

The bottom validation panel shows current validation issues for the project:

- Severity.
- Rule code.
- Human-readable message.
- Affected object ID.

Selecting an issue should navigate to the affected object when possible.

## Project Settings

Project settings define global configuration used by the rest of the project:

- Project info.
- Categories.
- Global connector catalog.
- Category connector assignments.
- Category-scoped connector compatibility groups.
- Cable prefixes.
- Cable numbering ranges.
- Numbering ledger behavior.

Settings are part of project data and must be included in JSON import/export. Imports use staged syntax, schema-version, structural, migration, and relational validation; failed structural imports preserve the open project.

New projects start with the maintained operator settings baseline: VIDEO, Audio, Network, Reference, RF, Control, and AV categories; V, A, N, R, RF, C, and AV cable prefixes; the global broadcast connector catalog including DVI; the documented category assignments; an empty Video connector group; an Audio connector group containing XLR, PL, and RCA; 48 RU racks; and `PREFIX-0001` cable labels with four-digit padding.

Connector icons are fixed CSS-drawn in-app symbols selected by `iconKey`; users do not upload connector images or provide SVG/path assets. Category colors are editable hex values and may be overridden per I/O interface for drawing presentation.

## Locations

Locations represent physical places such as rooms, control rooms, machine rooms, studios, or equipment areas.

Each location has a stable ID, display name, and description. Every device and terminal block must reference a valid location, including virtual and non-rack devices.

Folders are organizational containers inside one location, such as a front table, back table, sound room, CCU/VTR room, or a rack group inside a control room. Racks, devices, and terminal blocks may be assigned to a folder or left directly under the parent location.

## Racks

Racks belong to locations and define physical rack capacity.

Each rack has:

- Stable ID.
- Location ID.
- Folder ID, stored as `subLocationId`, or `null`.
- Name.
- Rack height in rack units.
- Numbering direction.

New racks default to 48 RU. Existing rack records keep their stored height.

Rack placement validation checks device rack positions against rack height and detects rack unit overlap.

## Devices

Devices represent project equipment. A device may be assigned to a location directly or placed in a rack.

Each device has:

- Stable ID.
- Name.
- Category ID.
- Required location ID.
- Optional rack ID.
- Optional rack start unit.
- Optional rack unit height.
- Status.
- Optional notes.

Device creation can generate I/O interfaces, ports, planned cables, and ledger allocations in one workflow.

Add/Edit Device uses General and I/O tabs. General exposes Device Name, Device sub-name, Manufacturer, Device model, Category, Location, Folder, and optional Mount height (RU). Label Prefix, Role, and Notes are not shown in Add/Edit Device.

All I/O interfaces are collapsed by default in Add Device, Clone and Edit, and Edit Device, including interfaces loaded from Device Collection or appended during the current session.

Add Device also includes a Device Collection tab. The bundled collection follows Manufacturer, Category, and Model folders. Selecting a model displays its hardware and ordered I/O summary plus complete compatibility results for the current project. Loading a compatible template replaces the Add Device draft, selects the first project location with no folder, proposes fresh project cable ranges, and returns to General for review. Loading never creates a device directly.

Standard devices can be exported as device-template JSON from the navigator. Export resolves project IDs to semantic names, stores effective interface colors, excludes placement and cable allocation data, and reports the intended `collections/devices` path. Bundled collection additions require an application restart or rebuild.

Standard devices also provide a `Clone and Edit` navigator action. It opens Add Device with the source hardware and ordered I/O definition prefilled, retains the source Location and Folder as editable defaults, clears rack placement and runtime identity, and proposes fresh category-derived cable ranges. The draft still passes through the normal Add Device validation and does not create anything until the operator submits it.

Normal devices can be edited after creation. Existing I/O interface count, direction, connector, prefix, planned-cable mode, and cable range stay locked; users may edit interface names and label patterns, and may append new I/O interfaces with the same allocation rules used during creation.

Rack-mounted standard devices can be unassigned from their rack without deleting the device. This clears rack assignment and RU placement, preserves mount height, and keeps the device in the rack's location. Terminal blocks are not unassigned through this workflow.

Terminal blocks are modeled as a device kind with fixed 1RU rack placement and matching rear/front port faces. TB creation does not create planned cables or reserve cable numbers. A TB front-to-front patch receives a category-default cable number when the connection is made.

## Port Groups

Port groups are presented to users as I/O interfaces. A port group generates individual `Port` records using a count and naming pattern.

Each port group has:

- Stable ID.
- Device ID.
- Name.
- Direction.
- Category ID.
- Connector type ID assigned to the port group category.
- Count.
- Naming pattern.
- Cable prefix.
- First and last cable numbers.
- Numbering range ID.
- Planned cable creation flag.
- Locked state.

Generated ports must match the declared count.

New I/O interfaces default to `{I/O NAME}-{000}` label patterns. `{I/O NAME}` resolves to the parent interface name, and `{NAME}` remains a supported alias for existing patterns. `{DEVICE}` remains available for patterns that intentionally use the device sub-name. Add/Edit Device and Device Inspector label the interface field `I/O Name` so its relationship to the pattern token is explicit.

New Add/Edit Device interfaces derive their cable prefix from the selected category's `defaultCablePrefix`. Existing locked interfaces preserve their stored prefix.

## Project Views

A View is a named A4 or A3 portrait/landscape presentation canvas stored as a sibling collection on the project root. A new View defaults to A3 portrait, uses millimetre coordinates, and contains:

- Live placements referencing an existing standard device, terminal block, or rack by ID.
- Neutral, labeled, orthogonal manual lines between placement boundaries.
- View-only text headings and visual group rectangles.

Views do not copy source devices or racks. They never create, remove, renumber, connect, or disconnect ports or physical cables, and they do not change location hierarchy or rack assignment. Source changes remain live through ID references. Deleting a source removes only its direct View placements and attached View lines; unrelated placements and annotations remain.

View names are trimmed and case-insensitively unique among Views only. Dangling imported source references remain structurally loadable and are relational validation errors. Out-of-page content remains stored and is reported as a warning. Views use the normal project export and local autosave; no separate View file or storage service exists.

The left navigator lists Views in project array order with their page format. Add View defaults to the next available `View N` name and A3 portrait, selects the created View, and opens its page workspace. The View Inspector buffers name/description and format edits; populated page-format changes require confirmation and retain all coordinates. Deleting a View reports placement, line, and annotation counts and does not delete source devices or racks.

Version `0.2.9.02` adds existing objects through a compact searchable picker grouped by Location and Folder or by dropping the existing navigator payload onto the paper. Picker insertion scans deterministically for the first non-overlapping position; direct drop and movement use the 2.5 mm grid unless Alt bypasses snapping. Exact duplicate sources focus their current placement instead of creating another record. Pointer movement uses a local preview and commits once at interaction end; arrow keys nudge and Delete removes only the placement plus attached View lines. The `0.2.9.02-fix-2` editor removes resize gestures and scale editing so placements retain the renderer's fixed proportions.

The `0.2.9.02-fix-2` maintenance UI renders standard-device blocks by uniformly reducing the complete Device Workspace diagram: a centered device body, ordered left/right I/O, connector/color anchors, cable routes and numbers, terminal-block chain markers, remote destination labels, and passive endpoint stubs. Connector internals and row geometry therefore retain exactly the same relative alignment instead of receiving separate compact overrides. The renderer is shared, read-only in a View, and never exposes crosspoint controls.

Terminal blocks use a compact rear/front representation. Rack blocks use the current numbering direction, mounted source names/RU spans, and existing placement diagnostics. These blocks expose no patch, rack-assignment, source drag, or other engineering-data editing controls. Missing imported sources remain selectable and removable placeholders. Placement growth or movement outside the paper is highlighted and reported without scaling or rewriting coordinates. Devices and racks can be dropped from the existing navigator directly onto the View paper; duplicate sources focus the existing placement.

## Cable Numbering

Cable numbering is planned through project data, not inferred from drawings.

The numbering model includes:

- Cable prefixes such as video, audio, network, or control.
- Numbering ranges per prefix.
- A numbering ledger for allocated, skipped, and reserved numbers.
- Cable records that reference a unique cable number.

Cable numbers must be unique per project. Skipped gaps are reserved and cannot be reused.

StudioWire IO v0.2 tracks planned cable numbers, direct device links, device/TB links, TB front-to-front patching, cable register/filtering, standard-device deletion, JSON import/export, resilient local persistence, and validation. Interactive rack, device, and TB views are generated in-app views over project data; they are distinct from future exported drawing documents and prewire packages.

## Explicit Exclusions

The current app intentionally excludes View line/text/group drawing tools, View print/export, prewire export, Excel export, Bartender export, Visio export, authentication, and backend/database storage. Browser autosave is local only; startup recovery tries the active autosave key and known legacy keys, migrates the retained `0.2.8.25` baseline through the `0.2.9.00` and `0.2.9.01` stages, and leaves the in-memory project exportable after autosave failure.
