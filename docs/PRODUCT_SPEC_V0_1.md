# StudioWire IO Product Spec v0.1

StudioWire IO v0.1 is a local, frontend-only broadcast engineering project editor. The application edits structured project data and validates that data before it is saved or exported as JSON.

Drawings, spreadsheets, and CAD artifacts are not source documents in v0.1. They are future generated views of the project data.

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

The navbar must not contain authentication, workspace switching, cloud sync, or multi-user controls in v0.1.

### Left Tree

The left tree is the primary project navigator. It shows the hierarchy of:

- Project settings.
- Locations.
- Racks within locations.
- Devices within locations.
- Unassigned devices.

Selecting an item in the tree opens it in the center workspace and exposes editable fields in the right inspector.

The Locations section includes an Add Location action. Each location branch includes Add Rack and Add Device actions. Right-click on the Locations section or a location branch may open the practical add flow where supported by the browser.

### Center Workspace

The center workspace is the main editing area. It presents the currently selected project object in a focused view:

- Project dashboard summary.
- Settings editor.
- Location summary.
- Rack layout summary.
- DeviceCanvas placeholder with generated ports and planned cable numbers.

The workspace should prefer structured tables and forms over freeform drawing surfaces in v0.1.

### Right Inspector

The right inspector edits properties for the selected object. It should show only fields that belong to the selected object type in the v0.1 data model.

Examples:

- Project metadata and settings.
- Location name, type, and description.
- Rack name, height, numbering direction, and assigned device list.
- Device name, code, manufacturer, model, role, notes, location, rack placement, and rack units.
- Locked cable range note for device port groups.

The inspector includes guarded deletion actions. Locations and racks are only deleted when no child objects reference them. Devices are retired instead of physically deleted so cable numbers are not freed.

The inspector must not invent fields that are not documented in `DATA_MODEL_V0_1.md`.

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
- Connector types.
- Cable prefixes.
- Cable numbering ranges.
- Numbering ledger behavior.

Settings are part of project data and must be included in JSON import/export.

## Locations

Locations represent physical places such as rooms, control rooms, machine rooms, studios, or equipment areas.

Each location has a stable ID, display name, type, and description. Devices should reference a valid location unless they are virtual.

## Racks

Racks belong to locations and define physical rack capacity.

Each rack has:

- Stable ID.
- Location ID.
- Name.
- Rack height in rack units.
- Numbering direction.

Rack placement validation checks device rack positions against rack height and detects rack unit overlap.

## Devices

Devices represent project equipment. A device may be assigned to a location directly or placed in a rack.

Each device has:

- Stable ID.
- Name.
- Category ID.
- Optional location ID.
- Optional rack ID.
- Optional rack start unit.
- Optional rack unit height.
- Status.
- Optional notes.

Device creation can generate port groups, ports, planned cables, and ledger allocations in one workflow.

v0.1 does not model terminal blocks, rear/front terminal block faces, or physical connection chains.

## Port Groups

Port groups define repeated ports on a device. A port group generates individual `Port` records using a count and naming pattern.

Each port group has:

- Stable ID.
- Device ID.
- Name.
- Direction.
- Category ID.
- Connector type ID.
- Count.
- Naming pattern.
- Cable prefix.
- First and last cable numbers.
- Numbering range ID.
- Planned cable creation flag.
- Locked state.

Generated ports must match the declared count.

## Cable Numbering

Cable numbering is planned through project data, not inferred from drawings.

The numbering model includes:

- Cable prefixes such as video, audio, network, or control.
- Numbering ranges per prefix.
- A numbering ledger for allocated, skipped, and reserved numbers.
- Cable records that reference a unique cable number.

Cable numbers must be unique per project. Skipped gaps are reserved and cannot be reused.

v0.1 tracks planned cable numbers and validation, but does not model complete connection paths or export prewire documents.

## Explicit Exclusions

v0.1 intentionally excludes terminal blocks, device-to-TB connections, prewire export, Excel export, Bartender export, Visio export, authentication, and backend/database storage.
