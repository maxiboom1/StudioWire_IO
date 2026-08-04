# StudioWire IO

StudioWire IO is a local broadcast engineering project editor. It manages structured project data for settings, locations, racks, devices, port groups, generated ports, planned cable numbers, validation, and JSON import/export.

This repository contains the v0.2.8.25 React, TypeScript, Vite, Tailwind CSS, and shadcn/ui app. It runs entirely in the browser with local autosave and JSON import/export.

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

## Quality Gates

- `npm run format` / `npm run format:check`: Prettier formatting.
- `npm run lint`: ESLint over source, tools, config, and E2E tests.
- `npm run typecheck`: TypeScript project check.
- `npm run test:run`: unit and contract tests.
- `npm run coverage`: single-worker V8 coverage with thresholds protecting import, migration, persistence, reducer, connection, and validation modules.
- `npm run check:dev`: normal feature-development validation without release packaging, clean extraction, Playwright install, or mandatory E2E.
- `npm run validate:fixtures`: current, legacy, and invalid fixture contract checks.
- `npm run check:scale`: synthetic multi-thousand-port validation, persistence, export, and import check.
- `npm run version:check`: package/schema/sample/docs/UI version synchronization.
- `npm run test:e2e`: Playwright browser tests.
- `npm run package:source`: create and inspect `.source-package/StudioWire_IO-<version>.zip`.
- `npm run clean` / `npm run clean:check`: remove and verify generated artifact hygiene.

## Test And Validate

```bash
npm run check:dev
npm run validate:project -- docs/samples/sample-project.studiowire.json
npm run summary -- docs/samples/sample-project.studiowire.json
```

`npm run check:dev` is the normal feature-development gate. Use `npm run check`, `npm run check:release`, `npm run check:full`, `npm run test:e2e`, and `npm run package:source` for stabilization, release, or prompt-specific verification. Release packaging and clean-extraction verification are not expected after every UI or product feature, and Playwright E2E is valuable but not required for every visual polish task.

## UI Stack

- React, TypeScript, and Vite provide the app runtime.
- Tailwind CSS is the styling engine.
- shadcn/ui is the preferred component system for reusable interface primitives.
- Custom CSS is reserved for global tokens, shell/layout glue, app-specific engineering visuals, and small exceptions that are not cleanly covered by shadcn/ui.

## Versioning Rule

StudioWire IO uses versioned Codex changes.

- Every Codex implementation/change prompt must specify a new app version.
- Every Codex implementation/change must bump the app/package version and current project schema version together.
- Active and future versions use exactly four numeric components, such as `0.2.7.2` or `0.3.0.0`.
- These are internal app/product versions for this local project; StudioWire IO is not being published to npm as a package.
- Active StudioWire IO versions use four numeric components, and the app version and current `schemaVersion` must always be identical, even for UI-only or documentation releases.
- Every version bump must update `package.json`, `package-lock.json` when present or affected, the TypeScript current-version constant, JSON Schema metadata, generated/sample project data, and this README Version Changelog section.
- Before the first public/released schema, dev-to-dev schema compatibility is not guaranteed. Compatibility is preserved from the first declared released baseline forward.
- Each prompt normally corresponds to one final user-published version.
- GPT-5.5 Pro reviews only after the user says `version published`.

## Review Workflow

StudioWire IO review is controlled by the user and can use an uploaded source archive, a pushed feature branch, or the latest pushed repository state.

- Codex does not use Git.
- Codex edits files, updates required docs/version/changelog entries, and runs non-Git validation commands only.
- The user prepares the chosen review source after Codex finishes.
- After publishing or uploading, the user tells GPT-5.5 Pro which review source is ready.
- If review finds a problem, the fix is made as the next versioned change.
- Public history is not rewritten.

## Current Release Supports

- Browser-only project editing with localStorage autosave.
- Project settings for project info, connector catalog, category connector assignments, connector compatibility groups, and cable prefixes.
- Location, folder, rack, device, and terminal-block inspectors with buffered editing, guarded navigation, and safe deletion rules.
- Device creation, metadata editing, folder assignment, interface relabeling, new-interface append, rack unassign, and standard-device hard delete.
- Terminal block creation and editing as fixed 1RU rack objects with unnumbered rear/front port faces.
- Port group definitions during device creation.
- Generated port records and planned cable records.
- Crosspoint creation from Device and TB views, including direct device links, device/TB segments, and TB front-to-front patches.
- Crosspoint disconnect from the shared picker, restoring affected cable slots to planned state.
- Cable register viewing and filtering.
- Planned cable numbering with project numbering ledgers and reusable released allocations.
- Reserved cable number gaps that require confirmation and cannot be reused.
- Validation in the UI and from CLI tools.
- JSON import/export: current exports use schema version `0.2.8.25`. This internal dev schema is current-shape only; older dev exports may be rejected before the first public released schema.

## Release Gates

Run release/stabilization gates from a clean checkout or clean source-package extraction:

- `npm run check:dev`: normal feature-development validation without E2E, Playwright browser install, source packaging, or clean extraction.
- `npm run check`: script hierarchy guard, format check, lint, typecheck, build, coverage-backed unit/contract/migration tests, fixture validation, version synchronization, cleanup, and cleanliness check.
- `npm run check:release`: `check`, synthetic scale check, Chromium browser bootstrap, and Playwright E2E.
- `npm run package:source`: creates and inspects `StudioWire_IO-<version>.zip`, extracts it outside the repository, runs `npm ci`, installs Chromium, runs `check:release`, validates the packaged sample, prints the packaged summary, verifies version sync, and removes the extraction.
- `npm run check:full`: `check:release`, `package:source`, final cleanup, and cleanliness check. It does not call itself indirectly.
- Startup recovery tries the active autosave key and known legacy keys in order; corrupt storage records do not block fallback recovery, and autosave failures leave the in-memory project exportable.
- Standard-device deletion removes child ports, port groups, owned planned cables, rack placement, and owned allocated cable-number ranges; reserved gaps remain unavailable.

## Current Release Intentionally Does Not Support

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
See `docs/V0_2_ACCEPTANCE.md` for the maintained v0.2 release acceptance gate.

## Version Changelog

### v0.2.8.25

- Aligned new-project category, connector, assignment, compatibility-group, cable-prefix, rack, and label defaults with the maintained operator project settings baseline.
- Added AV/DVI defaults, limited default Video connector assignments, added Audio SFP assignment, and retained the configured empty Video compatibility group.
- Made all initial, template-loaded, cloned, and newly appended I/O interface cards collapsed by default in Add Device, Clone and Edit, and Edit Device.

### v0.2.8.24

- Added a standard-device `Clone and Edit` navigator action that opens Add Device with reusable hardware and ordered I/O details prefilled for review.
- Clone drafts retain the source Location and Folder as operator-friendly defaults while clearing rack placement and other runtime state.
- Cloned I/O interfaces derive current category cable prefixes and fresh proposed cable ranges through the normal Add Device allocation and validation flow.

### v0.2.8.23

- Added a bundled device-template collection with Manufacturer, Category, and Model navigation in Add Device.
- Added strict template schema, path, duplicate-model, and project-compatibility validation without changing project JSON shape.
- Loading a compatible template fills the Add Device draft with fresh project IDs, prefixes, and proposed cable ranges for review; it never creates a device directly.
- Added standard-device template export with project-specific IDs, placement, and cable-allocation data removed.
- Added `npm run validate:collections` to the feature-development validation gate and source-package inputs.

### v0.2.8.22

- Bumped the app and project schema version to `0.2.8.22` without changing the persisted project shape.
- Made `{I/O NAME}` the canonical port-label token for the parent I/O interface name while retaining `{NAME}` as an alias.
- Fixed existing-interface relabeling so Device sub-name changes do not affect interface-name-based port labels.
- Renamed interface Name fields to I/O Name and moved Color controls into the second Add/Edit Device interface row.

### v0.2.8.21

- Bumped app and project schema version to `0.2.8.21` and removed `Location.type`.
- Standardized device, TB, rack, location, and folder inspectors around compact tree-style accordions with shared dirty-navigation protection.
- Added first-class folder selection, inspector editing, guarded non-empty deletion, and folder workspace summaries.
- Added full TB edit/delete workflows, project-wide cross-type name uniqueness, and rack-required TB creation messaging.
- Removed TB planned-cable creation; TB front patch cables now receive category-default cable numbers only when connected.
- Removed manual cable-prefix selection for new device interfaces and derive prefixes from category defaults.

### v0.2.8.20

- Bumped app and project schema version to `0.2.8.20`.
- Removed canvas inline editing for device headers and added a device location badge.
- Reworked standard Device Inspector into buffered collapsible Edit, Details, and I/O sections.
- Added global inspector Save/Delete actions and guarded dirty inspector navigation with Save, Discard, and Cancel choices.

### v0.2.8.19

- Bumped app and project schema version to `0.2.8.19`.
- Added reusable in-app confirmation dialogs for rack moves, unassign actions, deletes, and cable reservation warnings.
- Guarded blank I/O count edits so validation handles the state without crashing the project view.
- Aligned the top logo, inspector, and validation columns on one shared width.
- Simplified Rack Inspector assigned-device rows with compact minus actions.

### v0.2.8.18

- Bumped app and project schema version to `0.2.8.18`.
- Replaced browser-native Add/Rename Folder prompts in the navigator with standardized app modals.
- Added inline Folder name validation and preserved existing folder add/rename commands.
- Standardized the Add Location modal with the shared modal content and footer layout.

### v0.2.8.17

- Bumped app and project schema version to `0.2.8.17`.
- Polished standard modal footers with a reusable CSS StudioWire IO mark.
- Updated Add/Edit Device labels to Device Name and Device sub-name, moved helpers into labels, and added optional 1-48 RU mount height selection.
- Tightened Add/Edit Device I/O cards by removing up/down reorder controls while preserving drag-and-drop ordering.
- Standardized Add Rack modal spacing and changed new rack default height to 48 RU.

### v0.2.8.16

- Bumped app and project schema version to `0.2.8.16`.
- Added shared horizontal and vertical tab styling for settings and fixed-size form modals.
- Standardized Add/Edit Device and Add TB modals with top tabs, fixed dialog dimensions, scrollable content, and sticky footers.
- Unified Edit Device I/O interfaces into one ordered list so new and existing interfaces can be reordered together before save.

### v0.2.8.15

- Bumped app and project schema version to `0.2.8.15`.
- Removed button-like borders from inline editable device canvas labels.
- Added a reusable confirmation prompt builder and cross-location rack assignment warning before moving a device to another location.

### v0.2.8.14

- Bumped app and project schema version to `0.2.8.14`.
- Replaced connector icon placeholders with fixed CSS-drawn connector symbol selection.
- Replaced category color placeholders with color swatch and hex color editing controls.
- Added I/O interface color override controls with inherited category color fallback.
- Applied connector icons and category/override colors to Add/Edit Device I/O cards and device drawing port rows.

### v0.2.8.13

- Bumped app and project schema version to `0.2.8.13`.
- Reworked Add/Edit Device into General and I/O tabs with helper text, Folder selectors, and visible Device Label / Device sub-label fields.
- Removed Label Prefix, Role, Notes, and edit rack-height controls from Add/Edit Device while keeping stable stored defaults.
- Updated new I/O interface label defaults to `{NAME}-{000}` and added `{NAME}` formatting support while preserving `{DEVICE}`.
- Added collapsible and reorderable I/O interface cards; edit saves existing interface order through `project.portGroups`.

### v0.2.8.12

- Bumped app and project schema version to `0.2.8.12`.
- Added folder management inside Location views, including add, edit, delete, and navigator folder rendering.
- Added standard-device folder selectors in Add Device, Edit Device, and Device Inspector with automatic reset when the selected location changes.
- Reworked the left navigator to show flat mixed rack/device/TB lists with inline type badges instead of separate kind folders.
- Added rack folder assignment and drag/drop moves into folders, back to parent locations, and between locations where valid.
- Changed newly created racks to default to 28 RU while preserving existing rack heights.
- Added standard-device rack unassign controls from Rack Inspector and Device Inspector; terminal blocks remain excluded from this workflow.

### v0.2.8.11

- Bumped app and project schema version to `0.2.8.11`.
- Added current-schema fields for sub-locations, device sub-location assignment, category colors, connector icon keys, and I/O interface color overrides.
- Made this internal dev schema current-shape only instead of adding a `0.2.8.10` compatibility migration.
- Added focused validation for sub-location references, hex color fields, connector icon keys, and I/O color override values.

### v0.2.8.10

- Bumped app and project schema version to `0.2.8.10`.
- Added a normal-device Edit Device modal available from the device context menu and inspector.
- Allowed editing device metadata plus existing interface names and label patterns while keeping existing interface count and wiring fields locked.
- Added support for appending new I/O interfaces during device edit using the existing cable-number allocation rules.
- Cascaded interface label edits through generated ports and affected cable display labels without changing cable IDs, numbers, or connections.

### v0.2.8.9

- Bumped app and project schema version to `0.2.8.9`.
- Removed the top-bar `Saved` text while keeping bottom status and failed-autosave export behavior.
- Removed unassigned devices from the navigator and Add Device flow; every device now requires a valid location.
- Replaced standard-device retirement with hard delete that removes device-owned ports, port groups, cables, rack placement, and owned allocated cable-number ranges.
- Updated cable-number suggestion so released allocated numbers can be reused while reserved gaps remain blocked.

### v0.2.8.8

- Bumped app and project schema version to `0.2.8.8`.
- Added `npm run check:dev` as the normal feature-development validation gate without release packaging, clean extraction, Playwright install, or mandatory E2E.
- Made coverage run with one Vitest worker for more stable local checks.
- Documented feature-dev, stabilization, and release lanes, proportional testing, decomposition expectations, cleanup hygiene, and the pre-release dev-to-dev compatibility policy.
- Kept v0.2 closed without prewire/export work; future product/UI features remain outside this workflow cleanup.

### v0.2.8.7

- Bumped app and project schema version to `0.2.8.7`.
- Added an explicit identity migration from `0.2.8.6` and retained all documented legacy imports.
- Split rack canvas calculations, drop-target preview logic, viewed-rack state, drag/drop lifecycle, selector rendering, and rack elevation rendering into focused tested modules.
- Split the project navigator into pure tree grouping/filtering helpers, collapsed-key state helpers, and focused branch/item presentation components while preserving current labels, grouping, drag data, context menus, and active selection behavior.
- Audited `CrosspointPicker` and kept its existing split: candidate construction remains in `connectionCandidates.ts`, while local search/expand/display state remains in the picker.
- Dark theme, full device CRUD, connector icons, settings redesign, device subtitle/color/drawing-label fields, hardware templates, undo, routing matrix, and multi-device drawings remain future product work.

### v0.2.8.6

- Bumped app and project schema version to `0.2.8.6`.
- Added an explicit identity migration from `0.2.8.5` and retained all documented legacy imports.
- Split Add Device draft creation, quick presets, ephemeral row IDs, planned-cable range rebalancing, validation, range formatting, token normalization, and command payload shaping into focused tested modules.
- Moved Add Device form-state coordination into a dedicated hook and the port-group editor into a typed presentation component while preserving the current modal workflow and selectors.
- Added focused tests for defaults, category changes, presets, row updates, range warnings/errors, validation, submit payloads, and Add Device E2E creation.
- Device editing, CRUD expansion, hardware templates, connector icons, subtitle/color fields, and drawing label helpers remain future product work.

### v0.2.8.5

- Bumped app and project schema version to `0.2.8.5`.
- Added an explicit identity migration from `0.2.8.4` and retained all documented legacy imports.
- Split `SettingsWorkspace.tsx` into a small workspace coordinator plus focused project, connector, category, connector-group, tab, selector, and selection-transition modules.
- Added settings workflow characterization tests for tabs, project fields, cable prefixes, connector catalog edits, category assignments, connector groups, empty states, and returned-ID selection.
- Preserved the current settings visual design, labels, tab order, DOM roles, CSS hooks, command payloads, and import/export shape; the planned settings redesign remains future UI work.

### v0.2.8.4

- Bumped app and project schema version to `0.2.8.4`.
- Added an explicit identity migration from `0.2.8.3` and retained all documented legacy imports.
- Reduced `ProjectContext.tsx` to provider composition and the `useProject` guard.
- Extracted public context contracts, command creation, initial restore, autosave lifecycle, and file import/export orchestration into focused state boundaries.
- Moved `ProjectJsonInput` into its own component and added regression tests for import success, controlled failure, and input reset.

### v0.2.8.3

- Bumped app and project schema version to `0.2.8.3`.
- Added an explicit identity migration from `0.2.8.2` and retained all documented legacy imports.
- Split the project reducer into a thin exhaustive dispatcher backed by focused lifecycle, settings, hierarchy, device, and connection handlers.
- Moved stable state/action/draft types, reducer dependencies, and project stamping helpers into dedicated state modules.
- Added deterministic reducer characterization coverage plus direct handler/stamping tests for the extracted boundaries.

### v0.2.8.2

- Bumped app and project schema version to `0.2.8.2`.
- Reworked release gates into non-recursive core, release, packaging, and full layers.
- Rebuilt source packaging as a ZIP-aware clean-extraction verification workflow.
- Added explicit Playwright Chromium bootstrap for clean E2E installs.
- Made cleanup and cleanliness checks recursive across maintained paths.
- Corrected acceptance evidence wording and removed confirmed unused tooltip/separator primitives.

### v0.2.8.1

- Bumped app and project schema version to `0.2.8.1`.
- Made current-version imports validate the supplied JSON against the current schema before any migration or normalization.
- Restricted legacy endpoint and terminal-block metadata cleanup to their owning migration steps, and added an explicit `0.2.8.0` migration.
- Reworked import fixtures to cover historical serialized shapes and strict-current invalid cases.

### v0.2.8.0

Final v0.2 closeout and release-readiness release.

- Bumped app and project schema version to `0.2.8.0`.
- Added an explicit identity migration from `0.2.7.3` and retained all documented legacy imports.
- Formalized v0.2 completion without prewire export; prewire and document/export packages are future `0.3.0.0` scope.
- Added `docs/V0_2_ACCEPTANCE.md` and mapped release acceptance to automated commands/tests with optional manual visual checks.
- Added a synthetic multi-thousand-port scale/persistence/import/export check and included it in `check:full`.
- Changed source packaging to create and inspect `StudioWire_IO-0.2.8.0.zip` with lockfile, docs, samples, source, tools, schema, and config.
- Expanded Playwright lifecycle coverage for current-schema export/import, direct connections, device/TB segments, TB front-to-front patches, disconnect/reconnect, validation, reload, and failure paths.

### v0.2.7.3

Behavior-preserving refactor and source-cleanup release.

- Bumped app and project schema version to `0.2.7.3`.
- Added an explicit identity migration from `0.2.7.2` and retained all documented legacy imports.
- Split validation into aggregate modules with a shared validation context and direct module tests.
- Split import parsing, version detection, preflight shape checks, migrations, structural validation, and error formatting into dedicated domain modules.
- Moved device/terminal-block reducer construction commands, autosave scheduling, project export serialization, and connection-picker candidate building into focused modules.

### v0.2.7.2

Contract, documentation, quality-gate, naming, and repository-hygiene release.

- Bumped app and project schema version to `0.2.7.2`.
- Added an identity metadata migration from `0.2.7.1` and version-sync verification for package, lockfile, TypeScript, JSON Schema, sample data, UI labels, and docs.
- Renamed current docs to stable filenames, moved samples to `docs/samples/`, and added legacy/invalid fixtures.
- Consolidated the changelog into this README and removed the root `CHANGELOG.md`.
- Added deterministic format, lint, typecheck, test, coverage, fixture, version, cleanup, source-package, and Playwright E2E commands.
- Rebaselined the roadmap so prewire/export work is outside `0.2.0.0`.

### v0.2.7.1

Stabilized import, persistence, recovery, and retired-object behavior.

- Bumped app and project schema version to `0.2.7.1`.
- Added one canonical current-version constant and updated active schema/sample/package metadata.
- Moved project import through a staged, schema-backed boundary with controlled syntax, structural, migration, and relational-validation results.
- Added `0.2.7.0` as a supported previous schema that migrates/restamps to `0.2.7.1`.
- Hardened local autosave and startup recovery against corrupt records, unavailable storage, quota failures, and thrown storage operations.
- Added explicit save-state UI with export access after autosave failure and an app-level error boundary.
- Enforced retired device/TB immutability for new connections, editing, moving, UI candidates, and validation.

### v0.2.7.0

Reworked project Settings around the simpler connector model.

- Bumped app and project schema version to `0.2.7.0`.
- Replaced category-owned connector types with a global connector catalog plus category connector assignments.
- Added connector group membership rows so groups can allow direct cross-connector connections inside one category.
- Rebuilt Settings as tabs for Project, Connectors, Categories, and Connector Groups.
- Updated validation, import normalization, JSON Schema, and tests for the new settings shape.

### v0.2.6.0

Added schema-backed connector compatibility.

- Bumped app and project schema version to `0.2.6.0`.
- Added category-owned connector types and category-scoped connector compatibility groups.
- Updated connection creation, crosspoint filtering, and validation so direct connections require matching category and compatibility group, not exact connector type.
- Updated Add Device, Add TB, and Settings UI for category-filtered connectors and editable compatibility groups.
- Added legacy import normalization from global connector types to category-owned connector types.

### v0.2.5.7

Aligned current documentation and metadata with the active release line.

#### Changed

- Renamed the current product, data model, and validation docs to the then-active release-line filenames.
- Updated current docs and visible UI copy that still referred to v0.1 as the active release.
- Updated the project JSON Schema metadata and sample JSON to the current schema shape.
- Kept project schema version `0.2.5.1` and bumped the app version to `0.2.5.7`.

### v0.2.5.6

Fixed project JSON import from the app header actions menu.

#### Changed

- Moved the hidden project JSON file input outside the Radix dropdown so it remains mounted while the native file picker resolves.
- Kept the existing import parser, schema normalization, and export JSON shape unchanged.
- Added a current-schema export/import round-trip test.
- Kept project schema version `0.2.5.1` and bumped the app version to `0.2.5.6`.

### v0.2.5.5

Fixed reviewed domain and UI bugs without changing project schema.

#### Changed

- Made cable numbering ledger lookup pure and committed new ledgers explicitly during allocation.
- Tightened device status typing, added collision-resistant IDs for user-created objects, and kept deterministic IDs for generated artifacts.
- Corrected Cables column filter `Clear` semantics to select no values instead of acting like `Select all`.
- Optimized crosspoint picker candidate checks with indexed lookups and early category/connector filtering.
- Made bidirectional planned-cable reset behavior explicit as a side-A convention.
- Kept project schema version `0.2.5.1` and bumped the app version to `0.2.5.5`.

### v0.2.5.4

Completed the inline TB segment drawing polish.

#### Changed

- Added a second crosspoint picker after inline TB markers so TB front routing can be controlled directly from the current device view.
- Displayed the cable number for the TB front-to-destination segment when that segment is connected.
- Kept the TB front picker visible even when only the device-to-TB-rear segment exists.
- Moved cable numbers and remote destination labels closer to the red cable line.
- Kept project schema version `0.2.5.1` and bumped the app version to `0.2.5.4`.

### v0.2.5.3

Polished crosspoint drawing and added disconnect.

#### Changed

- Reworked the inline TB marker chevron so it reads as an arrow-like cable element instead of an accidental stroke.
- Added `Clear connection` to the shared crosspoint picker for connected ports.
- Restored affected disconnected cable slots to `planned` instead of retiring them.
- Reduced remote endpoint label size and weight on device cable rows.
- Kept project schema version `0.2.5.1` and bumped the app version to `0.2.5.3`.

### v0.2.5.2

Polished the crosspoint drawing and picker affordances.

#### Changed

- Moved device crosspoint pickers from the device body to the cable ends while keeping body-side connector markers visible.
- Reworked the picker menu into a collapsible Location -> Device/TB -> Port tree that only lists currently valid targets.
- Rendered TB inline chain markers as part of the red cable path, with rear/front direction shown by the marker shape.
- Moved TB view pickers outside the terminal-block panel border.
- Kept project schema version `0.2.5.1` and bumped the app version to `0.2.5.2`.

### v0.2.5.1

Added the first crosspoint connection system.

#### Changed

- Renamed cable endpoints from source/destination to side A/side B and bumped project schema version to `0.2.5.1`.
- Added connection domain logic for direct device links, device/TB links, TB front-to-front patches, lower-number-wins cable selection, retired loser cables, and replacement.
- Added shared crosspoint pickers to Device and TB views and rendered connected chains inline on drawings.
- Added validation for connected cable endpoints, connector/category mismatches, multiple active connections, and invalid resolved chains through terminal blocks.
- Bumped the app version to `0.2.5.1`.

### v0.2.4.3

Added the project-wide Cables register.

#### Changed

- Replaced the Cables placeholder with a shadcn-based table showing every project cable.
- Added endpoint-derived side labels, locations, connectors, and status columns.
- Added Excel-style multi-select column filters with search, select all, clear, active header state, and visible row counts.
- Kept this release UI-only and preserved project schema version `0.2.4.1`.
- Bumped the app version to `0.2.4.3`.

### v0.2.4.2

Polished terminal block UI and fixed app-shell scrolling.

#### Changed

- Replaced terminal block panel `Not Connected` labels with compact `N/C` labels.
- Removed the rack placement line from terminal block rack blocks and reduced their rack-label typography.
- Removed the read-only mount-height field from terminal block inspector UI.
- Fixed the app shell so the top navbar, sidebars, inspector, and footer stay pinned while workspace/canvas content scrolls internally.
- Bumped the app version to `0.2.4.2` without changing project schema version `0.2.4.1`.

### v0.2.4.1

Added terminal block creation and a terminal block panel view.

#### Changed

- Added terminal blocks as `terminal_block` device-kind records with fixed rackmount, 1RU placement.
- Added rear/front terminal block port groups, optional planned cable creation for FRONT ports only, and `tb_port` planned cable endpoints.
- Added Add TB, navigator TB grouping, terminal block workspace drawing, and terminal block inspector behavior.
- Updated validation and import normalization for schema version `0.2.4.1`, including compatibility for older `0.1.0` imports.
- Bumped the app version to `0.2.4.1`.

### v0.2.3.8

Aligned the footer section heights.

#### Changed

- Added a shared app footer height for the sidebar footer and main validation footer.
- Kept the app/schema version text aligned to the validation secondary line within the equal-height footer.
- Bumped the app version to `0.2.3.8`.

### v0.2.3.7

Aligned the left footer version text with the validation footer.

#### Changed

- Matched the app/schema footer typography to the validation secondary line.
- Lowered the app/schema footer line so it aligns with the `No validation issues.` row.
- Bumped the app version to `0.2.3.7`.

### v0.2.3.6

Normalized the footer layout and notification area.

#### Changed

- Removed validation badges from the sidebar footer and right footer notification area.
- Combined app and schema versions into one comma-separated sidebar footer line.
- Kept validation summary in the center footer while reserving the right footer section for app-level status messages.
- Bumped the app version to `0.2.3.6`.

### v0.2.3.5

Adjusted the unified navbar logo placement.

#### Changed

- Moved the StudioWire logo into the right navbar section above the inspector column.
- Left only the project name and project gear actions in the left navbar section.
- Bumped the app version to `0.2.3.5`.

### v0.2.3.4

Normalized the app navbar and added a placeholder Cables section.

#### Changed

- Replaced the split sidebar header and workspace top bar with one unified app header.
- Moved project actions to a canonical gear menu beside the logo and project name.
- Added top-level `Workspace` and `Cables` navigation, with `Cables` showing an empty placeholder canvas for the future prewire table.
- Moved transient project status messages from the top bar to the bottom validation footer.
- Preserved project schema version, reducer behavior, validation behavior, import/export behavior, and connection-model boundaries.
- Bumped the app version to `0.2.3.4`.

### v0.2.3.3

Rebuilt the device workspace as a canvas-first technical drawing.

#### Changed

- Replaced the dark device card and cable boxes with line-based input and output rows.
- Moved device and port labels into a central device body with an internal header divider.
- Rendered planned cable numbers under their cable lines near the device body, with small circular port endpoints.
- Preserved project schema version, reducer behavior, validation behavior, import/export behavior, and connection-model boundaries.
- Bumped the app version to `0.2.3.3`.

### v0.2.3.2

Replaced the generated app logo with the provided StudioWire IO wordmark.

#### Changed

- Added a cropped PNG version of the provided StudioWire IO logo for app use.
- Updated the sidebar header to show the new wordmark cleanly and avoid duplicating the app name beside it.
- Bumped the app version to `0.2.3.2`.

### v0.2.3.1

Cleaned up the rack canvas into a minimal engineering elevation view.

#### Changed

- Removed the rack workspace heading, rack selector card, rack panel context badges, rack card headers, instructional copy, and persistent move-success badge from the rack view.
- Moved the rack selector, zoom controls, and reset control into a compact in-canvas toolbar, and removed the pan toggle until the interaction can be made reliable.
- Restyled rack elevations with full-width device blocks, numeric-only RU cells, dim dotted row guides across the full rack body, horizontal multi-rack placement, and quieter device blocks while preserving rack drag/drop behavior.
- Fixed canvas zoom sizing so zoom changes take effect without collapsing the rack layout.
- Preserved project schema version, reducer behavior, validation behavior, import/export behavior, and connection-model boundaries.

### v0.2.2.7

Cleaned up rack placement ownership after the v0.2.2 rack-canvas milestone.

#### Changed

- Removed manual rack assignment and bottom-RU editing from the device inspector so rack placement is controlled by the rack canvas drag/drop workflow.
- Kept mount height editable as device metadata required before a device can be placed on a rack.
- Hardened normal device updates so they preserve rack placement fields and keep rack-mounted device location derived from the assigned rack.
- Replaced stale rack-canvas read-only copy with accurate drag/drop guidance.

### v0.2.2.6

Improved rack placement validation feedback on the rack canvas and inspector.

#### Added

- Added shared rack placement diagnostics for missing rack references, invalid rack size/bottom RU, below-RU placement, above-height placement, rack location mismatch, and rack RU overlap.
- Surfaced rack placement diagnostics as compact rack canvas warnings and rack inspector placement issue lists.
- Marked overlapping or location-mismatched mounted device blocks with warning treatment while keeping valid rack views clean.

#### Changed

- Preserved drag/drop assignment and repositioning behavior while using the same placement checks for clearer feedback.
- Preserved project schema version, project JSON shape, import/export behavior, and terminal-block boundaries.

### v0.2.2.5

Added tree-to-rack drag assignment for existing devices.

#### Added

- Made device rows in the navigator draggable to visible rack canvases.
- Supported assigning eligible virtual, unassigned, and non-mounted devices to empty rack RU ranges.
- Reused rack placement validation for tree-to-rack assignment, invalid occupied drops, out-of-capacity drops, and missing rack-size rejection.

#### Changed

- Successful tree-to-rack assignment updates only existing placement fields and preserves device identity, ports, port groups, cables, and code.
- Preserved mounted-device repositioning, canvas zoom/pan behavior, project schema version, and import/export semantics.

### v0.2.2.4

Added mounted-device drag repositioning on the rack canvas.

#### Added

- Made existing mounted device blocks draggable within the rack canvas.
- Added same-rack and visible multi-rack drops onto valid empty RU ranges.
- Added drop preview highlighting and invalid-drop messaging for occupied or out-of-capacity targets.

#### Changed

- Device moves update only existing placement fields: rack, location, and bottom RU while preserving device identity, rack size, ports, port groups, cables, and code.
- Preserved project schema version, import/export semantics, and terminal-block boundaries.

### v0.2.2.3

Added reusable app-level canvas zoom and pan behavior to the read-only rack canvas.

#### Added

- Added a reusable canvas viewport with zoom out, zoom percentage, zoom in, reset, and explicit pan-mode controls.
- Applied the viewport to the multi-rack canvas so viewed racks can be zoomed and navigated without changing browser zoom.

#### Changed

- Kept rack canvas behavior read-only and preserved project JSON, schema version, reducer behavior, validation behavior, and import/export semantics.

### v0.2.2.2

Added a read-only multi-rack canvas view using local UI state only.

#### Added

- Added a rack-view selector in the rack workspace for viewing up to four racks concurrently.
- Added duplicate prevention, remove controls for extra viewed racks, and a clear max-four limit message.

#### Changed

- Reused the existing rack elevation renderer for each visible rack without changing project JSON, schema version, reducer behavior, validation behavior, or import/export semantics.

### v0.2.2.1

Added the first read-only rack canvas/elevation view using existing rack and device placement data.

#### Added

- Rendered a full selected-rack RU stack in the main workspace with stable RU labels, explicit blank filler rows, and mounted device blocks spanning their existing RU range.
- Added defensive visual warnings for invalid rack placement data without mutating project data.

#### Changed

- Updated generated artifact hygiene to ignore and remove `.playwright-cli/` browser console logs.
- Preserved project JSON schema version, validation behavior, reducer behavior, import/export semantics, and all v0.2.2 terminal-block boundaries.

### v0.2.1.7

Continued the 0.2.1 UI-polish stage with focused navigator, device workspace, and Add Device workflow fixes.

#### Changed

- Fixed generated artifact hygiene by adding the missing `output/` ignore pattern and keeping generated browser/test artifacts out of the source tree.
- Added persistent navigator Add Location access from the Project Navigator context menu and the Unassigned Devices context menu.
- Simplified the main device workspace by removing large metadata/statistics cards and leaving the canvas focused on the device/port diagram.
- Simplified Add Device creation to user-facing basics, with new devices created as virtual and compatibility `Device.code` generated internally from label prefix or name.
- Compacted port group creation with a two-row layout, planned cable toggle, read-only range preview, and automatic preview range recalculation.
- Refined the Add Device I/O interface form with manual cable range fields when planned cables are off and moved bidirectional device-canvas groups into the side interface layout instead of the bottom band.
- Polished I/O interface cards with a top-right remove icon, a compact AUTO toggle, and always-visible first/last cable fields that become read-only in automatic mode.

### v0.2.1.6

Completed the 0.2.1 shadcn/ui polish sequence with a controlled consistency pass.

#### Changed

- Standardized destructive inspector actions on the shared shadcn-style button variant.
- Added clearer active navigation semantics for selected sidebar rows.
- Consolidated obsolete custom CSS left behind by earlier shell, modal, status, and danger-button implementations.
- Preserved app shell, sidebar, workspace, dialogs, validation display, and project data behavior.

### v0.2.1.5

Continued the shadcn/ui polish stage for main workspace and detail surfaces.

#### Added

- Added a shadcn-style table primitive for compact workspace and inspector data.

#### Changed

- Migrated project, location, rack, and device detail views toward shadcn-style cards, badges, alerts, and tables.
- Improved right inspector structure with card-based sections and shadcn-style controls where practical.
- Polished the compact validation footer with badge-based severity counts and issue actions.
- Preserved sidebar navigation, project/global actions, import/export, validation behavior, and project data semantics.

### v0.2.1.4

Continued the shadcn/ui migration for the 0.2.1 UI-polish stage.

#### Added

- Added shadcn-style dialog, input, label, textarea, select, alert, and card primitives.

#### Changed

- Migrated the add location, add rack, and add device modal flows to shadcn Dialog.
- Migrated touched dialog buttons, inputs, labels, selects, and validation message surfaces toward shadcn-style components.
- Preserved the shadcn Sidebar navigator, project actions dropdown, right-click context menus, and existing project behavior.
- Removed obsolete custom modal CSS that was replaced by Dialog-based components.

### v0.2.1.3

Began the shadcn/ui migration for the 0.2.1 UI-polish stage.

#### Added

- Added the shadcn/ui component foundation, including sidebar, menu, context menu, collapsible, button, badge, separator, and tooltip primitives.
- Added the shared `cn` utility and shadcn component configuration.

#### Changed

- Replaced the custom left navigation shell with a shadcn Sidebar-based project navigator.
- Moved global project/app actions into the sidebar header project menu.
- Kept locations as direct top-level navigator rows, with racks/devices nested under each location and Unassigned Devices as the final top-level member.
- Simplified the top bar so it no longer duplicates global project actions.
- Started reducing obsolete custom tree CSS while preserving existing workspace behavior.

### v0.2.1.2

Continued the 0.2.1 UI-polish stage.

#### Changed

- Simplified the left navigator so locations are the first visible tree rows instead of nesting under project and locations folders.
- Kept Unassigned Devices as the final tree member.
- Added an empty-project navigator prompt for creating a location or unassigned device by right-clicking.
- Kept project summary access on the project name in the top navbar.

### v0.2.1.1

Continued the 0.2.1 UI-polish stage.

#### Added

- Collapsible folder-style project navigator with project, locations, racks, devices, and unassigned device branches.
- Right-click context menus for creating locations, racks, and devices from supported tree rows.
- Documentation for internal `0.2.1.x` UI-polish substep versions.

#### Changed

- Removed small inline add buttons from the left navigator.
- Updated repository hygiene ignores for generated browser and test artifacts.
- Restored readable Markdown/config/source formatting in workflow and shell files.

### v0.2.1.0

Start of 0.2 UI polish phase.

#### Added

- Tailwind CSS styling foundation with lightweight StudioWire visual tokens.
- New original StudioWire IO SVG logo asset for the app navbar.
- Top-right Settings app menu modal for global project actions.

#### Changed

- Compacted the top navbar and bottom validation/footer area.
- Moved New Project, Load Sample, Import JSON, Export JSON, Validate, and Settings actions out of the navbar and into the Settings modal.
- Removed the Settings item from the left navigator.

### v0.1.5.0

Documentation formatting cleanup release only.

#### Changed

- Repaired Markdown formatting for the workflow and versioning documentation.
- Reformatted the review workflow roles into readable role sections.
- Preserved the simplified no-Git Codex workflow, manual user publish step, and `version published` GPT-5.5 Pro review trigger.

### v0.1.4.0

Workflow/docs correction release only.

#### Changed

- Simplified the review workflow so Codex performs no Git operations and only edits files, updates versioned docs, and runs non-Git validation.
- Documented that the user manually publishes and then tells GPT-5.5 Pro `version published`.
- Documented that GPT-5.5 Pro finds the latest pushed `master` diff by itself after publication.
- Clarified that normal review no longer requires user-provided SHAs, compare URLs, branches, tags, or review bundles.

### v0.1.3.0

Docs and workflow cleanup release only.

#### Changed

- Replaced the branch/tag/review-bundle workflow with a master-only commit-SHA review workflow.
- Added and clarified the versioning rule requiring every Codex change to update `package.json`, `package-lock.json` when present or affected, and the root `README.md` Version Changelog section.
- Documented that Codex modifies files only and the user manually commits and pushes before GPT-5.5 Pro review.

#### Removed

- Removed review-bundle/diff tooling and active workflow instructions.

### v0.1.2.0

Small stabilization cleanup before v0.2 planning.

#### Added

- PortGroup validation for planned-cable mode versus no-planned-cables mode.
- Reducer coverage for no-planned-cables device creation.
- `.gitattributes` line-ending policy for source, docs, JSON, CSS, and HTML files.
- README version changelog.

#### Changed

- Bumped package version to `0.1.2`.
- Normalized PortGroup allocation semantics: when `createPlannedCables` is false, cable-number fields and `numberingRangeId` stay `null`, ports remain unlinked, and no ledger allocation occurs.
- Updated Add Device behavior to clear and disable cable-number fields when planned cable creation is disabled, then restore the next suggested number when re-enabled.
- Strengthened review bundle exclusions for generated artifacts such as TypeScript build info and StudioWire zip exports.
- Updated review workflow docs to prefer diff mode after approved version tags.

### v0.1.1.0

Stabilization release for v0.1 before v0.2 planning.

#### Added

- Canonical planned cable creation module with source/cable/destination label rules.
- Validator coverage for settings names, cable prefix format, rack/device location consistency, port group range references, and planned cable ledger coverage.
- Tests for planned cable labels, stricter cable number parsing, and settings validation rules.
- Review bundle tooling and Vitest exclusion for generated review artifacts.
- Additional ledger and planned-cable consistency validation.

#### Changed

- Refactored the monolithic app component into layout, settings, location, rack, device, and common component folders.
- Strengthened import behavior to reject malformed project objects and run validation immediately after import.
- Standardized port label patterns on `{DEVICE}` and `{000}` tokens.
- Updated sample project cable labels to use top/source, middle/cable number, bottom/destination.
- Allowed `Device.locationId` to be `null` for virtual/unassigned handling while keeping rack and non-rack location validation.
- Corrected the sample `V` ledger `nextSuggested` value to account for reserved gaps.
- Made `ADD_DEVICE` reject failed cable allocations without mutating project state.

#### Removed

- Removed unused `@playwright/test` dev dependency.

### v0.1.0

Initial review-ready MVP.

#### Added

- React, TypeScript, Vite, and plain CSS browser-only app shell.
- Project context and reducer with localStorage autosave.
- JSON import/export for schema version `0.1.0`.
- Project settings editor for project info, categories, connector types, and cable prefixes.
- Location and rack creation, editing, and guarded deletion.
- Device creation workflow with quick port groups, generated ports, planned cables, and cable ledger allocation.
- Cable number engine with reserved gap behavior and Vitest coverage.
- Validation engine shared by the UI and CLI tools.
- Sample project, JSON Schema, product docs, data model docs, validation docs, and roadmap.

#### Changed

- Polished the main editor shell, modal styling, empty states, and validation panel presentation.
- Added confirmation before committing skipped cable-number gaps as reserved.
- Device destructive action now retires the device, planned cables, and related ledger ranges instead of freeing cable numbers.

#### Not Included In v0.1

- Terminal blocks.
- Device-to-TB connections.
- Prewire export.
- Excel export.
- Bartender export.
- Visio export.
- Authentication.
- Backend or database storage.
