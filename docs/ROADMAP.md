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
- `0.2.9.01` complete: flat location-independent Views navigation, CRUD and selection, validation-issue routing, buffered View Inspector metadata/page settings, guarded populated format changes, and the exact A3/A4 page workspace shell with grid and viewport controls.
- `0.2.9.02` complete: searchable and navigator-drop placement, deterministic page geometry, selection/move/label controls, placement Inspector, live device/TB connection summaries, read-only rack elevations, and missing/out-of-page diagnostics.
- `0.2.9.02-fix1` complete maintenance pass: standard View devices reuse the Device Workspace technical diagram presentation at View scale, and navigator device drops are explicitly surfaced and interaction-tested. The project schema remains `0.2.9.02`.
- `0.2.9.02-fix-2` complete maintenance pass: standard-device diagrams use one uniform source-to-View scale so every connector remains aligned, and the current editor is move-only with no resize handle or Scale field. Persisted scale data remains compatible but is not operator-editable.
- `0.2.9.02-fix-3` complete maintenance pass: an invisible scale-aware virtual grid aligns placement columns and device I/O-row levels while the subtle paper grid remains the only visible guide, and one View-wide 70/80/90/100% Device Size control proportionally updates all device/TB renderers without adding project fields.
- `0.2.9.02-fix-4` complete maintenance pass: the virtual grid uses the same fine I/O-row pitch on both axes; the View header and Inspectors retain only essential controls; placement creation is navigator drag-and-drop only; selected placement emphasis remains stable on hover; and Views/add-View controls align with the navigator and modal layout system.
- `0.2.9.03` complete: neutral labeled orthogonal lines and route editing, text headings, visual Area rectangles stored as `kind: 'group'`, unified single-element canvas selection/Inspectors, and standard-device-attached I/O Range braces with live row anchors and no engineering semantics.
- `0.2.9.04` complete: top-aligned/fixed navigator regions, user-facing Area terminology over the compatible `group` annotation, transient modifier/marquee multi-selection, atomic collective movement/removal, and refined I/O Range presentation.
- `0.2.9.05` complete: standard-device port/I/O Range anchored View lines, covered-row precedence, live endpoint geometry, fixed technical color/width presets, route-constrained label positioning/orientation, missing-endpoint recovery, and reported legacy-line migration.
- `0.2.9.06` complete: transactional 50-entry View-local undo/redo, keyboard/focus/pointer and stale-lifecycle hardening, exact target-format overflow confirmation, illustrative validated sample content, and final first-editor acceptance.
- `0.2.9.07` complete maintenance fix: crosspoint creation and clearing preserve the selected device/TB workspace; only explicit project lifecycle replacement resets navigation and transient editor state.

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
