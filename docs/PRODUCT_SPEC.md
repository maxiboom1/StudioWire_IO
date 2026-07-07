# StudioWire IO Product Spec v0.2.8.16

StudioWire IO v0.2.8.16 is the current v0.2 local, frontend-only broadcast engineering project editor. The application edits structured project data and validates that data before it is saved or exported as JSON.

Drawings, spreadsheets, and CAD artifacts are not source documents. They are generated views or future v0.3.0.0 exports of the project data.

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

Selecting an item in the tree opens it in the center workspace and exposes editable fields in the right inspector.

The Locations section includes an Add Location action. Each location branch includes Add Rack, Add Device, Add Folder, and Add TB actions. Racks, devices, and terminal blocks can be dragged between folders or back to the parent location when the move is valid.

### Center Workspace

The center workspace is the main editing area. It presents the currently selected project object in a focused view:

- Project dashboard summary.
- Settings editor.
- Location summary.
- Rack layout summary.
- Canvas-first rack, device, terminal-block, cable, and project views over structured project data.

The workspace should prefer structured tables, forms, and generated technical views over freeform drawing source documents.

### Right Inspector

The right inspector edits properties for the selected object. It should show only fields that belong to the selected object type in the current data model.

Examples:

- Project metadata and settings.
- Location name, type, and description.
- Location folder list, including add, edit, and delete actions.
- Rack name, height, numbering direction, assigned device list, and standard-device rack unassign controls.
- Device name, code, manufacturer, model, role, notes, location, folder, rack placement, and rack units.
- Locked cable range note for device port groups.

The inspector includes guarded deletion actions. Locations and racks are only deleted when no child objects reference them. Standard devices can be deleted; deletion removes device-owned ports, port groups, planned cables, rack placement, connections, and owned allocated cable-number ranges so released cable numbers may be reused. Reserved gaps remain unavailable.

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

Connector icons are fixed CSS-drawn in-app symbols selected by `iconKey`; users do not upload connector images or provide SVG/path assets. Category colors are editable hex values and may be overridden per I/O interface for drawing presentation.

## Locations

Locations represent physical places such as rooms, control rooms, machine rooms, studios, or equipment areas.

Each location has a stable ID, display name, type, and description. Every device and terminal block must reference a valid location, including virtual and non-rack devices.

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

New racks default to 28 RU. Existing rack records keep their stored height.

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

Add/Edit Device uses General and I/O tabs. General exposes Device Label, Device sub-label, Manufacturer, Device Model, Category, Location, and Folder. Label Prefix, Role, Notes, and edit rack height are not shown in Add/Edit Device.

Normal devices can be edited after creation. Existing I/O interface count, direction, connector, prefix, planned-cable mode, and cable range stay locked; users may edit interface names and label patterns, and may append new I/O interfaces with the same allocation rules used during creation.

Rack-mounted standard devices can be unassigned from their rack without deleting the device. This clears rack assignment and RU placement, preserves mount height, and keeps the device in the rack's location. Terminal blocks are not unassigned through this workflow.

As of v0.2.5.1, terminal blocks are modeled as a device kind with fixed 1RU rack placement, rear/front port faces, optional planned cable numbers on FRONT ports only, and connection-chain drawing through rear/front connector pairs.

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

New I/O interfaces default to `{NAME}-{000}` label patterns. `{NAME}` resolves to the current interface name; `{DEVICE}` remains supported for existing project data and resolves to the device label prefix.

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

The current app intentionally excludes prewire export, Excel export, Bartender export, Visio export, authentication, and backend/database storage. Browser autosave is local only; startup recovery tries the active autosave key and known legacy keys, and autosave failure leaves the in-memory project exportable.
