# StudioWire IO

StudioWire IO is a local broadcast engineering project editor. It manages structured project data for settings, locations, racks, devices, port groups, generated ports, planned cable numbers, validation, and JSON import/export.

This repository contains the v0.2.5.2 React, TypeScript, Vite, Tailwind CSS, and shadcn/ui app. It runs entirely in the browser with local autosave and JSON import/export.

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

## UI Stack

- React, TypeScript, and Vite provide the app runtime.
- Tailwind CSS is the styling engine.
- shadcn/ui is the preferred component system for reusable interface primitives.
- Custom CSS is reserved for global tokens, shell/layout glue, app-specific engineering visuals, and small exceptions that are not cleanly covered by shadcn/ui.

## Versioning Rule

StudioWire IO uses versioned Codex changes.

- Every Codex implementation/change prompt must specify a new app version.
- Every Codex implementation/change must bump the app/package version.
- Milestone versions may use normal forms such as `0.2.0`, `0.2.1`, or `0.3.0`.
- Within an active UI-polish or milestone substage, internal app/product versions may use forms such as `0.2.1.1`, `0.2.1.2`, or `0.2.1.3`.
- These are internal app/product versions for this local project; StudioWire IO is not being published to npm as a package.
- Every version bump must update `package.json`, `package-lock.json` when present or affected, `CHANGELOG.md`, and this README Version Changelog section.
- Do not change project `schemaVersion` unless the project JSON data model actually changes.
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
- Terminal block creation as fixed 1RU rack objects with rear/front port faces.
- Port group definitions during device creation.
- Generated port records and planned cable records.
- Crosspoint creation from Device and TB views, including direct device links, device/TB segments, and TB front-to-front patches.
- Planned cable numbering with project numbering ledgers.
- Reserved cable number gaps that require confirmation and cannot be reused.
- Validation in the UI and from CLI tools.
- Stable JSON import and export using schema version `0.2.5.1`, with import normalization for older `0.1.0` and `0.2.4.1` projects.

## v0.1 Intentionally Does Not Support

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

- `v0.2.5.2`: Polished crosspoint drawing affordances with cable-end pickers, valid-target collapsible picker trees, inline terminal-block cable markers, and TB pickers outside the panel border.
- `v0.2.5.1`: Added connection logic and crosspoint UI for direct device links, device/TB links, TB front-to-front patching, lower-number-wins cable selection, connection replacement, and inline chain drawing.
- `v0.2.4.3`: Replaced the Cables placeholder with a shadcn-based project cable register, including endpoint-derived side labels, locations, connectors, statuses, and Excel-style multi-select column filters.
- `v0.2.4.2`: Polished the terminal block panel labels, rack TB block typography, TB inspector fields, and fixed app-shell scrolling so the navbar, sidebars, and footer stay pinned while the workspace scrolls.
- `v0.2.4.1`: Added terminal block creation as a schema-backed device kind, with fixed 1RU rack placement, rear/front ports, optional FRONT planned cable numbers, TB navigator/workspace/inspector UI, and import normalization from schema `0.1.0`.
- `v0.2.3.8`: Forced the sidebar footer and main validation footer to use the same shared height so their top borders align exactly.
- `v0.2.3.7`: Aligned the sidebar footer app/schema version text with the validation footer secondary line and matched its smaller footer typography.
- `v0.2.3.6`: Normalized the footer so app/schema version share one line, validation stays in the center footer, and app notifications own the right footer section without validation badges.
- `v0.2.3.5`: Moved the StudioWire logo to the right inspector-aligned navbar section and left the project name plus gear actions in the left navbar section.
- `v0.2.3.4`: Normalized the app header into a unified navbar, moved project actions to a gear menu, added a top-level Cables placeholder view, and moved status messages to the bottom footer.
- `v0.2.3.3`: Rebuilt the device workspace as a canvas-first technical drawing with line-based cable rows, internal device labels, cable numbers, and port nodes while preserving project data behavior.
- `v0.2.3.2`: Replaced the generated SVG app logo with the provided cropped StudioWire IO PNG wordmark and adjusted the sidebar header to display it cleanly.
- `v0.2.3.1`: Cleaned up the rack canvas into a minimal canvas-first view with working in-canvas zoom controls, horizontal multi-rack layout, full-width device blocks, numeric RU cells, and reduced rack chrome.
- `v0.2.2.7`: Removed manual rack assignment from the device inspector, kept mount height editable for rack canvas drops, and replaced stale rack read-only copy with current drag/drop guidance.
- `v0.2.2.6`: Added rack placement diagnostics on the rack canvas and inspector so invalid mounted-device data is visible without changing project JSON.
- `v0.2.2.5`: Added tree-to-rack drag assignment for eligible existing devices, including unassigned devices, while preserving rack placement validation and existing project fields.
- `v0.2.2.4`: Added mounted-device drag repositioning on the rack canvas with same-rack and visible multi-rack moves, drop previews, and invalid-drop rejection using existing placement fields.
- `v0.2.2.3`: Added reusable app-level canvas zoom controls and scroll/pan viewport behavior to the read-only rack canvas without changing project JSON.
- `v0.2.2.2`: Added a local read-only multi-rack canvas selector so up to four racks can be viewed concurrently without changing project JSON.
- `v0.2.2.1`: Added a read-only rack elevation canvas for selected racks, using existing rack/device placement data with full RU numbering, blank RU fillers, and mounted device spans.
- `v0.2.1.7`: Fixed generated artifact hygiene, restored reliable project creation actions in the navigator, simplified the device workspace for diagram use, and streamlined the Add Device flow with virtual-by-default devices and compact port-group controls.
- `v0.2.1.6`: Completed the 0.2.1 shadcn/ui polish sequence with a consistency, accessibility, repository hygiene, and CSS consolidation pass across the app shell, sidebar, workspace, dialogs, and validation display.
- `v0.2.1.5`: Continued the 0.2.1 shadcn/ui polish stage by migrating workspace/detail panels, summary cards, tables, empty states, and validation display toward shadcn-based UI while preserving data behavior.
- `v0.2.1.4`: Continued the shadcn/ui migration by converting dialogs, menus, and common form controls to shadcn-based components while preserving project behavior and data semantics.
- `v0.2.1.3`: Began the shadcn/ui migration by adding the shadcn component foundation and replacing the custom left navigation shell with a shadcn Sidebar-based project navigator.
- `v0.2.1.2`: Simplified the left navigator so locations are the top-level rows, Unassigned Devices is the final tree member, empty projects prompt creation from the navigator, and project summary remains available from the top project name.
- `v0.2.1.1`: Continued the 0.2.1 UI-polish stage with a collapsible project navigator, right-click creation menus, repository hygiene cleanup, and readable formatting restoration.
- `v0.2.1`: Started the 0.2 UI polish phase with Tailwind styling foundation, a compact navbar/footer, global actions moved into a Settings modal, a new StudioWire IO logo, and the left-nav Settings item removed.
- `v0.1.5`: Repaired Markdown formatting for the workflow and versioning documentation without changing product behavior.
- `v0.1.4`: Simplified the workflow docs so Codex performs no Git operations, the user manually publishes, and GPT-5.5 Pro reviews the latest pushed master diff after the user says `version published`.
- `v0.1.3`: Workflow/docs cleanup release; removed review-bundle workflow/tooling, adopted the master-only commit-SHA review workflow, and documented mandatory version/changelog rules.
- `v0.1.2`: Tightened PortGroup planned-cable versus no-planned-cables rules, improved Add Device disabled-numbering behavior, added line-ending hygiene, and strengthened review bundle exclusions.
- `v0.1.1`: Stabilized the v0.1 model with canonical planned cable helpers, stronger validation, sample ledger fixes, review bundle tooling, and cleaner app structure.
- `v0.1.0`: Initial browser-only MVP with project settings, locations, racks, devices, port groups, generated ports, planned cable ledgers, validation, and JSON import/export.
