# Codex implementation prompt — StudioWire IO `0.2.8.3`

## Assignment

Implement **only** the StudioWire IO `0.2.8.3` project-reducer decomposition release.

The repository must start clean and fully passing at app/schema version `0.2.8.2`, including the reproducible clean-extraction release gate. Verify that prerequisite first. Do not absorb missing import or release-tooling work into this release.

Do not run Git commands, create commits, create tags, or rewrite history. This is a behavior-preserving architecture release. Do not redesign the UI or add product behavior. Full device CRUD, dark theme, settings redesign, connector icons, device templates, device-view enhancements, undo/history, routing matrix, and multi-device views are explicitly out of scope.

## Release goal

Turn `src/state/projectReducer.ts` from an approximately 864-line monolithic action switch into a thin, typed reducer entry point backed by coherent pure handlers/commands, without changing any user-observable behavior or project meaning.

The refactor must make upcoming device CRUD and UI work safer, but it must not implement those features now.

## Non-negotiable version policy

The target app version and current schema version are both exactly `0.2.8.3`.

- Update package and lockfile versions, canonical current version, supported versions, JSON Schema title/const, current sample, visible UI, README/docs, and version synchronization.
- Add an explicit tested identity migration `0.2.8.2 -> 0.2.8.3`.
- Preserve all earlier migrations and fixtures.
- Export projects as `0.2.8.3`.
- The version bump is the only intended serialized-data change.

## Refactor method

1. Add characterization tests before moving action bodies.
2. Refactor one action group at a time.
3. Run focused tests after each group.
4. Keep the root reducer API stable throughout.
5. Compare before/after results using deterministic clocks/IDs or by normalizing only explicitly volatile timestamps and version stamps.
6. Never weaken a test to make the refactor pass.

Do not keep a copy such as `projectReducer.old.ts` in the final tree.

## Required behavior characterization

Create a table-driven reducer characterization suite covering every public action and important guarded branch.

At minimum cover:

### Project/session actions

- `NEW_PROJECT`;
- `LOAD_SAMPLE_PROJECT`;
- `IMPORT_PROJECT_JSON`;
- `IMPORT_PROJECT_FAILED`;
- `SET_PERSISTENCE_STATE`;
- `VALIDATE_PROJECT`;
- `DISMISS_IMPORT_ERROR`.

### Project/settings actions

- `UPDATE_PROJECT_INFO`;
- `ADD_CATEGORY`;
- `UPDATE_CATEGORY`;
- `ADD_CATEGORY_CONNECTOR_ASSIGNMENT` including duplicate assignment;
- `REMOVE_CATEGORY_CONNECTOR_ASSIGNMENT` including related compatibility-group-member cleanup;
- `ADD_CONNECTOR_GROUP`;
- `UPDATE_CONNECTOR_GROUP`;
- `ADD_CONNECTOR_GROUP_MEMBER` including duplicate member;
- `REMOVE_CONNECTOR_GROUP_MEMBER`;
- `ADD_CONNECTOR_TYPE`;
- `UPDATE_CONNECTOR_TYPE`;
- `ADD_CABLE_PREFIX` including duplicate/invalid guarded branches present in the current behavior.

### Hierarchy/rack actions

- `ADD_LOCATION`;
- `UPDATE_LOCATION`;
- `DELETE_LOCATION` success and blocked cases;
- `ADD_RACK`;
- `UPDATE_RACK`;
- `DELETE_RACK` success and blocked cases;
- `MOVE_MOUNTED_DEVICE` success, invalid placement, and retired-object block.

### Device/terminal-block actions

- `ADD_DEVICE` success and command failure;
- `ADD_TERMINAL_BLOCK` success and command failure;
- `UPDATE_DEVICE` for a standard device;
- `UPDATE_DEVICE` for a terminal block, preserving fields that are intentionally immutable or inapplicable;
- `UPDATE_DEVICE` retired-object block;
- `RETIRE_DEVICE`, including device status, cable status, numbering-range status, timestamps, and reserved-number behavior.

### Connection actions

- `CONNECT_PORTS` success and domain rejection;
- `DISCONNECT_PORT` success and domain rejection.

For each meaningful case, assert all relevant outputs rather than only one field:

- complete domain collections affected;
- status message;
- import error behavior;
- persistence state preservation/reset behavior;
- project `updatedAt`/`updatedBy` semantics;
- exact changelog message meaning and append behavior;
- validation issues where relevant;
- stable IDs and numbering-ledger behavior.

Use injected or mocked time where practical so tests are deterministic. Do not ignore changelog behavior wholesale.

## Required architecture

Use names that fit the repository, but establish equivalent responsibility boundaries.

### 1. Stable shared state/action types

Move or organize these so UI/context consumers do not need to import the monolithic implementation file for types:

- `ProjectState`;
- `ProjectAction` and action payload types;
- `DeviceDraft`;
- `DevicePortGroupDraft`;
- `TerminalBlockDraft`;
- `DeviceUpdate`.

Provide a stable barrel or compatibility re-export if changing all imports would create unnecessary churn. Avoid circular imports between action types, handlers, domain commands, and the reducer entry point.

### 2. Shared mutation/stamping helpers

Extract project creation and change stamping from the reducer body.

Requirements:

- one canonical helper for project `updatedAt`/`updatedBy` and changelog appending;
- deterministic dependency injection for time in tests without changing normal runtime behavior;
- no React imports;
- no browser APIs;
- no mutation of input state/project;
- no generic abstraction that hides meaningful action-specific messages or error handling.

### 3. Responsibility-focused handler groups

Split action implementation into coherent modules, for example:

- project lifecycle/import/persistence/validation;
- settings/connectors/categories/compatibility groups;
- locations/racks/placement;
- device and terminal-block lifecycle;
- connections;
- shared result helpers.

The exact filenames may differ, but:

- each module must own a clear aggregate or behavior;
- handler functions must be pure;
- action payloads must remain explicit and exhaustively typed;
- domain calculations must stay in domain/state command modules, not move into React;
- handlers may delegate to existing domain commands such as connection, placement, and device creation;
- no module should become a renamed copy of the entire original switch.

### 4. Thin exhaustive reducer entry point

Keep the public function:

```ts
projectReducer(state: ProjectState, action: ProjectAction): ProjectState
```

The entry point should only dispatch/delegate to focused handlers and enforce exhaustiveness. It must not retain long inline mutation bodies.

Valid designs include a narrow grouped switch or an explicitly typed handler map. Whichever design is used:

- TypeScript must fail when a new action is added without handling;
- action-to-handler mapping must be easy to inspect;
- unknown actions must not be silently accepted through `any`;
- no runtime string reflection is required;
- preserve current action names because UI/context compatibility depends on them.

### 5. Keep existing domain commands authoritative

Do not duplicate logic already owned by:

- `domain/connections`;
- `domain/rackPlacement`;
- `state/projectDeviceCommands`;
- `domain/validators`;
- ID/time utilities.

Where reducer code still contains nontrivial reusable domain behavior—especially update, retirement, hierarchy deletion guards, and settings compatibility cleanup—extract it into focused pure commands with direct tests rather than burying it in handler plumbing.

Do not change current retirement semantics, cable numbering, compatibility rules, or validation issue behavior.

### 6. Preserve public behavior exactly

The following are not cleanup opportunities in this release:

- status-message wording;
- changelog message meaning/order;
- whether a guarded no-op clears or preserves `importError`;
- timestamp update rules;
- ID generation semantics;
- cable allocation and reserved-gap behavior;
- terminal-block update restrictions;
- retirement side effects;
- validation ordering;
- persistence-state transitions.

If characterization exposes an actual bug, document it but do not fix it here unless it blocks the refactor or violates the strict safety contract. A product-behavior fix should receive its own later prompt.

### 7. Update tests and imports cleanly

- Keep or improve existing `src/state/projectReducer.test.ts` coverage.
- Add direct tests for extracted commands/handlers instead of testing every branch only through the root reducer.
- Keep one root reducer integration suite proving delegation and complete outcomes.
- Update context/component type imports to a stable type module or barrel.
- Do not expose internal handler modules as public UI APIs.
- Maintain or improve coverage thresholds; do not exclude the new files to preserve percentages.

### 8. Documentation and cleanup

Update only architecture/version documentation relevant to this release:

- README changelog entry for `0.2.8.3`;
- `AGENTS.md` state-layer guidance if module boundaries changed;
- current architecture references in maintained docs where they name the old monolith.

Do not recreate `CHANGELOG.md`.

Run repository cleanup at the end and leave no generated coverage/build/E2E/package artifacts.

## Verification

Run focused tests during each extraction, then the complete reproducible gate:

```bash
npm ci
npm run test:run -- src/state/projectReducer.test.ts
npm run coverage
npm run check
npm run check:full
npm run package:source
npm run clean
npm run clean:check
```

Because `package:source` intentionally creates an archive, run final cleanup after any direct packaging check. Report exact command outcomes and final cleanliness.

Also report a before/after module map and line counts as context only. Reduced line count is not sufficient evidence; behavior tests are mandatory.

## Acceptance criteria

The release is complete only when:

- App/schema are `0.2.8.3` everywhere current.
- `0.2.8.2 -> 0.2.8.3` migration is explicit and tested.
- Every `ProjectAction` is covered by characterization or direct handler tests, including guarded branches.
- `projectReducer.ts` is a thin exhaustive dispatcher, not an 800-line inline switch.
- State/action/draft/update types have a stable responsibility-focused home.
- Stamping/project-creation helpers are centralized and deterministic in tests.
- Settings, hierarchy, device lifecycle, connection, and project lifecycle logic are separated coherently.
- Existing domain modules remain authoritative; logic is not duplicated in handlers.
- Status messages, changelog behavior, persistence state, validation behavior, IDs, cable numbering, retirement, and connection outcomes remain equivalent.
- No UI or serialized-domain feature is added.
- Coverage does not regress through exclusions or weakened assertions.
- Full check, E2E, clean-extraction packaging, and cleanliness gates pass.
- No temporary before/after files remain.

## Final Codex response

Report:

1. original reducer responsibilities and final module boundaries;
2. action-by-action characterization coverage;
3. extracted domain/state commands and why each belongs there;
4. behavior-equivalence evidence, including messages/changelog/timestamps;
5. coverage before and after;
6. exact full-gate results;
7. any reducer behavior intentionally left unchanged despite being questionable.

Do not describe the refactor as behavior-preserving unless the complete characterization and release gates pass.
