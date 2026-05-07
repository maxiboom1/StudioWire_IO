# StudioWire IO

StudioWire IO is a local broadcast engineering project editor. It manages structured project data for settings, locations, racks, devices, port groups, generated ports, planned cable numbers, validation, and JSON import/export.

This repository contains the v0.1 React, TypeScript, Vite, and plain CSS MVP. It runs entirely in the browser with local autosave and JSON import/export.

## Install

```bash
npm install
```

## Run the Dev Server

```bash
npm run dev
```

Vite will print a local URL, typically `http://localhost:5173/`.

## Build

```bash
npm run build
```

## Test And Validate

```bash
npm test
npm run validate:project -- samples/sample-project.studiowire.json
npm run summary -- samples/sample-project.studiowire.json
```

## v0.1 Supports

- Browser-only project editing with localStorage autosave.
- Project settings for project info, categories, connector types, and cable prefixes.
- Location and rack creation, editing, and guarded deletion.
- Device creation, simple device editing, and retirement.
- Port group definitions during device creation.
- Generated port records and planned cable records.
- Planned cable numbering with project numbering ledgers.
- Reserved cable number gaps that require confirmation and cannot be reused.
- Validation in the UI and from CLI tools.
- Stable JSON import and export using schema version `0.1.0`.

## v0.1 Intentionally Does Not Support

- Terminal blocks.
- Device-to-TB connections.
- Prewire export.
- Excel export.
- Bartender export.
- Visio export.
- Authentication or user accounts.
- Backend services or database storage.
- Multi-user collaboration.

## Screenshots

Screenshots are intentionally not committed yet. For review, run the dev server and capture:

- `docs/screenshots/app-shell.png`: main editor shell with project tree, workspace, inspector, and validation panel.
- `docs/screenshots/add-device-modal.png`: Add Device modal showing port groups and cable numbering preview.
- `docs/screenshots/validation-panel.png`: validation panel after running Validate.

Recommended capture flow:

```bash
npm run dev
```

Open the Vite URL, usually `http://localhost:5173/`, load the sample project, and use the browser screenshot tool.

See `docs/ROADMAP.md` for planned version boundaries.
