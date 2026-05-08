# StudioWire IO

StudioWire IO is a local broadcast engineering project editor. It manages structured project data for settings, locations, racks, devices, port groups, generated ports, planned cable numbers, validation, and JSON import/export.

This repository contains the v0.1.3 React, TypeScript, Vite, and plain CSS MVP. It runs entirely in the browser with local autosave and JSON import/export.

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

## Versioning Rule

StudioWire IO uses versioned Codex changes.

- Every Codex implementation/change prompt must specify a new app version.
- Every Codex implementation/change must bump the app version using valid npm SemVer, such as `0.1.3`, `0.1.4`, `0.2.0`, or `0.2.1`.
- Do not use invalid npm/package.json versions such as `0.1.3.1`.
- Every version bump must update `package.json`, `package-lock.json` when present or affected, `CHANGELOG.md`, and this README Version Changelog section.
- Each prompt normally corresponds to one final versioned commit, made manually by the user.

## Manual Commit Review Workflow

Normal StudioWire IO review uses a master-only commit-SHA workflow.

- Work happens directly on `master`.
- Codex edits files and runs validation, but does not commit, push, tag, create branches, or generate review bundles.
- The user manually commits and pushes after Codex finishes.
- GPT-5.5 Pro reviews after the pushed commit using a GitHub compare URL or explicit commit SHAs.
- Compare URL format: `https://github.com/maxiboom1/StudioWire_IO/compare/<BASE_SHA>..<AFTER_SHA>`.
- If review finds a problem, the fix is made as the next versioned commit.
- Do not rewrite public history, force-push, or rebase public `master`.

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

## Version Changelog

- `v0.1.3`: Workflow/docs cleanup release; removed review-bundle workflow/tooling, adopted the master-only commit-SHA review workflow, and documented mandatory version/changelog rules.
- `v0.1.2`: Tightened PortGroup planned-cable versus no-planned-cables rules, improved Add Device disabled-numbering behavior, added line-ending hygiene, and strengthened review bundle exclusions.
- `v0.1.1`: Stabilized the v0.1 model with canonical planned cable helpers, stronger validation, sample ledger fixes, review bundle tooling, and cleaner app structure.
- `v0.1.0`: Initial browser-only MVP with project settings, locations, racks, devices, port groups, generated ports, planned cable ledgers, validation, and JSON import/export.
