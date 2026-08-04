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

Historical internal schemas before `0.2.8.25` are no longer maintained import baselines. Version `0.2.8.25` is the retained compatibility baseline for the additive View model.

## v0.2.0.0

Complete. Terminal blocks, rear/front TB faces, connection modeling, data safety, validation, local persistence, and release hardening only.

Scope:

- Terminal block data model.
- Rear and front terminal block faces.
- Device-to-TB and TB front-to-front connection modeling.
- Terminal block port validation.
- Cable register and validation.
- Guarded retirement.
- Safe JSON import/export and legacy migration.
- Resilient local browser persistence.
- Import, storage, recovery, documentation, acceptance, and quality-gate stabilization.

Prewire export is not a `0.2.0.0` deliverable and is not required to close v0.2. The current app continues to state that prewire export is unsupported.

## v0.2.9.x

Project-level View authoring remains presentation-only and does not change the engineering model.

Staged scope:

- `0.2.9.00` complete: persistent View types and JSON Schema, A4/A3 millimetre geometry, pure View operations, reducer/context commands, relational validation, source-deletion cleanup, normal autosave/export persistence, and retained `0.2.8.25` migration compatibility.
- `0.2.9.01` planned: flat Views navigation, CRUD, View selection/inspector metadata, and the page workspace shell.
- `0.2.9.02` planned: live device, terminal-block, and rack placement and compact technical rendering.
- `0.2.9.03` planned: neutral labeled lines, route editing, text headings, and visual group rectangles.
- `0.2.9.04` planned: View-local undo/redo, accessibility and lifecycle hardening, sample content, and final editor acceptance.

View printing, title blocks, PDF/SVG generation, and document export remain v0.3 work.

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
