# Changelog

## v0.3.3

Refactored the selected device canvas from boxed port rows to line-based cable stubs.

### Added

- Added small device-canvas primitives for cable stub lines, endpoint handles, and side-based port columns.
- Added active cable lookup by `device_port` endpoint reference so the canvas can show cables connected through either cable endpoint.
- Added opposite endpoint labels for active cable rows and a clear empty line state for unplanned ports.
- Added a warning/stacked state when multiple active cables reference the same device port.

### Changed

- Moved the selected device canvas toward engineering-style horizontal cable lines while preserving the central device body.
- Kept project schema version unchanged and did not mutate cable endpoints, retire cables, merge cables, add crosspointing, or add terminal block UI.

## v0.3.2

Added the terminal block cable-domain foundation before terminal block UI work.

### Added

- Added terminal block cable helpers for deterministic rear/front port labels and generated TB face ports.
- Added planned TB cable stub generation for `plannedCableMode` values `none`, `rear`, `front`, and `both`.
- Added atomic ledger allocation for TB planned cables, including separate rear and front range calls for `both`.
- Added endpoint display resolution for `device_port` and `tb_port` endpoints.
- Added helpers for active versus retired cable endpoint usage so retired cables do not count as active occupancy.

### Changed

- Kept project schema version at `0.2.0`; no JSON shape change was required.
- Preserved the physical cable segment model and did not add terminal block UI, drag/drop, crosspointing, or logical connection objects.

## v0.3.1

Added the terminal block schema and data-model foundation.

### Added

- Added terminal block, terminal block port group, and rear/front terminal block port arrays to the project root.
- Added terminal block TypeScript types, project factory helpers, sample terminal block data, and matching JSON Schema definitions.
- Added import normalization so legacy `0.1.0` projects receive empty terminal block arrays and load as schema version `0.2.0`.
- Added validators for terminal block references, duplicate TB face/position ports, and `tb_port` cable endpoint references.

### Changed

- Bumped project `schemaVersion` to `0.2.0` because the ProjectRoot shape now includes terminal block arrays.
- Added the shared `ObjectStatus` type for devices and terminal blocks.
- Preserved the physical cable segment model and did not add terminal block UI, crosspointing, or logical connection objects.

## v0.2.2.7

Cleaned up rack placement ownership after the v0.2.2 rack-canvas milestone.

### Changed

- Removed manual rack assignment and bottom-RU editing from the device inspector so rack placement is controlled by the rack canvas drag/drop workflow.
- Kept mount height editable as device metadata required before a device can be placed on a rack.
- Hardened normal device updates so they preserve rack placement fields and keep rack-mounted device location derived from the assigned rack.
- Replaced stale rack-canvas read-only copy with accurate drag/drop guidance.

## v0.2.2.6

Improved rack placement validation feedback on the rack canvas and inspector.

### Added

- Added shared rack placement diagnostics for missing rack references, invalid rack size/bottom RU, below-RU placement, above-height placement, rack location mismatch, and rack RU overlap.
- Surfaced rack placement diagnostics as compact rack canvas warnings and rack inspector placement issue lists.
- Marked overlapping or location-mismatched mounted device blocks with warning treatment while keeping valid rack views clean.

### Changed

- Preserved drag/drop assignment and repositioning behavior while using the same placement checks for clearer feedback.
- Preserved project schema version, project JSON shape, import/export behavior, and terminal-block boundaries.

## v0.2.2.5

Added tree-to-rack drag assignment for existing devices.

### Added

- Made device rows in the navigator draggable to visible rack canvases.
- Supported assigning eligible virtual, unassigned, and non-mounted devices to empty rack RU ranges.
- Reused rack placement validation for tree-to-rack assignment, invalid occupied drops, out-of-capacity drops, and missing rack-size rejection.

### Changed

- Successful tree-to-rack assignment updates only existing placement fields and preserves device identity, ports, port groups, cables, and code.
- Preserved mounted-device repositioning, canvas zoom/pan behavior, project schema version, and import/export semantics.

## v0.2.2.4

Added mounted-device drag repositioning on the rack canvas.

### Added

- Made existing mounted device blocks draggable within the rack canvas.
- Added same-rack and visible multi-rack drops onto valid empty RU ranges.
- Added drop preview highlighting and invalid-drop messaging for occupied or out-of-capacity targets.

### Changed

- Device moves update only existing placement fields: rack, location, and bottom RU while preserving device identity, rack size, ports, port groups, cables, and code.
- Preserved project schema version, import/export semantics, and terminal-block boundaries.

## v0.2.2.3

Added reusable app-level canvas zoom and pan behavior to the read-only rack canvas.

### Added

- Added a reusable canvas viewport with zoom out, zoom percentage, zoom in, reset, and explicit pan-mode controls.
- Applied the viewport to the multi-rack canvas so viewed racks can be zoomed and navigated without changing browser zoom.

### Changed

- Kept rack canvas behavior read-only and preserved project JSON, schema version, reducer behavior, validation behavior, and import/export semantics.

## v0.2.2.2

Added a read-only multi-rack canvas view using local UI state only.

### Added

- Added a rack-view selector in the rack workspace for viewing up to four racks concurrently.
- Added duplicate prevention, remove controls for extra viewed racks, and a clear max-four limit message.

### Changed

- Reused the existing rack elevation renderer for each visible rack without changing project JSON, schema version, reducer behavior, validation behavior, or import/export semantics.

## v0.2.2.1

Added the first read-only rack canvas/elevation view using existing rack and device placement data.

### Added

- Rendered a full selected-rack RU stack in the main workspace with stable RU labels, explicit blank filler rows, and mounted device blocks spanning their existing RU range.
- Added defensive visual warnings for invalid rack placement data without mutating project data.

### Changed

- Updated generated artifact hygiene to ignore and remove `.playwright-cli/` browser console logs.
- Preserved project JSON schema version, validation behavior, reducer behavior, import/export semantics, and all v0.2.2 terminal-block boundaries.

## v0.2.1.7

Continued the 0.2.1 UI-polish stage with focused navigator, device workspace, and Add Device workflow fixes.

### Changed

- Fixed generated artifact hygiene by adding the missing `output/` ignore pattern and keeping generated browser/test artifacts out of the source tree.
- Added persistent navigator Add Location access from the Project Navigator context menu and the Unassigned Devices context menu.
- Simplified the main device workspace by removing large metadata/statistics cards and leaving the canvas focused on the device/port diagram.
- Simplified Add Device creation to user-facing basics, with new devices created as virtual and compatibility `Device.code` generated internally from label prefix or name.
- Compacted port group creation with a two-row layout, planned cable toggle, read-only range preview, and automatic preview range recalculation.
- Refined the Add Device I/O interface form with manual cable range fields when planned cables are off and moved bidirectional device-canvas groups into the side interface layout instead of the bottom band.
- Polished I/O interface cards with a top-right remove icon, a compact AUTO toggle, and always-visible first/last cable fields that become read-only in automatic mode.

## v0.2.1.6

Completed the 0.2.1 shadcn/ui polish sequence with a controlled consistency pass.

### Changed

- Standardized destructive inspector actions on the shared shadcn-style button variant.
- Added clearer active navigation semantics for selected sidebar rows.
- Consolidated obsolete custom CSS left behind by earlier shell, modal, status, and danger-button implementations.
- Preserved app shell, sidebar, workspace, dialogs, validation display, and project data behavior.

## v0.2.1.5

Continued the shadcn/ui polish stage for main workspace and detail surfaces.

### Added

- Added a shadcn-style table primitive for compact workspace and inspector data.

### Changed

- Migrated project, location, rack, and device detail views toward shadcn-style cards, badges, alerts, and tables.
- Improved right inspector structure with card-based sections and shadcn-style controls where practical.
- Polished the compact validation footer with badge-based severity counts and issue actions.
- Preserved sidebar navigation, project/global actions, import/export, validation behavior, and project data semantics.

## v0.2.1.4

Continued the shadcn/ui migration for the 0.2.1 UI-polish stage.

### Added

- Added shadcn-style dialog, input, label, textarea, select, alert, and card primitives.

### Changed

- Migrated the add location, add rack, and add device modal flows to shadcn Dialog.
- Migrated touched dialog buttons, inputs, labels, selects, and validation message surfaces toward shadcn-style components.
- Preserved the shadcn Sidebar navigator, project actions dropdown, right-click context menus, and existing project behavior.
- Removed obsolete custom modal CSS that was replaced by Dialog-based components.

## v0.2.1.3

Began the shadcn/ui migration for the 0.2.1 UI-polish stage.

### Added

- Added the shadcn/ui component foundation, including sidebar, menu, context menu, collapsible, button, badge, separator, and tooltip primitives.
- Added the shared `cn` utility and shadcn component configuration.

### Changed

- Replaced the custom left navigation shell with a shadcn Sidebar-based project navigator.
- Moved global project/app actions into the sidebar header project menu.
- Kept locations as direct top-level navigator rows, with racks/devices nested under each location and Unassigned Devices as the final top-level member.
- Simplified the top bar so it no longer duplicates global project actions.
- Started reducing obsolete custom tree CSS while preserving existing workspace behavior.

## v0.2.1.2

Continued the 0.2.1 UI-polish stage.

### Changed

- Simplified the left navigator so locations are the first visible tree rows instead of nesting under project and locations folders.
- Kept Unassigned Devices as the final tree member.
- Added an empty-project navigator prompt for creating a location or unassigned device by right-clicking.
- Kept project summary access on the project name in the top navbar.

## v0.2.1.1

Continued the 0.2.1 UI-polish stage.

### Added

- Collapsible folder-style project navigator with project, locations, racks, devices, and unassigned device branches.
- Right-click context menus for creating locations, racks, and devices from supported tree rows.
- Documentation for internal `0.2.1.x` UI-polish substep versions.

### Changed

- Removed small inline add buttons from the left navigator.
- Updated repository hygiene ignores for generated browser and test artifacts.
- Restored readable Markdown/config/source formatting in workflow and shell files.

## v0.2.1

Start of 0.2 UI polish phase.

### Added

- Tailwind CSS styling foundation with lightweight StudioWire visual tokens.
- New original StudioWire IO SVG logo asset for the app navbar.
- Top-right Settings app menu modal for global project actions.

### Changed

- Compacted the top navbar and bottom validation/footer area.
- Moved New Project, Load Sample, Import JSON, Export JSON, Validate, and Settings actions out of the navbar and into the Settings modal.
- Removed the Settings item from the left navigator.

## v0.1.5

Documentation formatting cleanup release only.

### Changed

- Repaired Markdown formatting for the workflow and versioning documentation.
- Reformatted the review workflow roles into readable role sections.
- Preserved the simplified no-Git Codex workflow, manual user publish step, and `version published` GPT-5.5 Pro review trigger.

## v0.1.4

Workflow/docs correction release only.

### Changed

- Simplified the review workflow so Codex performs no Git operations and only edits files, updates versioned docs, and runs non-Git validation.
- Documented that the user manually publishes and then tells GPT-5.5 Pro `version published`.
- Documented that GPT-5.5 Pro finds the latest pushed `master` diff by itself after publication.
- Clarified that normal review no longer requires user-provided SHAs, compare URLs, branches, tags, or review bundles.

## v0.1.3

Docs and workflow cleanup release only.

### Changed

- Replaced the branch/tag/review-bundle workflow with a master-only commit-SHA review workflow.
- Added and clarified the versioning rule requiring every Codex change to update `package.json`, `package-lock.json` when present or affected, `CHANGELOG.md`, and the root `README.md` Version Changelog section.
- Documented that Codex modifies files only and the user manually commits and pushes before GPT-5.5 Pro review.

### Removed

- Removed review-bundle/diff tooling and active workflow instructions.

## v0.1.2

Small stabilization cleanup before v0.2 planning.

### Added

- PortGroup validation for planned-cable mode versus no-planned-cables mode.
- Reducer coverage for no-planned-cables device creation.
- `.gitattributes` line-ending policy for source, docs, JSON, CSS, and HTML files.
- README version changelog.

### Changed

- Bumped package version to `0.1.2`.
- Normalized PortGroup allocation semantics: when `createPlannedCables` is false, cable-number fields and `numberingRangeId` stay `null`, ports remain unlinked, and no ledger allocation occurs.
- Updated Add Device behavior to clear and disable cable-number fields when planned cable creation is disabled, then restore the next suggested number when re-enabled.
- Strengthened review bundle exclusions for generated artifacts such as TypeScript build info and StudioWire zip exports.
- Updated review workflow docs to prefer diff mode after approved version tags.

## v0.1.1

Stabilization release for v0.1 before v0.2 planning.

### Added

- Canonical planned cable creation module with source/cable/destination label rules.
- Validator coverage for settings names, cable prefix format, rack/device location consistency, port group range references, and planned cable ledger coverage.
- Tests for planned cable labels, stricter cable number parsing, and settings validation rules.
- Review bundle tooling and Vitest exclusion for generated review artifacts.
- Additional ledger and planned-cable consistency validation.

### Changed

- Refactored the monolithic app component into layout, settings, location, rack, device, and common component folders.
- Strengthened import behavior to reject malformed project objects and run validation immediately after import.
- Standardized port label patterns on `{DEVICE}` and `{000}` tokens.
- Updated sample project cable labels to use top/source, middle/cable number, bottom/destination.
- Allowed `Device.locationId` to be `null` for virtual/unassigned handling while keeping rack and non-rack location validation.
- Corrected the sample `V` ledger `nextSuggested` value to account for reserved gaps.
- Made `ADD_DEVICE` reject failed cable allocations without mutating project state.

### Removed

- Removed unused `@playwright/test` dev dependency.

## v0.1.0

Initial review-ready MVP.

### Added

- React, TypeScript, Vite, and plain CSS browser-only app shell.
- Project context and reducer with localStorage autosave.
- JSON import/export for schema version `0.1.0`.
- Project settings editor for project info, categories, connector types, and cable prefixes.
- Location and rack creation, editing, and guarded deletion.
- Device creation workflow with quick port groups, generated ports, planned cables, and cable ledger allocation.
- Cable number engine with reserved gap behavior and Vitest coverage.
- Validation engine shared by the UI and CLI tools.
- Sample project, JSON Schema, product docs, data model docs, validation docs, and roadmap.

### Changed

- Polished the main editor shell, modal styling, empty states, and validation panel presentation.
- Added confirmation before committing skipped cable-number gaps as reserved.
- Device destructive action now retires the device, planned cables, and related ledger ranges instead of freeing cable numbers.

### Not Included In v0.1

- Terminal blocks.
- Device-to-TB connections.
- Prewire export.
- Excel export.
- Bartender export.
- Visio export.
- Authentication.
- Backend or database storage.
