# StudioWire IO Roadmap

## v0.1.0.0

Project/settings/location/rack/device/port groups/cable ledger/import-export/validation.

Scope:

- Local React application.
- Structured project data as source of truth.
- Project settings.
- Locations.
- Racks.
- Devices.
- Port groups and generated ports.
- Cable numbering ledger.
- JSON import and export.
- Validation.
- Guarded delete/retire behavior.

Historical schema identifier `0.1.0` remains supported for import compatibility.

## v0.2.0.0

Terminal blocks, rear/front TB faces, connection modeling, and stabilization only.

Scope:

- Terminal block data model.
- Rear and front terminal block faces.
- Device-to-TB and TB front-to-front connection modeling.
- Terminal block port validation.
- Import, storage, recovery, documentation, and quality-gate stabilization.

Prewire export is not a `0.2.0.0` deliverable. The current app continues to state that prewire export is unsupported.

## v0.3.0.0

Future export and drawing-document work.

Scope:

- Prewire/export package design.
- Drawing generation tools.
- Visio generation.
- SVG generation.
- PDF generation.
- Excel and Bartender exports after the connection model is stable.

## v0.4.0.0

Auth, database, multi-user.

Scope:

- Authentication.
- Database-backed storage.
- Multi-user collaboration.
