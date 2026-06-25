# Codex implementation prompt — StudioWire IO `0.2.8.6`

## Assignment

Implement **only** the StudioWire IO `0.2.8.6` AddDeviceModal decomposition release.

The repository must start clean and fully passing at app/schema version `0.2.8.5`. Verify that prerequisite first. Do not combine this work with missing reducer, context, release, or settings tasks.

Do not run Git commands, create commits, create tags, or rewrite history.

This is a behavior-preserving code refactor. Do not implement full device CRUD/editing, device templates, connector icons, new device subtitle fields, label colors, drawing-helper labels, dark theme, undo, routing matrix, or multi-device views. Those are later product releases.

## Release goal

Split the approximately 755-line `src/components/devices/AddDeviceModal.tsx` into focused form, presentation, and pure draft/validation modules without changing the current Add Device workflow.

The current file mixes:

- modal and form rendering;
- device draft state;
- port-group draft state;
- category-dependent defaults;
- quick port-group presets;
- local row ID generation;
- planned-cable range rebalancing;
- port-group editing UI;
- cable-range preview/formatting;
- connector and prefix lookups;
- device-token normalization;
- complete form validation and warning generation;
- final submit shaping.

Move each concern to a clear owner and lock behavior with direct tests.

## Non-negotiable version policy

The target app version and current schema version are both exactly `0.2.8.6`.

- Update package/lockfile, canonical current version, supported versions, JSON Schema title/const, current sample, visible UI, README/docs, and version synchronization.
- Add an explicit tested identity migration `0.2.8.5 -> 0.2.8.6`.
- Preserve all prior migrations and fixtures.
- Export projects as `0.2.8.6`.
- No serialized shape change is permitted beyond the required version stamp.

## Refactor method

1. Characterize current draft creation, presets, rebalancing, validation, warnings, and submit output before moving code.
2. Extract pure helpers first.
3. Extract the port-group editor presentation next.
4. Introduce a focused form-state hook/controller only after pure behavior is tested.
5. Keep the modal shell and existing E2E selectors stable.
6. Run focused tests after every extraction slice.

Do not use an unreviewable one-shot rewrite.

## Required behavior characterization

### Initial device draft

Test the current defaults for:

- name/code/manufacturer/model/role/notes;
- selected category;
- location and rack-related values;
- label prefix;
- mount type;
- rack size/bottom values;
- initial quick port groups;
- default cable prefix and connector selection.

Cover empty settings/project cases safely.

### Category changes

Verify that changing device category:

- updates the device category;
- rebuilds quick port groups according to current behavior;
- uses category-assigned connectors and category default prefix;
- does not introduce connectors that are not assigned to the category;
- rebalances planned ranges using current numbering ledgers;
- keeps unrelated device fields intact.

### Quick presets

Directly test current quick presets for the recognized category names, including current video, audio, network, and fallback behavior.

Assert:

- group names;
- directions;
- connector selection fallback order;
- prefixes;
- label patterns;
- counts;
- planned-cable flags;
- first-cable-number allocation.

Do not add hardware model templates or new presets in this release.

### Port-group editing

Test:

- updating a group by local ID;
- category change within a group;
- planned-cable toggle behavior;
- adding a group;
- removing a group;
- preventing accidental updates to the wrong group;
- count and first-number normalization;
- range rebalancing after relevant changes;
- unique local IDs without relying on flaky wall-clock/random assertions.

### Cable range calculation and validation

Directly test:

- next suggested number per prefix;
- multiple groups sharing a prefix;
- multiple groups using different prefixes;
- reserved-gap warnings;
- overlapping/invalid range errors;
- unknown prefix;
- unknown connector;
- connector not assigned to selected category;
- missing/invalid count;
- missing first cable number when planning is enabled;
- planning disabled behavior;
- range display and last-number formatting;
- no mutation of the source project during preview.

### Device-token and submit shaping

Test normalization of spaces, underscores, punctuation, repeated hyphens, empty input, and mixed case.

Test successful submit output exactly:

- device draft fields passed to the command;
- port-group local-only fields removed;
- numeric values normalized as they are today;
- label prefix fallback behavior;
- modal completion/close behavior;
- failed validation prevents dispatch.

## Required architecture

Use repository-appropriate names, but implement equivalent responsibility boundaries.

### 1. Pure device-draft module

Extract pure functions and types for:

- creating the initial device draft;
- creating quick port-group drafts;
- selecting default connector/prefix;
- rebalancing planned ranges;
- updating/adding/removing port-group drafts;
- formatting cable ranges;
- normalizing the device token;
- producing the final command payload.

Requirements:

- no React imports;
- no browser APIs;
- no mutation;
- explicit dependencies for local ID generation;
- direct unit tests;
- reuse canonical domain functions such as connector compatibility, cable numbering preview/allocation, and formatting rather than duplicating them.

Do not put all helpers into a vague `utils.ts`. Use a name tied to Add Device draft behavior.

### 2. Deterministic local-ID factory

Replace direct `Date.now()`/`Math.random()` construction inside quick-group creation with an explicit local draft-ID dependency or a small dedicated factory.

Requirements:

- IDs need only be unique within the open modal; they are not serialized domain IDs;
- normal runtime behavior remains collision-resistant;
- tests can inject deterministic values;
- no global mutable counter leaks between modal instances/tests;
- do not reuse persisted entity ID conventions for ephemeral rows unless there is a clear reason.

This internal change must not affect final generated project IDs or cable numbers.

### 3. Focused Add Device form hook/controller

Move coordinated form state and event logic to a dedicated hook or controller.

It may own:

- device draft;
- port-group drafts;
- category-change coordination;
- add/remove/update/toggle handlers;
- derived validation/warnings;
- final submit command call.

Requirements:

- it consumes the current project and narrow command callback explicitly;
- it does not render JSX;
- it does not duplicate domain rules;
- derived validation should be memoized only where useful and remain correct;
- reset/close behavior remains controlled by the modal owner;
- no future edit-mode behavior is added.

Add direct hook/controller tests through a small harness or test the pure state transitions underneath it.

### 4. Separate `PortGroupEditor`

Move the large port-group editor JSX into its own component module.

Requirements:

- explicit typed props;
- no direct project-context access if required data/callbacks can be passed narrowly;
- preserve all existing labels, input IDs, checkbox behavior, select options, remove controls, read-only range fields, helper/warning text, and CSS classes;
- preserve accessibility relationships between labels and controls;
- no connector icons or visual redesign;
- no domain allocation logic inside the presentation component.

### 5. Thin modal shell

After extraction, `AddDeviceModal.tsx` should mainly:

- obtain project/command dependencies;
- initialize the focused form controller;
- render the modal/device fields/port-group list/validation summary/actions;
- call the existing close callback after successful creation.

It must not retain bottom-of-file pure numbering/validation/preset implementations.

### 6. Preserve current user-visible workflow

Do not intentionally change:

- field order;
- labels and helper text;
- default values;
- recognized category presets;
- button text;
- number of default port groups;
- connector/prefix fallback order;
- planned-cable behavior;
- reserved-gap warnings;
- validation message meaning;
- modal size/layout/CSS hooks;
- submit and close behavior;
- keyboard/focus/dialog semantics.

If the current workflow contains an actual defect, document it for the later device CRUD/UI release rather than changing it here unless it blocks safe extraction.

### 7. Tests and coverage

Create direct tests for the pure draft/validation module and focused component/controller behavior.

Keep existing domain tests authoritative for cable allocation and compatibility; Add Device tests should prove correct orchestration, not duplicate every domain implementation.

Add or strengthen Playwright coverage for:

- opening Add Device;
- defaults;
- changing category;
- adding/removing a port group;
- validation block;
- successful device creation with expected ports/planned cables.

Do not rely only on the broad lifecycle test.

### 8. Documentation and cleanup

Update only:

- README changelog for `0.2.8.6`;
- `AGENTS.md` if it needs a rule separating form controllers, pure draft logic, and presentation;
- maintained architecture docs only where the old component ownership is described.

State explicitly that device editing/templates are still not implemented by this structural release.

Remove unused helpers/imports/CSS exposed by the extraction only after verifying they are truly unused. Finish with recursive cleanup.

## Verification

Run focused tests and the full reproducible gate:

```bash
npm ci
npm run test:run -- src/components/devices
npm run test:run -- src/domain/cableNumbers.test.ts src/domain/connectorCompatibility.test.ts
npm run coverage
npm run check
npm run test:e2e -- --grep "device|lifecycle"
npm run check:full
npm run package:source
npm run clean
npm run clean:check
```

Use the supported Playwright filtering syntax and report the actual command if it differs.

## Acceptance criteria

The release is complete only when:

- App/schema are `0.2.8.6` everywhere current.
- `0.2.8.5 -> 0.2.8.6` migration is explicit and tested.
- Add Device presets, range allocation, warnings, validation, and submit output are fully characterized.
- Pure draft/validation/range helpers live outside React and are directly tested.
- Ephemeral port-group IDs are deterministic under test and collision-safe at runtime.
- Form-state coordination has a focused owner.
- `PortGroupEditor` is a presentation component with explicit props.
- `AddDeviceModal.tsx` is a thin modal/form shell rather than a 750-line mixed module.
- Existing defaults, labels, order, CSS hooks, accessibility, warnings, and create behavior are unchanged.
- No edit mode, CRUD expansion, templates, icons, subtitle/color/label schema, or UI redesign is introduced.
- Coverage, E2E, clean-extraction packaging, version, and cleanliness gates pass.

## Final Codex response

Report:

1. old AddDeviceModal responsibilities and final module map;
2. pure functions and deterministic dependencies extracted;
3. preset/range/validation/submit tests added;
4. evidence that current UI and command payloads remain equivalent;
5. before/after line counts as context;
6. exact full verification results;
7. product work explicitly deferred to the future device CRUD/UI prompt.

Do not call this full device CRUD; it is only a decomposition of the current create workflow.
