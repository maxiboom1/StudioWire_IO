# Changelog

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
