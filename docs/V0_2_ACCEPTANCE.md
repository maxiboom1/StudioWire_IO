# StudioWire IO v0.2 Acceptance

This document defines repeatable acceptance for the maintained local v0.2 release line, including the additive v0.2.9 View presentation model. Project engineering data is the source of truth; View records are project-owned presentation data, while generated document packages remain future v0.3.0.0 scope.

## Scope Statement

v0.2 is complete around:

- Structured project, settings, location, rack, device, and terminal-block data.
- Generated ports and planned cable numbering.
- Direct device, device-to-terminal-block, and terminal-block front-to-front connection modeling.
- Cable register visibility and filtering.
- Relational validation and structural JSON import validation.
- Guarded location/rack deletion and standard-device hard delete with connection cleanup and released cable-number reuse.
- Safe JSON import/export with supported legacy migration.
- Resilient local browser persistence and recovery.
- Bundled, validated device templates that populate Add Device without bypassing project validation.
- Independent pattern/manual device-body I/O labels that never alter cable-facing `Port.label`, endpoints, allocations, or numbering ledgers; current template schema `0.2.0` retains `0.1.0` imports.
- Persistent project-level View metadata, live source references, neutral manual lines, and View-only annotations that cannot modify connectivity, numbering, rack assignment, or location hierarchy.
- Flat View navigation and CRUD, buffered View metadata/page settings, validation-issue routing, and exact A3/A4 portrait/landscape page workspace behavior.
- Live View device/TB/rack placement by navigator drag-and-drop, transient modifier/marquee multi-selection, atomic collective move/delete, View-only presentation labels, direct source opening, source-safe removal, and read-only technical blocks. Standard-device blocks uniformly reduce the complete Device Workspace diagram, an invisible equal-pitch virtual grid aligns both axes to I/O-row resolution, and one View-wide 70/80/90/100% Device Size control updates all device/TB blocks.
- View-only neutral orthogonal lines anchored to standard-device ports/I/O Ranges, text headings, visual Area backgrounds stored as `kind: 'group'`, and standard-device I/O Range braces. Canonical routes, parallel segment movement, grouped Flex paths, line styles, and route-constrained labels remain presentation-only; their operations cannot change physical connectivity, cable numbering, rack assignment, location hierarchy, devices, ports, or endpoints.
- Transactional View-local canvas undo/redo with a 50-entry limit, keyboard shortcuts, form-focus exclusions, lifecycle reset, source-only live-update preservation, and no serialized history state.
- Accessible keyboard-first canvas operation, safe pointer cancellation/stale-gesture rejection, and populated page-format confirmation with exact target-page overflow counts and coordinate preservation.
- Retained `0.2.8.25` import/autosave migration that adds `views: []` without changing existing project engineering data.

Version `0.2.9.10` finishes the first View editor with guaranteed orthogonal manual routing, reversible route-axis-aware snapping, transactional midpoint segment movement, grouped Shift-drag Flex paths, and quiet handles-only mouse selection. It retains endpoint reconnection, shared live TB rendering, three-digit minimum new cable numbers, and exact legacy cable records. It does not support logical grouping, per-object placement resizing, View printing/export, prewire export, Excel export, Bartender export, Visio export, SVG/PDF document export, authentication, backend storage, database storage, or multi-user collaboration.

## Development And Release Commands

For ordinary feature-development work, use:

```bash
npm run check:dev
npm run clean
npm run clean:check
```

`npm run check:dev` validates the normal product-development path, including bundled device collections, without release packaging, clean extraction, Playwright browser installation, or mandatory E2E.

For stabilization or release acceptance, run these from a clean checkout or clean source package extraction:

```bash
npm ci
npm run test:e2e:install
npm run check
npm run check:scale
npm run test:e2e
npm run package:source
npm run check:full
npm run clean
npm run clean:check
```

`npm run check` is a stabilization gate: script hierarchy guard, format check, lint, typecheck, build, coverage-backed unit/contract/migration tests, fixture validation, version synchronization, cleanup, and cleanliness check.

`npm run check:release` runs the core gate, synthetic scale check, Chromium browser bootstrap, and Playwright E2E. `npm run package:source` creates and inspects the source ZIP, extracts it outside the repository, installs dependencies, installs Chromium, runs `check:release`, validates the packaged sample, prints the packaged summary, checks packaged version sync, and removes the extraction. `npm run check:full` runs `check:release`, `package:source`, and final cleanup/cleanliness; it does not invoke packaging recursively.

Release packaging, clean-extraction verification, and Playwright E2E are not required after every UI/product feature. They remain available for release checkpoints, stabilization passes, and prompts that explicitly request them.

## Acceptance Matrix

| Acceptance item                                                   | Verification                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Clean install and deterministic build                             | `npm ci`, `npm run build`, and package-extraction verification for release checkpoints                                                                                                                                                           |
| Version synchronization                                           | `npm run version:check` checks package, lockfile, TypeScript constant, JSON Schema, sample data, README, data model, and visible UI version usage                                                                                                |
| Current structural schema validation                              | `npm run validate:fixtures`, `src/domain/projectContract.test.ts`, and JSON Schema validation inside the import pipeline                                                                                                                         |
| Relational validation behavior                                    | `src/domain/validators.test.ts`, `src/domain/validation/validationModules.test.ts`, and `src/domain/projectBehaviorCharacterization.test.ts`                                                                                                     |
| View model isolation, geometry, validation, and canvas operations | `src/domain/viewOperations.test.ts`, `src/domain/validation/views.test.ts`, and `src/state/projectHandlers/viewHandlers.test.ts`; engineering collections remain byte-equivalent across View mutations                                           |
| Retained `0.2.8.25` View migration and exact JSON round-trip      | `npm run validate:fixtures`, `src/domain/projectImport.test.ts`, and `src/state/projectStorage.test.ts`                                                                                                                                          |
| Every supported released-baseline/fixture migration               | `npm run validate:fixtures`, `src/domain/projectImport.test.ts`, and Playwright `imports current and legacy fixtures`; internal dev-to-dev compatibility is not guaranteed before public release                                                 |
| New, open, load sample, import, export flows                      | Playwright lifecycle and import/export tests in `tests/e2e/studiowire.spec.ts`; export/import compares complete project-domain JSON with only volatile download path excluded                                                                    |
| Local save, reload, unavailable storage, corrupt-record fallback  | Playwright storage tests plus `src/state/projectStorage.test.ts` and `src/state/projectAutosave.test.ts`; quota/write failure after a user edit is covered by unit tests, not browser injection                                                  |
| Settings and connector compatibility                              | Playwright settings test plus `src/domain/connectorCompatibility.test.ts`                                                                                                                                                                        |
| Location, rack, device, and terminal-block creation               | Playwright lifecycle tests plus reducer and domain command tests; editing proof is limited to settings edits, rack movement, device deletion, and reducer-level update behavior                                                                  |
| Rack placement and movement                                       | `src/domain/rackPlacement.test.ts`, `src/domain/rackDiagnostics.test.ts`, `src/state/projectReducer.test.ts`, and focused rack canvas/controller tests under `src/components/racks`                                                              |
| Cable allocation, skipped reserved gaps, and uniqueness           | `src/domain/cableNumbers.test.ts`, validator tests, and Playwright lifecycle export inspection                                                                                                                                                   |
| Direct device connections                                         | Playwright lifecycle test and `src/domain/connections.test.ts`                                                                                                                                                                                   |
| Device/TB connections                                             | Playwright lifecycle test and `src/domain/connections.test.ts`                                                                                                                                                                                   |
| TB front-to-front connections                                     | Playwright lifecycle test and `src/domain/connections.test.ts`                                                                                                                                                                                   |
| Disconnect behavior                                               | Playwright lifecycle test and `src/domain/connections.test.ts`                                                                                                                                                                                   |
| Device deletion and cable-number release                          | Reducer/domain tests plus Playwright lifecycle coverage for removed reconnection candidates                                                                                                                                                      |
| Cable register and filtering                                      | `src/components/cables/cableRows.test.ts`, `src/components/layout/CablesWorkspace.test.ts`, and Playwright exported cable assertions                                                                                                             |
| Navigator grouping and interaction boundaries                     | Pure tree model/collapse tests and rendered navigator tests under `src/components/layout`, plus Playwright lifecycle navigation coverage                                                                                                         |
| View CRUD, selection, page formats, and viewport controls         | `src/components/layout/StudioWireShell.test.tsx`, `src/components/common/selection.test.ts`, and focused tests under `src/components/views`                                                                                                      |
| View live placement, technical rendering, and source isolation    | `src/domain/viewPlacement.test.ts`, `src/components/devices/devicePresentationModel.test.ts`, focused `src/components/views` tests, and View reducer isolation tests                                                                             |
| View history, keyboard, lifecycle, and format prediction          | `src/domain/viewCanvasHistory.test.ts`, `src/domain/viewFormatPrediction.test.ts`, `src/components/views/ViewCanvasHistoryContext.test.tsx`, `src/components/views/ViewWorkspace.test.tsx`, and `src/components/layout/StudioWireShell.test.tsx` |
| Illustrative current sample View and exact round-trip             | `src/domain/projectContract.test.ts`, `npm run validate:project -- docs/samples/sample-project.studiowire.json`, and the normal `check:dev` sample gate                                                                                          |
| Unsupported export/auth/backend features absent                   | README, `docs/PRODUCT_SPEC.md`, `docs/ROADMAP.md`, this acceptance doc, and UI/E2E coverage with no unsupported controls expected                                                                                                                |
| Synthetic multi-thousand-port persistence/import/export check     | `npm run check:scale`                                                                                                                                                                                                                            |
| Chromium browser availability                                     | `npm run test:e2e:install` installs the lockfile-compatible Chromium browser used by Playwright for release/E2E checkpoints                                                                                                                      |
| Clean source packaging                                            | `npm run package:source`, ZIP-aware source-package extraction verification, `npm run clean`, and `npm run clean:check` for release checkpoints                                                                                                   |

## Manual Visual Check

Automated tests cover behavior and data equivalence. Before publishing, a human may optionally run `npm run dev`, load the sample project, and visually inspect:

- App shell layout with tree, workspace, inspector, and validation panel.
- Device and terminal-block connection views.
- Add Device and Add TB dialogs.
- The bottom-anchored Views section with no Locations, aligned Add control, bottom-pinned Add/Rename modal footer, Add/Rename/Delete flows, and the streamlined selected View Inspector.
- A4 and A3 pages in portrait and landscape at 100%, Fit Page, and Fit Width zoom.
- A View containing a standard device, terminal block, 48 RU rack, and high-port-count device at several zoom levels; verify aligned connector icons, readable live summaries, move-only selection affordances, and out-of-page highlighting.
- The `Signal Overview` sample View at Fit Page, Fit Width, 100%, and high-detail zoom; verify its Area remains behind two live devices, the blue `4x SDI` line resolves to row anchors, and its black label stays readable.
- Keyboard-only Select, Text, Area, Line-anchor traversal, nudge, remove, undo, and redo; verify focus remains visible and form typing never triggers canvas shortcuts.
- A populated page-format change that reports placement/Line/annotation overflow, offers Cancel and Keep layout, and preserves all coordinates when confirmed.

This visual check is not a substitute for the automated gates.
