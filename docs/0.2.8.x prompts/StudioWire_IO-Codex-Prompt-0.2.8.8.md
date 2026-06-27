# Codex Prompt — StudioWire IO `0.2.8.8`

## Task title

`0.2.8.8` — Development workflow cleanup and feature-development guardrails

## Context

You are working on StudioWire IO after the `0.2.8.7` stabilization/refactor pass.

The project is now stable enough to return to product/UI feature work. This task is **not** a feature task and **not** a release-packaging task. It is a small process cleanup so future Codex work is lighter, more focused, and less test/tooling-heavy.

The previous stabilization work intentionally added many safety checks, release gates, source-packaging scripts, migration fixtures, and E2E checks. Those are useful for periodic stabilization and release checkpoints, but they should not dominate normal feature development.

The owner’s current direction:

- This is still a development-stage product.
- The goal is the final product, not continuously expanding dev tooling.
- Future work should prioritize UI/product features.
- Codex should decompose features from the start instead of creating large mixed modules.
- Tests should be proportional to the task.
- Dev-to-dev backward compatibility is **not required** before the first real/public release.
- The app version and schema version must still always be identical, using the four-part format such as `0.2.8.8`.

## Primary goals

Implement only the following focused changes:

1. Bump the current app/schema version from `0.2.8.7` to `0.2.8.8` everywhere current-version metadata appears.
2. Make the coverage/check command stable in local development by forcing Vitest coverage to run with one worker.
3. Add or update a lightweight `check:dev` script for ordinary feature-development validation.
4. Update `AGENTS.md` so future Codex tasks follow feature-dev/stabilization/release lanes, decomposition rules, proportional testing, cleanup hygiene, and dev-stage compatibility policy.
5. Update project docs so normal feature work does **not** require release packaging, full E2E, or clean-extraction verification.
6. Document that dev-to-dev schema compatibility is not guaranteed before the first real release.
7. Keep release tooling available, but stop presenting it as mandatory for every dev iteration.

Do **not** implement new UI/product features in this task.

---

## Non-goals

Do **not** do any of the following unless absolutely required by the version bump:

- Do not implement device CRUD.
- Do not implement dark theme.
- Do not redesign Settings.
- Do not change the device drawing UI.
- Do not add connector icons.
- Do not add predefined templates.
- Do not add undo/history.
- Do not add Dante-style routing matrix features.
- Do not add multi-device view.
- Do not expand source packaging.
- Do not add more Playwright scenarios.
- Do not add large migration fixture matrices.
- Do not preserve compatibility for every internal dev patch just because the version number changed.
- Do not create broad characterization tests for unchanged behavior.
- Do not refactor unrelated modules.

This task should be small and focused.

---

## Required version policy for this task

StudioWire IO now follows this rule:

> The app version and current schema version are always the same four-part version string.

For this task, the current version is:

```text
0.2.8.8
```

Update current-version references across the project, including but not limited to:

- `package.json` version if applicable;
- TypeScript version constants;
- JSON Schema `$id`, title/version text, or version enum/consts if applicable;
- current sample project `schemaVersion`;
- README current-version references;
- docs that describe the current version;
- UI/about/version display if present;
- validation/version-check expected values.

Use the full four-part version everywhere for current-version references: `0.2.8.8`, not `0.2.8` or `0.2.8.x`.

Historical changelog entries may keep their historical version numbers. Do not blindly replace old changelog history.

Add a new README changelog entry for `0.2.8.8` describing this as a development-workflow cleanup, not a product-feature release.

---

## Dev-stage compatibility policy

Before the first real/public StudioWire IO release, dev-to-dev backward compatibility is not guaranteed.

For this task:

- Do not add a new identity migration solely to support importing `0.2.8.7` as a legacy version.
- Do not add a new legacy fixture solely because the current version became `0.2.8.8`.
- Do not expand the list of guaranteed historical dev versions.
- Update docs and agent rules to say compatibility is guaranteed only from the first declared release baseline forward.
- Existing migration code and fixtures may remain if they are already present and passing, but do not grow them for this task unless a small change is strictly necessary to keep the current project functional.

If existing tests require every internal dev version to remain import-compatible, update those tests to match the new policy instead of adding another dev-to-dev migration.

The current schema/sample/project contract must still be valid for `0.2.8.8`.

---

## Script changes

### 1. Stabilize coverage

The previous review found that tests pass, but coverage/check can be unstable in some environments because Vitest worker orchestration stalls or fails.

Update the coverage script to force a single worker. Use the project’s existing script names, but the effective command should be equivalent to:

```json
"coverage": "vitest run --coverage --maxWorkers=1 --minWorkers=1"
```

Use the exact syntax supported by the installed Vitest version.

### 2. Add or update `check:dev`

Add a lightweight feature-development check script for normal day-to-day work.

It should validate the common product-development path without invoking release packaging, clean extraction, or mandatory Playwright browser installation.

Recommended content:

```json
"check:dev": "npm run typecheck && npm run test:run && npm run build && npm run validate:project -- docs/samples/sample-project.studiowire.json && npm run clean && npm run clean:check"
```

Adjust only if the existing project scripts require a slightly different command.

`check:dev` should be documented as the normal feature-development gate.

### 3. Preserve release scripts but classify them correctly

Do not delete existing release scripts such as:

- `check:release`
- `check:full`
- `package:source`
- E2E scripts

But make the docs clear that these are release/stabilization tools, not required for every feature-dev task.

---

## `AGENTS.md` update

Update `AGENTS.md` with clear practical rules for future Codex work.

Add or revise sections similar to the following. Use the project’s existing tone and structure.

### Development mode classification

Add this policy:

```md
## Development Mode Rules

Most StudioWire IO work is feature-development work, not release-packaging work.

Before editing, classify the task as one of:

1. Feature-dev task
2. Stabilization/refactor task
3. Release task

Feature-dev tasks should prioritize product behavior and UI quality. Do not add or expand release tooling, packaging scripts, source ZIP verification, browser-install automation, or broad compatibility infrastructure unless the prompt explicitly asks for it.

Release-only commands such as `npm run check:release`, `npm run package:source`, and `npm run check:full` are not required for ordinary feature-dev tasks unless the prompt explicitly says this is a release gate task.

For feature-dev tasks, run focused validation appropriate to the changed area, usually:

- `npm run typecheck`
- relevant targeted tests or `npm run test:run`
- `npm run build`
- `npm run clean`
- `npm run clean:check`

For normal feature branches, prefer `npm run check:dev` when a complete local validation pass is needed.
```

### Decomposition rule

Add this policy:

```md
## Decomposition Rule

Do not start a feature by placing all state, rendering, validation, and transformation logic into one large component or module.

For any non-trivial feature, first separate responsibilities into:

- pure domain/model helpers;
- React controller hook or coordinator;
- small presentational components;
- schema/type definitions when persistent data changes;
- focused tests for domain/model behavior.

Avoid creating or expanding files beyond roughly 250 lines for UI components unless there is a clear reason. If a file must grow larger, explain why and keep pure logic extracted.
```

### Test proportionality rule

Add this policy:

```md
## Test Proportionality Rule

Tests should protect behavior, not dominate implementation.

For feature-dev work:

- add tests for new domain rules, schema changes, migrations required for released versions, data transformations, and reducer actions;
- add focused component tests for important interaction logic;
- do not add Playwright E2E tests for every visual polish change;
- do not add large migration fixture matrices for internal dev versions;
- do not write broad characterization tests for unchanged behavior merely to increase test count;
- prefer manual visual review for layout, spacing, color, and drawing polish unless the behavior is data-critical.

For stabilization and release work, broader coverage, fixture, E2E, and packaging checks are appropriate.
```

### Internal dev schema compatibility

Add this policy:

```md
## Internal Dev Schema Compatibility

Before the first public/released schema, StudioWire IO does not guarantee dev-to-dev import compatibility unless the prompt explicitly requests it.

The app version and current schema version must still always match.

When a dev iteration changes only UI or changes unreleased schema shape, update the current version, JSON Schema, TypeScript version constant, current sample, docs, and README changelog. Do not add identity migrations for every internal dev version unless compatibility is explicitly required.

Once a version is declared a real released baseline, preserve import compatibility from that baseline forward.
```

### Cleanup hygiene

Ensure the existing cleanup guidance remains present and clear:

```md
## Cleanup Hygiene

Do not commit temporary outputs or generated artifacts from local checks.

Before finishing a task, remove or verify absence of:

- `dist/`
- `coverage/`
- `playwright-report/`
- `test-results/`
- Playwright temporary browser/test output folders
- `.source-package/`
- `.tmp/` / `.temp/` folders
- logs, debug files, generated ZIPs, and TypeScript build info files

Use the project cleanup scripts when available:

- `npm run clean`
- `npm run clean:check`
```

Avoid duplicating sections if similar content already exists. Merge and improve the existing content instead of appending repeated rules.

---

## Documentation updates

Update docs to reflect the new development workflow.

Relevant docs may include:

- `README.md`
- `AGENTS.md`
- `docs/REVIEW_WORKFLOW.md`
- any development/checklist/release documentation currently present

Required documentation changes:

1. Describe `npm run check:dev` as the normal feature-development validation command.
2. Describe `npm run check`, `npm run check:release`, `npm run check:full`, E2E, and `package:source` as stabilization/release-level gates.
3. Explain that release packaging is not expected after every UI/product feature.
4. Explain that Playwright/E2E is valuable but not required for every visual polish task.
5. State that dev-to-dev compatibility is not guaranteed before the first real/public release.
6. State that app/schema versions still always match, even during dev versions.
7. Keep the roadmap direction: v0.2 is closed without prewire export; prewire/export work belongs later, not in this task.

If `docs/REVIEW_WORKFLOW.md` assumes only GitHub master review, soften it so it supports both workflows:

- review from an uploaded archive;
- review from a pushed branch/repository state.

Do not over-document. Keep the workflow practical and short.

---

## Test guidance for this task

This task should not add a lot of tests.

Allowed test updates:

- update version-sync tests if they expect `0.2.8.7`;
- update fixture validation expectations if they incorrectly require dev-to-dev compatibility;
- add at most one very small script/documentation assertion if the project already has such tests and it is necessary.

Do not add broad new unit suites, Playwright tests, or release-package tests for this task.

---

## Cleanup expectations

After implementation:

- no generated ZIPs should remain committed;
- no extracted source-package folders should remain;
- no coverage/build/test output should remain;
- no temporary logs or test artifacts should remain;
- root folder should stay clean.

Use the existing cleanup scripts.

---

## Acceptance checks

Run the focused checks appropriate for this task.

Required:

```bash
npm run typecheck
npm run test:run
npm run build
npm run version:check
npm run validate:project -- docs/samples/sample-project.studiowire.json
npm run check:dev
npm run clean
npm run clean:check
```

Also run coverage once to confirm the worker fix:

```bash
npm run coverage
```

Do **not** run `package:source` or clean-extraction release packaging unless you changed release packaging code. This task should not need it.

Do **not** add Playwright browser installation as part of ordinary dev checks.

---

## Final response requirements for Codex

When finished, summarize:

1. Version bump locations updated to `0.2.8.8`.
2. Exact script changes made.
3. What changed in `AGENTS.md`.
4. What docs changed.
5. Whether any compatibility tests/fixtures were updated because of the dev-stage compatibility policy.
6. Checks run and their results.
7. Any remaining known issues.

Keep the final response practical. Do not claim this is a product-feature release.
