# Codex implementation prompt — StudioWire IO `0.2.8.1`

## Assignment

Implement **only** the StudioWire IO `0.2.8.1` strict-import-contract release in the supplied repository.

The repository must start at app/schema version `0.2.8.0`. Verify that prerequisite before editing. If it starts at another version, stop and report the mismatch; do not silently merge releases or skip version steps.

Work directly in the supplied working tree. Do not run Git commands, create commits, create tags, or rewrite history. Do not begin the planned UI-polish work. In particular, do not add full device CRUD, dark theme, connector icons, device templates, new device-view features, undo, routing-matrix behavior, or multi-device drawing views in this release.

## Release goal

Make the current schema a genuinely strict external contract:

- a file already marked as the current version must be validated **exactly as supplied**;
- legacy-only fields may be transformed only by the migration step that owns them;
- no untrusted value may be cast to `ProjectRoot` before current structural validation succeeds;
- realistic historical fixtures must prove migration behavior rather than merely changing `schemaVersion` on a current sample.

This release addresses the remaining import defect in `src/domain/projectImport.ts` and `src/domain/import/migrations.ts`. The present implementation normalizes every payload before Ajv validation, so current-version files can be accepted even when they contain forbidden legacy properties or omit required current properties.

## Known defects to reproduce before fixing

Lock these cases with failing tests first:

1. A current-version cable containing legacy `sourceEndpoint` or `destinationEndpoint` is accepted and the property is silently removed.
2. A current-version terminal block containing forbidden standard-device fields such as `code`, `manufacturer`, `model`, or `role` is accepted and those properties are silently removed.
3. A current-version project missing a required settings array, such as `settings.connectorTypes`, can reach migration/normalization code and return a root-level `import-exception` instead of a path-specific schema-required error.
4. `importProjectValue` passes untrusted data through `payload as ProjectRoot` before current structural validation.
5. The committed legacy fixtures are effectively current sample clones with only the version string changed, so they do not prove historical field conversion.

The regression tests must assert exact failure/success behavior and relevant error paths. A test that only asserts “throws” is insufficient.

## Non-negotiable version policy

The target app version and current project schema version are both exactly `0.2.8.1`.

1. Active versions always use four numeric components.
2. App version and current schema version must always be identical, even when the serialized shape is unchanged.
3. Update every current representation, including at least:
   - `package.json`;
   - the root package and root lockfile entries in `package-lock.json`;
   - `STUDIOWIRE_CURRENT_VERSION` and the supported-version list;
   - JSON Schema title and `schemaVersion.const`;
   - the current sample;
   - current README/docs/release notes;
   - visible version UI;
   - the version-check tool’s expected current value if it still has one.
4. Add an explicit, tested migration step from `0.2.8.0` to `0.2.8.1`. It may be an identity migration because the domain shape is unchanged.
5. Preserve all earlier supported historical identifiers and migration order.
6. Exported projects must use `0.2.8.1`.
7. Do not introduce a second runtime current-version constant.

## Required implementation

### 1. Separate current import from legacy migration

Implement two explicit paths after JSON parsing and safe version detection.

#### Current-version path

For `schemaVersion === STUDIOWIRE_CURRENT_VERSION`:

1. Validate the original parsed `unknown` value directly against the current JSON Schema.
2. Do not call a migration, normalizer, compatibility repair, field remover, default injector, or restamper before that validation.
3. If structural validation fails, return controlled path-specific errors and preserve the open project.
4. Only after successful structural validation may the value be treated as `ProjectRoot` and passed to relational validation.
5. Current files containing legacy-only or unknown properties must be rejected, not silently cleaned.
6. Current files missing required arrays or objects must receive schema errors such as `schema-required` at the nearest useful JSON path, not `import-exception` at `$`.

#### Legacy-version path

For a supported older version:

1. Perform only safe version-aware preflight needed to prevent migration crashes.
2. Run explicit migration steps in source-to-target order.
3. A migration step may transform only differences documented for its source version.
4. Validate the final migrated `unknown` value against the current JSON Schema.
5. Treat the result as `ProjectRoot` only after that validation succeeds.
6. Run relational validation afterward.
7. Verify the migration chain actually reaches the current version. Never unconditionally restamp a partly migrated object as current.
8. When a migration cannot map malformed legacy data safely, return a controlled path-specific incompatibility error instead of dropping data.

Do not retain an unconditional `normalizeCurrentShape` pass. Move endpoint conversion, terminal-block field cleanup, compatibility normalization, or any other repair into the exact legacy step that requires it.

### 2. Remove the unchecked type boundary

The import boundary receives `unknown`. Refactor the involved APIs so that this remains visible in the type system.

Requirements:

- Remove `payload as ProjectRoot` from the import path.
- The current structural validator must accept `unknown`.
- Prefer exposing a type-guard-like result or a result object that makes successful narrowing explicit.
- Legacy migrations must not pretend their input is already a current `ProjectRoot`. Use narrow version-specific input types, safe records, or validated migration DTOs.
- Migration functions must not mutate their input.
- Browser import, storage restore, `tools/validate-project.ts`, `tools/validate-fixtures.ts`, `tools/print-project-summary.ts`, and tests must continue to use the same canonical pipeline.
- Do not duplicate a permissive CLI-only import path.

### 3. Improve structural error paths

Audit Ajv error conversion and preflight formatting.

At minimum:

- required-property failures must include the missing property in the path, for example `$.settings.connectorTypes`;
- array indexes must use one consistent notation throughout import errors;
- forbidden additional properties must point to the exact property;
- syntax, unsupported-version, preflight, migration, schema, and unexpected internal errors must retain distinct stable codes;
- expected invalid input must not be reported as `import-exception`;
- truly unexpected exceptions must still be caught at the outer boundary so the app cannot blank.

Update tests that currently depend on mixed path styles only when the new format is more consistent and is documented.

### 4. Replace fake legacy fixtures with representative historical fixtures

Keep one fixture for every supported schema version under `docs/samples/legacy/`, including the newly previous `0.2.8.0` version.

Requirements:

- Each fixture must intentionally represent the serialized shape expected at that version rather than copying the current sample and changing only `schemaVersion`.
- At least one fixture must exercise legacy cable endpoint names.
- At least one fixture must exercise connector-compatibility normalization from the version where that difference existed.
- At least one fixture before standard device metadata became required must omit those fields and prove the migration adds them correctly.
- Historical terminal-block data must exercise the version-specific cleanup that removes fields no longer legal on a current terminal block.
- Fixtures should remain small, readable, synthetic, and free of customer/private data.
- Add concise comments in tests or maintained docs explaining which historical difference each fixture proves. JSON itself must remain valid JSON without comments.
- Do not create large redundant fixtures.

Strengthen `tools/validate-fixtures.ts` so it verifies more than “import returned ok”:

- expected source version derived from or mapped to the fixture filename;
- final version equals current;
- current structural validation passes;
- expected migrated sentinel fields exist;
- forbidden legacy fields are gone only when the relevant migration maps them;
- stable IDs and representative domain values survive;
- every declared supported version has exactly one maintained legacy fixture, excluding the current sample.

Add current-version invalid fixtures for at least:

- legacy cable endpoint property;
- forbidden terminal-block metadata;
- missing required settings array;
- a nested additional property.

### 5. Preserve import state safety

Keep and extend tests proving:

- failed browser imports leave the currently open project unchanged at the domain-data level;
- `ProjectJsonInput` calls its completion callback only on success;
- structural and migration failures do not add a changelog entry, schedule a replacement autosave, or clear recoverable storage;
- current valid export/import remains equivalent except for explicitly documented volatile metadata;
- all supported legacy projects reach `0.2.8.1` through explicit steps.

Do not weaken comparisons by omitting domain collections.

### 6. Align documentation with the actual contract

Update the current documentation and README changelog to state clearly:

- current-version imports are strict and are never repaired before validation;
- only known older versions enter migration;
- which legacy versions are supported;
- structural validation precedes relational validation;
- legacy transformations are version-owned and do not apply to current files;
- app/schema version is `0.2.8.1`.

Update `AGENTS.md` only if needed to make this boundary explicit. Do not recreate `CHANGELOG.md`.

## Verification

The repository currently has separate release-tooling issues reserved for `0.2.8.2`. Do not hide or opportunistically rewrite those in this release. Run the reliable individual gates and report exact outcomes:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run test:run
npm run coverage
npm run validate:fixtures
npm run validate:project -- docs/samples/sample-project.studiowire.json
npm run summary -- docs/samples/sample-project.studiowire.json
npm run version:check
npm run clean
npm run clean:check
```

Also run the focused import/migration tests repeatedly. Do not claim `npm run check:full` passes until the separate `0.2.8.2` release repairs packaging and clean-install Playwright setup.

## Acceptance criteria

The release is complete only when all are true:

- App and current schema are `0.2.8.1` everywhere current.
- `0.2.8.0 -> 0.2.8.1` is an explicit tested migration.
- A current file is structurally validated before any transformation.
- Current files containing `sourceEndpoint`, `destinationEndpoint`, terminal-block-only forbidden metadata, or any other additional property are rejected at exact paths.
- Missing current required properties produce schema errors, not migration exceptions.
- No untrusted import is cast to `ProjectRoot` before current structural validation.
- Legacy normalization occurs only in the migration step that owns it.
- The migration chain cannot silently skip a step and restamp the result.
- Every supported legacy fixture represents a meaningful historical difference and verifies expected output.
- Browser, restore, and CLI import paths use the same strict pipeline.
- Failed imports preserve the current project and recoverable storage.
- Unit, coverage, fixture, build, version, and cleanliness gates listed above pass.
- No generated files remain in the source tree.

## Final Codex response

Report:

1. the old and new import flow in order;
2. every unsafe cast/normalization boundary removed;
3. the historical difference represented by each legacy fixture;
4. exact regression cases and error paths now enforced;
5. exact verification results;
6. any strictly non-blocking limitation left for `0.2.8.2`.

Do not claim the contract is strict if current-version files are still modified before structural validation.
