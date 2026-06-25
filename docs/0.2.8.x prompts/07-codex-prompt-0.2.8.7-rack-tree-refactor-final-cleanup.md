# Codex implementation prompt — StudioWire IO `0.2.8.7`

## Assignment

Implement **only** the StudioWire IO `0.2.8.7` rack/tree decomposition and final source-cleanup release.

The repository must start clean and fully passing at app/schema version `0.2.8.6`. Verify that prerequisite first. Do not combine this work with unfinished import, release, reducer, context, settings, or Add Device tasks.

Do not run Git commands, create commits, create tags, or rewrite history.

This is the last behavior-preserving gap-closure release before the planned UI-polish/product iterations. Do not implement dark theme, full device CRUD, connector icons, settings redesign, device subtitle/color/drawing-label fields, hardware templates, undo, routing matrix, or multi-device device drawings.

## Release goal

Complete the remaining structural work from the earlier refactor prompt by:

1. splitting `RackWorkspace.tsx` into rack-view state/controller, pure canvas-model logic, and presentation components;
2. splitting `LeftTree.tsx` into pure tree selection/model helpers and focused branch/item components;
3. auditing `CrosspointPicker` only for unresolved mixed responsibilities—do not churn it if the existing 170-line split is already sound;
4. performing a final evidence-based dead source, CSS, dependency, root-file, tools, docs, and artifact audit;
5. correcting any remaining architecture/acceptance documentation drift.

No intentional visual or workflow change is allowed.

## Non-negotiable version policy

The target app version and current schema version are both exactly `0.2.8.7`.

- Update package/lockfile, canonical current version, supported versions, JSON Schema title/const, current sample, visible UI, README/docs, and version synchronization.
- Add an explicit tested identity migration `0.2.8.6 -> 0.2.8.7`.
- Preserve every earlier migration and fixture.
- Export projects as `0.2.8.7`.
- The version stamp is the only intended serialized-data change.

## Part A — RackWorkspace decomposition

### Current responsibilities to separate

The current rack workspace combines:

- list of up to four viewed rack IDs;
- selected-rack reset behavior;
- add/remove viewed-rack commands;
- drag-source state;
- browser drag-data read/write/cleanup;
- pointer-to-RU calculation;
- placement validation during dragover;
- drop-preview state/message construction;
- drop execution;
- placement-diagnostic calculation;
- rack canvas model construction;
- preview-row calculation;
- rack selector presentation;
- rack elevation/device rendering.

### Required rack behavior characterization

Add direct tests for:

- initial viewed rack and reset when selected rack changes;
- adding a second/third/fourth rack;
- duplicate add ignored;
- fifth rack blocked by `MAX_VIEWED_RACKS`;
- removing racks while preserving at least one viewed rack;
- addable-rack filtering and labels;
- display RU order for both rack numbering directions;
- mounted-device row start/end for different sizes/positions;
- placement diagnostics attached to the correct rack/device;
- pointer/client position to target bottom-RU calculation;
- valid drop preview with exact bottom/top RU and message meaning;
- invalid drop preview and drop effect;
- successful drop command payload;
- invalid/missing drag data produces no move;
- drag end/drop cleanup clears state and transfer data;
- selected rack/project changes do not leave stale preview/drag state.

Use pure event-independent functions for geometry/preview calculation wherever possible. Do not make unit tests fabricate large DOM drag events when a small input DTO will prove the same logic.

### Required rack architecture

Use repository-appropriate names, but create equivalent boundaries:

1. **Pure rack canvas model module**
   - display RU calculation;
   - mounted-device row calculation;
   - diagnostics grouping;
   - preview-row calculation;
   - rack option labels;
   - no React/browser imports;
   - direct unit tests.

2. **Pure drop-target calculation module**
   - translate measured canvas geometry/pointer position into target bottom RU;
   - call canonical `validateRackPlacement` for domain validity;
   - build a typed preview result;
   - no project mutation;
   - direct tests for boundaries and numbering directions.

3. **Focused rack-view controller hook**
   - viewed rack IDs and max limit;
   - selected-rack synchronization;
   - drag/preview lifecycle;
   - delegates browser transfer data to existing `deviceDrag` helpers;
   - calls the existing `moveMountedDevice` command only after canonical validation;
   - deterministic cleanup on drop, drag end, selected rack change, and unmount.

4. **Presentation modules**
   - rack view selector;
   - rack elevation canvas/panel;
   - mounted-device rendering if independently meaningful.

`RackWorkspace.tsx` should become composition, not retain all geometry and drag logic inline.

Preserve exactly:

- maximum four viewed racks;
- current toolbar/select behavior;
- zoom/pan `CanvasViewport` integration;
- current rack/device labels and diagnostics;
- drag affordances and messages;
- CSS hooks and layout;
- accessibility labels;
- move command behavior.

Do not turn the existing multi-rack rack elevation into the future multi-device drawing feature; they are different scopes.

## Part B — LeftTree decomposition

### Current responsibilities to separate

The current navigator combines:

- app-version display constant;
- collapsed-key state and toggle logic;
- unassigned-device selection;
- location/rack/device/TB grouping and sorting through inline array work;
- location branch rendering;
- folders for racks/devices/TBs;
- unassigned branch rendering;
- draggable device tree items;
- context-menu action wrappers;
- selection checks;
- add/edit/select callback wiring.

### Required tree behavior characterization

Add focused tests for:

- project/version header remains correct;
- locations render in current order;
- racks/devices/TBs are grouped under the correct location;
- standard devices and terminal blocks remain separated by `kind`;
- retired-object visibility and unassigned-object filtering remain exactly as the current implementation specifies;
- unassigned branch count and membership;
- empty folder labels;
- collapse/expand state per location/folder and unassigned branch;
- selected object active state;
- context-menu actions and callback payloads for add location/rack/device/TB;
- device item drag data and title behavior for devices with/without rack size;
- project replacement/removal of branches does not throw or retain invalid rendered content;
- current CSS/data attributes and accessible collapse labels remain stable.

### Required tree architecture

Create equivalent boundaries:

1. **Pure tree-model/selectors module**
   - build location branches with racks, standard devices, and terminal blocks;
   - build unassigned-device list;
   - produce counts and stable keys;
   - centralize current filtering/order rules;
   - no React/browser imports;
   - direct tests.

2. **Collapsed-tree state helper/hook**
   - immutable `Set` updates;
   - stable key conventions;
   - clear/tolerate keys for removed objects without crashes;
   - no domain mutation.

3. **Focused presentation components**
   - location branch;
   - folder branch;
   - unassigned branch;
   - device tree item;
   - action context menu.

4. **Thin `LeftTree.tsx` composition**
   - obtain/build model;
   - own collapsed state;
   - render header and branches;
   - wire external selection/add callbacks.

Avoid overfragmenting one-line wrappers. Every extracted component must own a recognizable rendering responsibility.

Preserve current DnD behavior by continuing to use the canonical `deviceDrag` helpers. Do not add icons by connector type or redesign the navigator.

## Part C — CrosspointPicker audit

The picker was already reduced substantially. Audit it against the earlier responsibility goal:

- candidate construction must remain in `connectionCandidates.ts` or another non-visual module;
- presentation must not duplicate connection compatibility/domain rules;
- selection/filter/display state may remain in the component when local and clear;
- direct tests must cover candidate filtering and command payloads.

If it is already responsibility-focused, make no structural change and report that evidence. Do not refactor code merely to produce a diff.

## Part D — Final evidence-based cleanup

After the rack/tree work is fully passing, perform a complete maintained-source audit.

### 1. Source and exports

- Find files with no imports, package-script entry point, config reference, documentation role, or deliberate framework convention.
- Find unused exports and helpers.
- Find unreachable branches and duplicate local utilities superseded by the new modules.
- Preserve migration code, supported fixtures, shadcn/Radix primitives actually used, and test-only entry points.
- Do not delete code solely because a simplistic text search misses alias/dynamic/config usage.

Use a maintained analysis tool such as Knip only if configured correctly for Vite, Vitest, Playwright, `tsx` tools, path aliases, CSS imports, and package scripts. Remove the tool/config afterward if it is only a one-time investigation aid; retain it only if it becomes a documented gate.

### 2. CSS

Audit `src/styles.css` and component class usage.

- Remove selectors proved unused after static search, rendered workflow inspection, and E2E.
- Account for conditional classes, Radix data attributes, template strings, and classes referenced only by tests.
- Preserve all current visual appearance.
- Do not rename large groups of CSS hooks in this behavior-preserving release.
- Add no theme token system or dark-theme styles.

Report every selector group removed and the evidence.

### 3. Dependencies

Audit `dependencies` and `devDependencies` against:

- source imports;
- configuration;
- package scripts;
- CLI tools;
- Playwright/Vitest/Vite plugins;
- indirect runtime assumptions.

Remove only confirmed direct dependencies that are no longer used. Update lockfile through normal package tooling. Do not manually edit integrity blocks.

### 4. Root and tools

For every root file/directory and every retained `tools/*` file, identify its current purpose.

- Remove obsolete root files/config only when no script/build/test/doc/package workflow uses them.
- Every retained tool must have a package-script entry point or be explicitly documented as imported support code.
- Do not remove packaging, version, fixture, scale, validation, summary, or cleanup tools that are part of the reproducible release gate.
- Keep samples only under `docs/samples`.
- Keep README as the sole changelog source.

### 5. Documentation truth audit

Verify README, `AGENTS.md`, and current docs agree with the actual repository after all gap-closure releases:

- strict current import versus legacy migration;
- four-component equal app/schema version policy;
- actual module boundaries;
- reproducible command hierarchy;
- recursive cleanup rule;
- v0.2 closed without prewire export;
- actual acceptance evidence, without claiming full device CRUD or UI redesign;
- samples path;
- supported legacy versions.

Fix stale links, file names, action/module names, and overclaims. Do not create a second changelog.

## Required no-change boundaries

Across rack, tree, crosspoint, and cleanup work, do not intentionally change:

- user-visible layout, colors, labels, or spacing;
- max viewed rack count;
- rack placement validation;
- navigator grouping semantics;
- drag/drop payload conventions;
- selection behavior;
- connection compatibility;
- project schema fields;
- validation codes/messages;
- cable numbering;
- persistence/import/export behavior;
- current product scope.

Any behavior defect discovered should be recorded for a later focused release unless it blocks correctness or safety.

## Verification

Run focused suites during extraction and the complete final gate:

```bash
npm ci
npm run test:run -- src/components/racks src/components/layout src/components/connections
npm run coverage
npm run check
npm run test:e2e
npm run check:full
npm run package:source
npm run clean
npm run clean:check
npm run clean:check
```

Additionally:

- run unused-code/dependency analysis if adopted;
- inspect final source-package entries;
- manually exercise rack multi-view/drag and navigator collapse/context-menu workflows as a supplementary check;
- do not retain screenshots, traces, reports, analysis output, or archives in the final source tree.

## Acceptance criteria

The release is complete only when:

- App/schema are `0.2.8.7` everywhere current.
- `0.2.8.6 -> 0.2.8.7` migration is explicit and tested.
- Rack canvas/model/drop calculations are pure and directly tested outside the component.
- Rack view/drag lifecycle has a focused tested controller.
- `RackWorkspace.tsx` is a composition layer with presentation modules.
- Left-tree grouping/filter/count/key logic is pure and directly tested.
- Collapsed state and branch/item presentation have focused owners.
- `LeftTree.tsx` is a composition layer.
- CrosspointPicker is either confirmed focused or narrowly corrected without churn.
- Rack/tree behavior, layout, labels, CSS hooks, accessibility, drag/drop, selection, and commands remain equivalent.
- Confirmed dead source, exports, selectors, dependencies, files, and tools are removed with evidence.
- Root files and retained tools all have current purposes.
- README/docs/AGENTS/acceptance match the real implementation and do not overclaim UI features.
- Full checks, E2E, clean-extraction source packaging, version synchronization, and recursive cleanliness pass.
- No generated artifact remains.

## Final Codex response

Return a gap-closure report containing:

1. rack responsibilities before/after and tests added;
2. tree responsibilities before/after and tests added;
3. CrosspointPicker audit conclusion;
4. dead source/exports/CSS/dependencies/files/tools removed, with evidence;
5. final root/tools purpose audit;
6. documentation discrepancies corrected;
7. coverage and full command results;
8. final source-package/cleanliness result;
9. explicit statement that product/UI features remain deferred.

Do not claim the earlier refactor gap is closed unless rack/tree boundaries, cleanup evidence, and the complete clean-extraction release gate all pass.
