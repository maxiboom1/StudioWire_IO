# Codex implementation prompt - StudioWire IO `0.2.8.12`

## Assignment

Implement **only** the StudioWire IO `0.2.8.12` sub-location and rack workflow release.

This is a **feature-dev task**. Do not run Git commands, create commits, create tags, rewrite history, run release packaging, install Playwright browsers, or run release gates.

The repository must start at app/schema version `0.2.8.11` with the model groundwork already implemented.

## Release goal

Add the user-facing workflows for sub-location management and device sub-location assignment. Also change default rack height to 28 RU and add a way to unassign standard devices from racks so racks can be deleted after devices are removed from them.

Do not implement the Add/Edit Device tab redesign, interface drag ordering, connector CSS icons, or color override UI in this prompt.

## Required version policy

The target app version and current schema version are both exactly:

```text
0.2.8.12
```

Update all current-version metadata, current sample data, docs, and README changelog. No new schema shape beyond `0.2.8.11` is expected.

Do not preserve import compatibility for older internal dev versions.

## Sub-location workflows

### Location workspace

Add focused sub-location management inside the existing Location UI.

Required behavior:

- Show sub-locations belonging to the selected location.
- Add a sub-location with name and optional description.
- Rename/edit description for a sub-location.
- Delete a sub-location only when no device references it.
- If delete is blocked, show a practical status message.

Keep location UI as a coordinator. Put reusable sub-location selection/grouping helpers outside React if they are shared by navigator/forms/tests.

### Data commands

Add narrow commands/actions:

- `addSubLocation`
- `updateSubLocation`
- `deleteSubLocation`

Use existing command/reducer patterns. The reducer entry point must stay a thin exhaustive dispatcher.

Deletion rules:

- Block deletion if any device has `subLocationId` equal to the deleted sub-location.
- Do not cascade delete devices.
- Do not silently clear device sub-location during delete.

### Navigator

Render sub-locations as folders under each main location in the left navigator.

Required structure:

- Racks remain under the main location.
- Devices assigned to a sub-location appear inside that sub-location folder.
- Devices with `subLocationId: null` remain accessible under the main location. Use either the existing Devices folder or a clear "No sub-location" group, whichever fits the existing tree model with least churn.
- Terminal blocks should follow the same `subLocationId` grouping if present; otherwise remain under the main location.
- Collapse state must use stable keys and not reset unrelated branches.

Keep tree model construction in pure helpers.

### Add/Edit Device and Device Inspector

Add a `Sub-location` selector wherever a standard device location can be selected:

- Add Device modal
- Edit Device modal
- Device Inspector

Required behavior:

- Options are filtered to the selected `locationId`.
- Include an explicit "No sub-location" option.
- A device may be assigned to a location with `subLocationId: null`.
- When `locationId` changes, preserve `subLocationId` only if it belongs to the new location; otherwise reset it to `null`.
- Rack-mounted devices derive `locationId` from the rack as they do today; if rack movement changes location, reset invalid `subLocationId` to `null`.

Terminal block UI does not need a new sub-location workflow in this prompt unless the implementation naturally shares the same selector safely.

## Rack workflow changes

### Default rack height

Change default rack height for newly created racks from `42` to `28`.

Update:

- `DEFAULT_RACK_DEFAULTS.heightRu`
- Add Rack modal initial height
- Current sample settings default rack height
- Tests that assert new default behavior
- Docs/README references where current defaults are described

Do not rewrite existing rack heights in project data. Existing racks that are 42 RU stay 42 RU.

### Unassign standard device from rack

Add a command/action:

```ts
unassignDeviceFromRack(deviceId: string): void
```

Required behavior:

- Applies only to standard devices (`kind: "device"`).
- Terminal blocks cannot be unassigned by this command.
- If the device is not rack-mounted, return a clear blocked/no-op status.
- If rack-mounted, set:
  - `mountType: "non_rack"`
  - `rackId: null`
  - `rackBottomRu: null`
  - `locationId` to the rack's current `locationId` if the rack still exists, otherwise preserve current device location
- Preserve `rackSizeRu`.
- Preserve `subLocationId` only if it still belongs to the resulting `locationId`; otherwise set it to `null`.
- Stamp project change log and status message.

Expose the action in:

- Rack Inspector assigned-device list, with an Unassign control for each standard device.
- Device Inspector for rack-mounted standard devices.

Do not add bulk unassign in this prompt.

## Documentation updates

Update:

- README changelog for `0.2.8.12`
- `docs/DATA_MODEL.md` if sub-location workflow behavior needs clarification
- `docs/VALIDATION_RULES.md` only if validation text changes

Mention that new racks default to 28 RU and existing racks are not modified.

## Tests

Add focused tests only.

Required scenarios:

- Add/update/delete sub-location reducer/command behavior.
- Deleting a referenced sub-location is blocked.
- Device `subLocationId` resets when location changes to a location that does not own it.
- Add/Edit Device sub-location selector includes "No sub-location" and filters by selected location.
- Navigator groups devices by sub-location and keeps no-sub-location devices visible.
- New rack default is 28 RU.
- `unassignDeviceFromRack` clears rack fields, preserves mount height, preserves location, and blocks terminal blocks.

Do not add Playwright E2E.

## Verification

Run focused checks:

```bash
npm run test:run -- src/state src/components/locations src/components/layout src/components/devices src/components/racks
npm run typecheck
```

If this is too broad or file paths differ, run the closest targeted suites and report the exact commands.

Do not run full release gates. Final `check:dev` is reserved for `0.2.8.14`.

Finish with:

```bash
npm run clean
npm run clean:check
```

## Acceptance criteria

- App/schema/current sample/docs use `0.2.8.12`.
- Users can create/edit/delete sub-locations from Location UI.
- Users can assign standard devices to a sub-location or no sub-location.
- Navigator exposes sub-location folders without hiding devices.
- New racks default to 28 RU.
- Standard rack-mounted devices can be unassigned from a rack.
- Terminal blocks cannot be unassigned by this workflow.
- Focused tests and cleanup pass.

## Final Codex response

Report:

1. Sub-location commands/UI added.
2. Navigator grouping behavior.
3. Device assignment/reset behavior.
4. Rack default and unassign behavior.
5. Tests/checks run and results.
