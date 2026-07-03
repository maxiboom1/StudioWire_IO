# Codex implementation prompt - StudioWire IO `0.2.8.13`

## Assignment

Implement **only** the StudioWire IO `0.2.8.13` Add/Edit Device modal UI and I/O ordering release.

This is a **feature-dev task**. Do not run Git commands, create commits, create tags, rewrite history, run release packaging, install Playwright browsers, or run release gates.

The repository must start at app/schema version `0.2.8.12` with sub-location and rack unassign workflows already implemented.

## Release goal

Redesign the Add/Edit Device modal into a two-tab form with a left vertical tab bar, simplify visible metadata fields, add helpers/describers, support `{NAME}` in I/O labels, and allow I/O interface collapse and drag reorder.

Do not implement connector CSS icons, category color editing, or I/O color override UI in this prompt.

## Required version policy

The target app version and current schema version are both exactly:

```text
0.2.8.13
```

Update current-version metadata, current sample if affected by generated label patterns, docs, and README changelog. No new schema shape beyond prior prompts is expected.

Do not preserve import compatibility for older internal dev versions.

## Add/Edit Device modal layout

Replace the current single-scroll modal content with:

- A left vertical tab bar.
- `General` tab.
- `I/O` tab.

Use existing shadcn/Radix-style primitives and current CSS conventions. Keep the modal practical and dense, not a landing-page style redesign.

Required interaction:

- The modal opens on `General`.
- Switching tabs preserves unsaved form state.
- Submit/cancel remain available and clear.
- Validation/warning messages remain visible in the relevant tab area or a stable footer region.
- Existing keyboard/dialog behavior must not regress.

Keep `AddDeviceModal.tsx` and `EditDeviceModal.tsx` as modal/coordinator shells. Extract shared tab layout or field presentation if needed to avoid duplication.

## General tab fields

Show only these user-facing fields for standard devices:

1. `Device Label`
   - Helper: `This label will appear as device header.`
   - Maps to `Device.name`.
2. `Device sub-label`
   - Replaces the visible `Code` label.
   - Helper: `This will appear as device 2nd line header.`
   - Maps to standard-device `code`.
3. `Manufacturer`
   - Helper: `Hardware vendor.`
4. `Device Model`
   - No helper text.
5. `Category`
   - Helper: `Assign the device as video, audio, network, or another category.`
6. `Location`
7. `Sub-location`
   - Include `No sub-location`.
   - Filter by selected location.

Remove these fields from Add/Edit Device UI:

- `Label Prefix`
- `Role`
- `Notes`
- Edit modal rack height field

Required data behavior:

- Keep schema fields.
- `role` writes as `""` from Add/Edit Device.
- `notes` writes as `""` from Add/Edit Device.
- `labelPrefix` is derived from `Device sub-label` if present, otherwise `Device Label`.
- Existing devices that already have role/notes keep or clear according to the command payload. For this prompt, the intended Add/Edit modal behavior is to write stable unused defaults rather than expose editing.
- Device workspace second line should continue to use `device.code || device.labelPrefix || device.model || ""`.

## I/O tab behavior

Rename user-facing wording from "Port Group" to "I/O Interface" in Add/Edit Device modal surfaces.

Required sections:

- Add Device: one I/O interface list.
- Edit Device: existing I/O interfaces and new I/O interfaces may remain separate if that best fits current architecture, but both use the same visual pattern.

### `{NAME}` label token

Extend port label formatting to support:

```text
{NAME}
```

Rules:

- `{NAME}` resolves to the current I/O interface/port group name.
- `{DEVICE}` remains supported and resolves to the device label prefix as today.
- `{00}` and `{000}` continue unchanged.
- Default Add Device quick presets and newly added interfaces should use `{NAME}` in their patterns.
- Existing projects/patterns using `{DEVICE}` must continue to render correctly in current runtime.

Update defaults:

- Video input: `{NAME}-IN-{000}` or a clearer equivalent that includes the interface name without duplicating words awkwardly.
- Video output: `{NAME}-OUT-{000}` or equivalent.
- Audio/network/fallback patterns should use `{NAME}`.
- Generic new interface default should be `{NAME}-{000}`.

If an existing preset group name already includes `IN` or `OUT`, avoid labels like `SDI IN-IN-001`. Prefer a simple consistent pattern such as `{NAME}-{000}` for all default presets if that produces cleaner labels.

### Collapse/expand

Add local collapse state per I/O interface card.

Requirements:

- Collapsed card shows interface name, direction, count, connector, range badge, and actions.
- Expanded card shows full editor fields.
- State is local to the modal and not persisted.
- Collapse controls must be accessible buttons with clear labels.

### Drag-and-drop reorder

Add drag-and-drop reordering for I/O interfaces.

Requirements:

- Reorder controls are available for existing and new interfaces.
- The order affects device drawing because drawing reads `project.portGroups` order.
- Add Device submit preserves draft order when creating `portGroups`.
- Edit Device submit persists existing interface order by reordering the matching `project.portGroups` entries for that device.
- New interfaces are appended in the order shown after existing interfaces unless the UI intentionally allows a combined list. If combined, the persisted order must exactly match the shown order.
- Do not change cable IDs, cable numbers, connections, or port IDs when only ordering changes.
- Avoid dragging changing field values or collapsing cards.

Add pure helpers for reorder operations if shared by Add/Edit hooks.

## Architecture requirements

- Keep domain formatting in `src/domain/portLabels.ts` or a nearby domain module, not React.
- Keep Add/Edit draft transformation logic in existing draft/helper modules.
- Keep `PortGroupEditor` presentational.
- Keep modal shells thin.
- Do not place all tab state, DnD logic, validation, and rendering in one large component.
- Do not add a server, database, authentication, or v0.3.0.0 export concepts.

## Documentation updates

Update:

- README changelog for `0.2.8.13`.
- `docs/DATA_MODEL.md` for `{NAME}` support in `portLabelPattern`.
- Product/spec docs if they describe Add/Edit Device fields or label pattern tokens.

## Tests

Add focused tests only.

Required scenarios:

- `formatPortLabel` supports `{NAME}`, `{DEVICE}`, `{00}`, and `{000}` together.
- Add Device payload derives `labelPrefix` from Device sub-label or Device Label.
- Add/Edit Device no longer exposes Label Prefix, Role, or Notes fields.
- Helper text appears beside the requested General fields.
- Changing location resets invalid sub-location.
- Add Device preserves I/O interface order in submitted payload.
- Edit Device persists changed existing interface order without changing existing port IDs/cable IDs.
- Collapse/expand hides and reveals interface fields without losing edits.
- Drag reorder works through the controller/helper layer; component-level test can use direct events if native DnD is awkward.

Do not add Playwright E2E.

## Verification

Run focused checks:

```bash
npm run test:run -- src/domain/portLabels.test.ts src/components/devices src/state/projectDeviceEdits.test.ts
npm run typecheck
```

If file paths differ, run the closest targeted suites and report the actual commands.

Do not run full release gates. Final `check:dev` is reserved for `0.2.8.14`.

Finish with:

```bash
npm run clean
npm run clean:check
```

## Acceptance criteria

- App/schema/current docs use `0.2.8.13`.
- Add/Edit Device uses left `General` and `I/O` tabs.
- Required field labels and helper text are implemented.
- Label Prefix, Role, Notes, and edit rack height are removed from Add/Edit Device UI.
- `{NAME}` works for generated port labels and defaults.
- I/O interface cards collapse/expand.
- I/O interface order can be changed and persists for drawing order.
- Focused tests and cleanup pass.

## Final Codex response

Report:

1. Modal layout changes.
2. Field mapping/default behavior.
3. `{NAME}` formatting support.
4. Collapse/reorder behavior.
5. Tests/checks run and results.
