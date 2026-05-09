# StudioWire IO

StudioWire IO is a local broadcast engineering project editor. It manages structured project data for settings, locations, racks, devices, port groups, generated ports, planned cable numbers, validation, and JSON import/export.

This repository contains the v0.1.5 React, TypeScript, Vite, and plain CSS MVP. It runs entirely in the browser with local autosave and JSON import/export.

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
- Every Codex implementation/change must bump the app version using valid npm SemVer, such as `0.1.5`, `0.1.6`, `0.1.7`, `0.2.0`, `0.2.1`, or `0.3.0`.
- Do not use invalid npm/package.json versions such as `0.1.3.1`.
- Every version bump must update `package.json`, `package-lock.json` when present or affected, `CHANGELOG.md`, and this README Version Changelog section.
- Each prompt normally corresponds to one final user-published version.
- GPT-5.5 Pro reviews only after the user says `version published`.

## Manual Publish Review Workflow

Normal StudioWire IO review uses a simplified master workflow controlled by the user.

- Work happens directly on `master`.
- Codex does not use Git.
- Codex edits files, updates required docs/version/changelog entries, and runs non-Git validation commands only.
- The user manually commits and publishes after Codex finishes.
- After publishing, the user tells GPT-5.5 Pro: `version published`.
- GPT-5.5 Pro finds the latest pushed `master` diff by itself.
- The user does not normally need to provide SHAs, compare URLs, branches, tags, or review bundles.
- If review finds a problem, the fix is made as the next versioned change.
- Public history is not rewritten.

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

- `v0.1.5`: Repaired Markdown formatting for the workflow and versioning documentation without changing product behavior.
- `v0.1.4`: Simplified the workflow docs so Codex performs no Git operations, the user manually publishes, and GPT-5.5 Pro reviews the latest pushed master diff after the user says `version published`.
- `v0.1.3`: Workflow/docs cleanup release; removed review-bundle workflow/tooling, adopted the master-only commit-SHA review workflow, and documented mandatory version/changelog rules.
- `v0.1.2`: Tightened PortGroup planned-cable versus no-planned-cables rules, improved Add Device disabled-numbering behavior, added line-ending hygiene, and strengthened review bundle exclusions.
- `v0.1.1`: Stabilized the v0.1 model with canonical planned cable helpers, stronger validation, sample ledger fixes, review bundle tooling, and cleaner app structure.
- `v0.1.0`: Initial browser-only MVP with project settings, locations, racks, devices, port groups, generated ports, planned cable ledgers, validation, and JSON import/export.
