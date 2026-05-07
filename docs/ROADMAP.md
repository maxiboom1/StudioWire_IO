# StudioWire IO Roadmap

## v0.1

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

## v0.2

Terminal blocks, rear/front TB, connections, prewire export.

Scope:

- Terminal block data model.
- Rear and front terminal block faces.
- Device-to-TB connection modeling.
- Terminal block port validation.
- Prewire export.

v0.2 should start by extending the data model and validators before adding drawing or export features.

## v0.3

Codex package export, drawing tools, Visio/SVG/PDF generation.

Scope:

- Export packages for Codex-driven workflows.
- Drawing generation tools.
- Visio generation.
- SVG generation.
- PDF generation.
- Excel and Bartender exports after the connection model is stable.

## v0.4

Auth, database, multi-user.

Scope:

- Authentication.
- Database-backed storage.
- Multi-user collaboration.
