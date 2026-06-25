# Codex implementation prompt — StudioWire IO `0.2.8.5`

## Assignment

Implement **only** the StudioWire IO `0.2.8.5` SettingsWorkspace decomposition release.

The repository must start clean and fully passing at app/schema version `0.2.8.4`, with reducer and ProjectContext responsibilities already separated. Verify that prerequisite first. If earlier architecture work is incomplete, report the mismatch rather than combining releases.

Do not run Git commands, create commits, create tags, or rewrite history.

This release is a **behavior-preserving settings code refactor**, not the planned visual redesign. Do not move the tabs to the left, add labeling/help/tip content, introduce dark theme, change visual styling, rename settings concepts, add schema fields, or alter connector/category/group behavior. Those changes belong to a later dedicated UI/product prompt.

## Release goal

Split the approximately 804-line `src/components/settings/SettingsWorkspace.tsx` into focused, testable settings modules while preserving the current UI, labels, tab order, forms, commands, CSS hooks, keyboard behavior, and accessibility semantics.

The result should give the later settings redesign a clean foundation without forcing that redesign to untangle selection synchronization, pure selectors, form state, and four large panel implementations from one file.

## Non-negotiable version policy

The target app version and current schema version are both exactly `0.2.8.5`.

- Update package/lockfile, canonical current version, supported versions, JSON Schema title/const, current sample, visible UI, README/docs, and version synchronization.
- Add an explicit tested identity migration `0.2.8.4 -> 0.2.8.5`.
- Preserve all previous migrations and fixtures.
- Export projects as `0.2.8.5`.
- No serialized shape change is allowed beyond the required version stamp.

## Current responsibilities to separate

The current `SettingsWorkspace.tsx` includes:

- active top-tab state;
- selected category state for category assignment;
- selected category and group state for compatibility groups;
- synchronization effects when categories/groups change;
- project-info form state;
- add cable-prefix form state;
- add connector form state;
- add category form state;
- connector assignment form state;
- add compatibility-group form state;
- add group-member form state;
- command orchestration for all settings mutations;
- all tab buttons;
- `ProjectSettingsPanel`;
- `ConnectorsPanel`;
- `CategoriesPanel`;
- `ConnectorGroupsPanel`;
- pure selectors/helpers at the bottom of the file.

Do not move all of this into a single `useSettingsWorkspace.ts` file. Create real responsibility boundaries.

## Refactor method

1. Add characterization/component tests for the current workflows before moving code.
2. Extract pure selectors first and test them directly.
3. Extract one panel at a time while keeping the app passing.
4. Extract selection/form coordination only after panel props are explicit.
5. Preserve current DOM labels and CSS class names so Playwright remains meaningful.
6. Do not use snapshots as the only proof of behavior.

## Required behavior characterization

Add focused tests covering the settings workflows that currently exist.

### Project settings

- project name/customer/revision fields initialize from project state;
- external project-state changes resynchronize the local form;
- submit dispatches exactly the current update payload;
- cable-prefix creation trims/normalizes through the existing command boundary;
- blank prefix/name input remains blocked as it is today;
- current prefix rows remain visible and unchanged.

### Connector types

- connector list renders current types;
- add connector trims the name and resets the input;
- blank add is blocked;
- inline/current connector rename invokes the same command with the same payload;
- no connector icon or new metadata is added in this release.

### Categories and assignments

- first available category becomes selected when needed;
- selection remains stable while the selected category still exists;
- selection falls back predictably when the selected category disappears or the project is replaced;
- add category creates it, selects it in both relevant settings areas, and resets the form;
- category update behavior is unchanged;
- assign connector chooses the explicitly selected connector or the current first option fallback;
- remove assignment behavior and resulting UI are unchanged;
- empty category/connector states do not throw.

### Compatibility groups

- selected group category and group synchronize when groups are added/removed or project data changes;
- add group selects the created group and resets the name field;
- rename group behavior is unchanged;
- add member uses explicit selection or first available fallback;
- remove member behavior is unchanged;
- available-member filtering remains correct;
- empty group/category/connector states render safely.

### Tabs and accessibility

- current tabs remain `Project`, `Connectors`, `Categories`, and `Connector Groups` in the same order;
- current default active tab remains unchanged;
- tab roles, `aria-selected`, accessible labels, and keyboard/click behavior remain equivalent;
- only the active panel is rendered as it is today;
- the visible version badge still uses the canonical current version.

Use a small provider/command test harness. Mock command boundaries, not implementation details inside each panel.

## Required architecture

Use names that fit the repository, but implement equivalent boundaries.

### 1. Small workspace orchestrator

`SettingsWorkspace.tsx` should retain only:

- `useProject()` consumption or a narrow settings-specific adapter;
- active top-tab selection;
- high-level selection/form coordination that genuinely spans panels;
- rendering of the header, tab list, and active panel.

It must not contain the full JSX bodies of all panels or bottom-of-file selector implementations.

### 2. Separate panel modules

Place each current panel in a focused file, for example:

- `ProjectSettingsPanel.tsx`;
- `ConnectorsPanel.tsx`;
- `CategoriesPanel.tsx`;
- `ConnectorGroupsPanel.tsx`;
- a small `SettingsTabs.tsx` if it has an independent responsibility.

Requirements:

- panel props are explicit and typed;
- panels do not call broad context APIs when narrow callbacks/data props are sufficient;
- panel-local form state stays panel-local when it is not shared;
- cross-panel selection state remains in one clear coordinator;
- do not duplicate project/settings lookup logic between panels;
- preserve current markup semantics and CSS classes unless a small change is required for correctness and is covered by tests.

### 3. Pure selector module

Extract and directly test selectors such as:

- category lookup;
- category connector lookup/assignment filtering;
- group connector lookup;
- available group-member connector calculation;
- selected category/group fallback calculation.

Requirements:

- selectors are pure and deterministic;
- no React imports;
- no state mutation;
- avoid repeated full scans where simple indexes/memos improve clarity, but do not add a premature state-management framework;
- reuse `domain/connectorCompatibility` functions rather than reproducing domain rules;
- return stable empty arrays only where it materially helps render behavior; do not optimize blindly.

### 4. Explicit selection synchronization

Extract the category/group fallback rules into a focused hook or pure state-transition helper.

The implementation must avoid effect loops and transient invalid selections.

Required behavior:

- keep a valid current selection;
- otherwise select the first current option;
- otherwise use an empty selection;
- when a newly created category/group ID is returned by a command, select it immediately;
- project replacement/import does not leave stale IDs that crash a panel;
- selection synchronization must not dispatch domain mutations.

Test the transition rules directly where possible.

### 5. Form state and submit handlers

Do not create one enormous form hook for all panels.

- Keep unrelated form state with the panel that owns it.
- Extract reusable form helpers only when there is actual duplication.
- Use typed submit handlers.
- Preserve trimming, reset, first-option fallback, and command return-ID behavior.
- Do not introduce a form library in this release.
- Do not move domain validation into components.

### 6. Preserve current visual contract

No intentional visual redesign is allowed.

Preserve:

- horizontal settings tabs;
- existing headings, labels, button text, empty states, cards, tables/lists, and helper text;
- existing CSS class hooks, including settings tab/category/group active classes;
- current workspace header and version badge;
- current responsive behavior;
- existing focus order and keyboard interaction.

Do not add the future left navigation, labeling section, helper/tip system, icons, or dark-theme tokens.

### 7. Avoid unnecessary public exports

- Export only panel components/helpers that are used across modules or directly tested.
- Keep internal prop types near their owners unless shared.
- Do not create a barrel that introduces circular imports.
- Do not expose settings selectors as domain APIs unless they are genuinely domain-level; UI selection helpers should remain under `components/settings`.

### 8. Documentation and cleanup

Update only:

- README changelog for `0.2.8.5`;
- `AGENTS.md` if it names settings as a monolithic component or needs a UI boundary rule;
- maintained architecture documentation only where current file ownership is described.

Do not change the product roadmap or claim the settings redesign is complete. Explicitly state that this release is structural preparation and the current visual design is unchanged.

Run the recursive cleanup and remove any unused imports/helpers exposed by the split.

## Verification

Run focused settings tests and the complete gate:

```bash
npm ci
npm run test:run -- src/components/settings
npm run coverage
npm run check
npm run test:e2e -- --grep "settings|lifecycle"
npm run check:full
npm run package:source
npm run clean
npm run clean:check
```

If Playwright grep syntax differs, run the relevant settings and lifecycle tests by the supported mechanism and report it accurately.

Manually compare the existing settings screen before/after at the same viewport only as a supplementary check. Do not commit screenshots or visual-diff output.

## Acceptance criteria

The release is complete only when:

- App/schema are `0.2.8.5` everywhere current.
- `0.2.8.4 -> 0.2.8.5` migration is explicit and tested.
- `SettingsWorkspace.tsx` is a small orchestrator rather than an 800-line component.
- Project, connectors, categories, and connector-group panels have focused typed modules.
- Pure settings selectors and fallback calculations are directly tested.
- Selection state remains valid across add/remove/project replacement/empty-state scenarios.
- Existing command payloads, returned-ID selection behavior, trimming, fallback, and form reset semantics are unchanged.
- Current tab order, labels, ARIA semantics, CSS hooks, visual layout, and default tab are unchanged.
- No new settings schema, left navigation, help/tip UI, icons, or dark theme is introduced.
- Coverage and E2E workflows pass without exclusions or weakened assertions.
- Full clean-extraction and cleanliness gates pass.

## Final Codex response

Report:

1. old SettingsWorkspace responsibilities and final file/module map;
2. selector and selection-transition rules extracted;
3. workflow characterization tests added;
4. evidence that DOM labels/classes/accessibility and commands remain equivalent;
5. before/after line counts as context;
6. exact full verification results;
7. settings redesign work intentionally deferred to the later UI release.

Do not describe the settings UI as redesigned; this prompt only decomposes the current implementation.
