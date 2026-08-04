# Codex implementation prompt - StudioWire IO `0.2.8.11`

## Assignment

Implement **only** the StudioWire IO `0.2.8.11` model groundwork release.

This is a **feature-dev task**. Do not run Git commands, create commits, create tags, rewrite history, run release packaging, install Playwright browsers, or run release gates. Do not implement the later UI workflows, modal redesign, connector icon rendering, or final drawing polish in this prompt.

The repository starts at app/schema version `0.2.8.10`.

## Release goal

Add the persistent data fields needed for sub-locations, category colors, connector icon keys, and I/O interface color overrides. Keep implementation data-first and local/frontend-only.

Do **not** preserve import compatibility for `0.2.8.10` or older dev exports. This dev schema may reject older dev files. Keep the current sample/schema as the authoritative current contract.

## Required version policy

The target app version and current schema version are both exactly:

```text
0.2.8.11
```

Update all current-version metadata:

- `package.json`
- `package-lock.json` if affected
- TypeScript current-version constant
- JSON Schema title and `schemaVersion.const`
- current sample project
- visible UI/version references if present
- README current-version text and changelog
- `docs/DATA_MODEL.md`
- `docs/VALIDATION_RULES.md`

Do not add a migration step from `0.2.8.10` to `0.2.8.11`. Update tests/docs so older internal dev schemas are not treated as guaranteed import baselines.

## Data model changes

Add these persistent fields.

### Project root

Add:

```ts
subLocations: SubLocation[];
```

`subLocations` must be a top-level array like `locations`, `racks`, and `devices`.

### SubLocation

Add a domain type:

```ts
interface SubLocation {
  id: string;
  locationId: string;
  name: string;
  description: string;
}
```

Rules:

- A sub-location belongs to exactly one main location.
- Sub-location names must be non-empty.
- Duplicate sub-location names are allowed across different locations.
- Duplicate sub-location names inside the same location should be reported as warnings, not structural import errors.

### Device

Add:

```ts
subLocationId: string | null;
```

Rules:

- `null` means the device is assigned to the main location but not to a sub-location.
- If set, `subLocationId` must reference a sub-location whose `locationId` matches the device `locationId`.
- Terminal blocks also carry this field, but no special TB workflow is required in this prompt.

### Category

Add:

```ts
color: string;
```

Rules:

- Use hex colors in `#RRGGBB` format.
- Add deterministic default colors to `DEFAULT_CATEGORIES`.
- Keep colors visually distinct and restrained.

Recommended defaults:

- Video: `#2563EB`
- Audio: `#DC2626`
- Network: `#059669`
- Reference: `#7C3AED`
- RF: `#D97706`
- Control: `#475569`

### ConnectorType

Add:

```ts
iconKey: ConnectorIconKey;
```

Define a fixed enum/list for in-app CSS-drawn connector shapes:

```ts
const CONNECTOR_ICON_KEY_VALUES = ['bnc', 'xlr', 'rj45', 'fiber', 'sfp', 'hdmi', 'db25', 'generic'] as const;
```

Rules:

- `iconKey` is a stable data token only.
- Do not store uploaded images, file paths, SVG strings, or user-provided icon drawings.
- Use obvious defaults: BNC/Micro BNC/SDI DIN/MADI BNC -> `bnc`; XLR -> `xlr`; RJ45 -> `rj45`; SFP -> `sfp`; Fiber/MADI Fiber -> `fiber`; HDMI -> `hdmi`; DB25 -> `db25`; everything else -> `generic`.

### PortGroup

Add:

```ts
colorOverride: string | null;
```

Rules:

- `null` means inherit the category color.
- If set, it must use `#RRGGBB`.
- No UI for this field in this prompt.

## Import/export policy

Do not preserve `0.2.8.10` import compatibility.

Required behavior:

- Current exports write `schemaVersion: "0.2.8.11"` and include all new fields.
- Current imports validate exactly against the `0.2.8.11` schema.
- Older dev files may fail import. This is acceptable and should be documented.
- Remove, skip, or update tests that require automatic dev-to-dev import compatibility from `0.2.8.10`.
- Do not add broad migration fixture matrices.

Existing historical migration code may remain if it does not block the current schema, but do not expand it for this release.

## Validation changes

Add focused relational validation for:

- `duplicate-sub-location-name`: warning when a location has more than one sub-location with the same trimmed case-insensitive name.
- `sub-location-without-location`: error when a sub-location references a missing location.
- `sub-location-name-required`: error when a sub-location name is empty.
- `device-sub-location-missing`: error when `Device.subLocationId` references a missing sub-location.
- `device-sub-location-location-mismatch`: error when a device sub-location belongs to a different main location.
- `category-color-invalid`: error when `Category.color` is not `#RRGGBB`.
- `connector-icon-key-invalid`: error when `ConnectorType.iconKey` is not one of the fixed keys.
- `port-group-color-override-invalid`: error when a non-null `PortGroup.colorOverride` is not `#RRGGBB`.

Use validation code names exactly as above unless a nearby existing validator pattern requires a small naming adjustment.

## Architecture requirements

- Keep schema/domain types in the existing domain model locations.
- Keep validation in domain validation modules, not React components.
- Keep reducer entrypoint thin and exhaustive if action types are touched.
- Add helper functions only when they remove real duplication.
- Do not create UI components for sub-location management, icon selection, or color editing in this prompt.
- Do not add authentication, server storage, database storage, or v0.3.0.0 export concepts.

## Tests

Add focused tests only for the new model behavior.

Required focused scenarios:

- Empty project/sample creation includes `subLocations: []`.
- Current sample validates structurally with all new fields.
- Duplicate sub-location names inside one location are warnings.
- Device may have `subLocationId: null`.
- Device with valid sub-location passes.
- Device with missing/mismatched sub-location reports the new validation errors.
- Invalid category color reports `category-color-invalid`.
- Invalid connector icon key reports `connector-icon-key-invalid`.
- Invalid port-group color override reports `port-group-color-override-invalid`.
- Current import/schema tests no longer require `0.2.8.10` compatibility.

Do not add Playwright tests, release-package tests, or broad legacy fixture matrices.

## Documentation updates

Update:

- `docs/DATA_MODEL.md` for `subLocations`, `SubLocation`, `Device.subLocationId`, `Category.color`, `ConnectorType.iconKey`, and `PortGroup.colorOverride`.
- `docs/VALIDATION_RULES.md` for the new validation codes.
- README changelog with a `v0.2.8.11` entry.

The docs must explicitly state that this internal dev schema may reject older dev exports.

## Verification

Run focused checks only:

```bash
npm run test:run -- src/domain/validators.test.ts src/domain/projectImport.test.ts src/domain/projectContract.test.ts
npm run typecheck
```

If the exact targeted test command needs adjustment because files move or tests are split, run the closest focused domain/schema/import tests and report the actual commands.

Do not run:

- `npm run check`
- `npm run check:release`
- `npm run check:full`
- `npm run package:source`
- Playwright install or E2E

Finish with:

```bash
npm run clean
npm run clean:check
```

## Acceptance criteria

- App/schema/current sample/docs use `0.2.8.11`.
- New schema fields exist and are required in current-version data.
- No `0.2.8.10 -> 0.2.8.11` compatibility migration is added.
- Current sample validates.
- New validation rules are covered by focused tests.
- No UI workflow for sub-locations, colors, or icons is implemented yet.
- Cleanup passes.

## Final Codex response

Report:

1. Version bump locations updated.
2. New data fields and defaults added.
3. Import compatibility behavior changed intentionally.
4. Validation rules/tests added.
5. Docs updated.
6. Exact checks run and results.
