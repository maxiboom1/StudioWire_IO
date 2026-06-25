# Codex implementation prompt — StudioWire IO `0.2.8.4`

## Assignment

Implement **only** the StudioWire IO `0.2.8.4` ProjectContext-boundaries release.

The repository must start clean and fully passing at app/schema version `0.2.8.3`, with the reducer already decomposed into focused pure handlers. Verify that prerequisite before editing. If the reducer remains monolithic or earlier gates fail, report the mismatch instead of combining releases.

Do not run Git commands, create commits, create tags, or rewrite history. This release is behavior-preserving. Do not add full device CRUD, dark theme, settings redesign, connector icons, templates, device-view enhancements, undo, routing matrix, or multi-device views.

## Release goal

Reduce `src/state/ProjectContext.tsx` from a roughly 535-line mixed-responsibility module to a thin React composition boundary.

After this release, the context provider should coordinate already-tested services/hooks; it should not own raw browser storage access, autosave mechanics, file parsing, download mechanics, repetitive ID construction, or dozens of handwritten dispatch wrappers.

This refactor prepares a stable command API for later UI work without changing that API’s behavior.

## Non-negotiable version policy

The target app version and current schema version are both exactly `0.2.8.4`.

- Update package/lockfile, canonical current version, supported versions, JSON Schema title/const, current sample, UI, README/docs, and version synchronization.
- Add an explicit tested identity migration `0.2.8.3 -> 0.2.8.4`.
- Preserve every prior migration and fixture.
- Export projects as `0.2.8.4`.
- The version stamp is the only intended serialized-data change.

## Existing responsibilities to separate

The current context module combines all of these:

- public context type definition;
- reducer/provider creation;
- initial browser-storage discovery and restore;
- storage availability reporting;
- autosave scheduling and lifecycle;
- a mutable project ref for export/autosave;
- file reading and project import;
- JSON download initiation;
- ID generation for categories, assignments, groups, group members, connector types, prefixes, locations, racks, devices, and terminal blocks;
- dispatch wrappers for every action;
- provider-value memoization;
- `ProjectJsonInput` rendering and file-input change behavior.

Create focused boundaries rather than moving this entire block to one new file.

## Refactor method

1. Add tests around the current public command API and provider lifecycle before extraction.
2. Move one responsibility at a time.
3. Keep `useProject()` behavior and command signatures stable.
4. Re-export moved public symbols temporarily if needed to avoid unrelated component churn.
5. Run provider/command/persistence tests after every slice.
6. Do not use a broad mock that bypasses the real reducer or persistence services.

## Required architecture

Use repository-appropriate names, but implement equivalent boundaries.

### 1. Public context contract module

Move the public `ProjectContextValue` contract and related command input types to a small type-only module.

Requirements:

- no React component implementation in the type module;
- use the stable state/action/draft types created in `0.2.8.3`;
- preserve all existing public command names and return types;
- avoid importing the reducer implementation merely to obtain types;
- do not add future CRUD commands in this release.

The public API that existing components consume must remain compatible:

- project/session commands;
- settings/category/connector/group commands;
- location/rack commands;
- device/TB creation and existing update/retire/move commands;
- connection commands;
- state fields and persistence state.

### 2. Pure project-command factory

Extract repetitive ID construction and action dispatch into a tested command factory or equivalent non-React service.

It should receive explicit dependencies, for example:

- typed `dispatch`;
- ID factory;
- current-project getter where genuinely required;
- import service/file-text reader;
- export/download adapter.

Requirements:

- no hidden browser globals in the core command factory;
- no React hooks inside the pure factory;
- deterministic IDs in tests through dependency injection;
- exact preservation of ID prefixes and seeds currently used for each entity;
- exact preservation of prefix trimming/uppercasing behavior;
- device and terminal-block supplied IDs remain respected;
- import success dispatches `IMPORT_PROJECT_JSON`; import failure dispatches `IMPORT_PROJECT_FAILED` and returns `false`;
- export reads the latest project, not a stale render closure;
- command objects/functions must not be recreated unnecessarily on every project mutation.

Add direct tests for every command group. Assert dispatched action payloads, returned IDs, input normalization, import return value, and export project selection.

Do not move domain mutation logic into this factory. It prepares actions; the reducer/domain commands remain authoritative.

### 3. Initial-state restore boundary

Move initial storage discovery and restore to a small tested function/service outside the context module.

Requirements:

- no unguarded `window.localStorage` access;
- reuse `getBrowserStorage` and `restoreStoredProject` rather than duplicating recovery logic;
- preserve exact startup behavior for unavailable storage, no valid record, current record, corrupt-current/valid-legacy fallback, and migrated legacy record;
- return a complete `ProjectState`;
- preserve status and persistence messages unless tests establish an accidental inconsistency;
- make dependencies injectable for unit tests;
- no React imports.

### 4. Autosave lifecycle hook/service

Extract the `state.project`-driven autosave effect into a dedicated hook that coordinates the existing autosave and storage services.

Requirements:

- context must not import or call raw storage operations;
- storage acquisition happens once per provider lifecycle unless a deliberate retry API exists;
- unavailable storage sets the same visible failed state;
- project changes schedule a debounced save through the existing autosave service;
- stale saves cannot mark a newer project as saved;
- cleanup cancels pending timers on project change and unmount;
- save success/failure dispatches the existing persistence action with equivalent messages;
- no autosave is scheduled merely because an import failed and state did not change;
- use injectable timer/storage dependencies in tests where practical;
- do not introduce a global singleton that leaks between tests or providers.

Add lifecycle tests for:

- initial unavailable storage;
- successful save transition `saving -> saved`;
- failed write transition `saving -> failed`;
- rapid changes coalescing/cancelling correctly;
- unmount cancellation;
- latest-project serialization;
- no false “saved” status after failure.

Use the smallest test support needed. Do not add a large UI-testing stack solely for this hook if the behavior can be tested through a small harness and existing React/Vitest tools.

### 5. File import/export boundary

Move file reading and download initiation out of the provider body.

Requirements:

- reuse the strict `0.2.8.1` import pipeline;
- a file read failure returns a controlled import failure and leaves the project unchanged;
- failed import does not invoke success completion;
- export always uses current project state;
- browser download details remain behind the existing export adapter;
- pure orchestration is directly testable through injected file reader/importer/exporter dependencies.

### 6. Move `ProjectJsonInput` to its own component

Place the hidden file input in a focused component module.

Preserve:

- `aria-label="Import Project JSON"`;
- accepted extensions/MIME types;
- ref support;
- input reset after an attempted file import;
- `onImportComplete` only after successful import;
- accessibility and current calling behavior.

Either update imports cleanly or provide a compatibility re-export from the previous module for one release. Do not leave duplicate implementations.

Add a focused test for success, controlled failure, and same-file reselection after input reset.

### 7. Thin provider composition

After extraction, `ProjectContext.tsx` should be responsible only for:

- creating the context;
- running the reducer with the tested initial-state loader;
- invoking the dedicated persistence hook;
- obtaining the stable command API;
- composing/memoizing the public value;
- rendering the provider;
- implementing `useProject` guard behavior.

It must not contain:

- raw browser storage calls;
- autosave timer setup;
- file parsing;
- direct download mechanics;
- per-entity ID construction;
- dozens of nearly identical inline `useCallback` dispatch wrappers;
- UI component implementation for the file input.

Reduced line count alone is not success. The dependencies and tests must prove the boundaries.

### 8. Preserve command identity and render behavior

Audit provider memoization after extraction.

- Command functions should be stable across project-only state changes unless they actually depend on changed dependencies.
- The provider value must still update when state changes.
- Do not capture stale project state in export/autosave.
- Do not introduce nested contexts or selector libraries in this release.
- Avoid premature optimization, but add a focused identity test if the factory/hook design makes it practical.

### 9. Documentation and cleanup

Update:

- README changelog for `0.2.8.4`;
- `AGENTS.md` to describe context as a coordination layer and commands/services as non-React boundaries;
- any maintained architecture note that still says context owns storage/import/export mechanics.

Do not recreate `CHANGELOG.md`. Do not alter visual/product documentation.

Finish with generated-artifact cleanup and recursive cleanliness checking.

## Verification

Run focused tests first, then the full reproducible gate:

```bash
npm ci
npm run test:run -- src/state
npm run coverage
npm run check
npm run check:full
npm run package:source
npm run clean
npm run clean:check
```

Also run the Playwright import/export and storage tests explicitly if the test runner supports filtering. Report exact results.

## Acceptance criteria

The release is complete only when:

- App/schema are `0.2.8.4` everywhere current.
- `0.2.8.3 -> 0.2.8.4` migration is explicit and tested.
- `ProjectContext.tsx` is a thin provider/composition module.
- Public command signatures and behavior remain compatible.
- ID generation and normalization are centralized, injectable, and directly tested.
- Initial restore lives outside React context and reuses canonical storage/import logic.
- Autosave lifecycle is isolated, cancellable, latest-state-safe, and directly tested.
- Import/export orchestration is outside the provider body and uses strict canonical services.
- `ProjectJsonInput` is a focused component with success/failure/reset tests.
- Context contains no raw browser-storage mechanics or repetitive per-command wrappers.
- No stale closure can export or save an older project.
- No UI or domain feature is added.
- Unit, coverage, E2E, clean-extraction package, version, and cleanliness gates pass.

## Final Codex response

Report:

1. responsibilities removed from `ProjectContext.tsx`;
2. final context/command/persistence/file boundary map;
3. command API compatibility and ID-normalization evidence;
4. autosave lifecycle tests and stale-state protections;
5. import/export and file-input regression results;
6. before/after module and line-count summary;
7. exact full verification results.

Do not claim the context is only coordination if it still performs browser storage, parsing, download, or entity-ID construction directly.
