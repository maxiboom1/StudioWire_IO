# StudioWire IO Agent Instructions

These instructions apply to future Codex sessions working in this repository.

1. Project data is the source of truth.
2. Drawings are generated views, not source data.
3. Do not implement v0.3.0.0 features unless explicitly requested.
4. Do not add authentication in the current local-only release line.
5. Do not add a server or database in the current local-only release line.
6. Do not invent engineering concepts outside the documented data model.
7. Keep all domain logic separate from UI components.
8. Keep the import/export format stable and documented.
9. Cable numbers must be unique per project.
10. Skipped cable number gaps are reserved and cannot be reused.

## Engineering Boundaries

- The current release line is a local, frontend-only project editor.
- Store project state as structured data and keep UI components as views over that data.
- Put reusable domain rules, validation, numbering, import, and export code outside React components.
- Keep the project reducer entry point as a thin exhaustive dispatcher. Stable state/action/draft types live in `src/state/projectTypes.ts`, reducer dependencies in `src/state/projectReducerContext.ts`, project stamping in `src/state/projectStamping.ts`, and action families in `src/state/projectHandlers/*`.
- Keep `src/state/ProjectContext.tsx` as a React coordination layer only. Public context contracts, command creation, initial restore, autosave lifecycle, and file import/export orchestration live in focused non-UI state modules; `ProjectJsonInput` is its own component.
- Keep `src/components/settings/SettingsWorkspace.tsx` as a small coordinator only. Settings panels own local form state, and settings selectors plus selection fallback helpers live in focused modules under `src/components/settings`.
- Keep Add Device creation split into pure draft/range/validation helpers, a focused form controller, and typed presentation components. Do not fold Add Device presets, local row IDs, range previews, validation, and JSX back into one modal file.
- Keep rack workspace responsibilities split between pure rack canvas/drop-target helpers, the rack-view controller hook, and rack selector/elevation presentation components. Keep the left navigator split between pure tree model helpers, collapsed-key state helpers, and focused branch/item presentation components.
- Update `docs/DATA_MODEL.md` and `docs/VALIDATION_RULES.md` before changing the current data shape or validation behavior.
- Active StudioWire IO versions use four numeric components, and the app version and current project schema version must always be identical.
- Preserve JSON import/export compatibility once a format is declared a real released baseline.
- `docs/V0_2_ACCEPTANCE.md` defines the maintained v0.2 acceptance gate and must stay aligned with scripts, architecture, docs, and release packaging.

## Development Mode Rules

Most StudioWire IO work is feature-development work, not release-packaging work.

Before editing, classify the task as one of:

1. Feature-dev task.
2. Stabilization/refactor task.
3. Release task.

Feature-dev tasks should prioritize product behavior and UI quality. Do not add or expand release tooling, packaging scripts, source ZIP verification, browser-install automation, broad compatibility infrastructure, Playwright scenarios, or large fixture matrices unless the prompt explicitly asks for them.

Release-only commands such as `npm run check:release`, `npm run package:source`, and `npm run check:full` are not required for ordinary feature-dev tasks unless the prompt explicitly says this is a release gate task.

For feature-dev tasks, run focused validation appropriate to the changed area, usually `npm run typecheck`, relevant targeted tests or `npm run test:run`, `npm run build`, `npm run clean`, and `npm run clean:check`. For normal feature branches, prefer `npm run check:dev` when a complete local validation pass is needed.

## Decomposition Rule

Do not start a feature by placing all state, rendering, validation, and transformation logic into one large component or module.

For any non-trivial feature, separate responsibilities into pure domain/model helpers, a React controller hook or coordinator, small presentational components, schema/type definitions when persistent data changes, and focused tests for domain/model behavior.

Avoid creating or expanding UI components beyond roughly 250 lines unless there is a clear reason. If a file must grow larger, explain why and keep pure logic extracted.

## Test Proportionality Rule

Tests should protect behavior, not dominate implementation.

For feature-dev work, add tests for new domain rules, schema changes, migrations required for released versions, data transformations, and reducer actions. Add focused component tests for important interaction logic. Do not add Playwright E2E tests for every visual polish change, large migration fixture matrices for internal dev versions, or broad characterization tests for unchanged behavior merely to increase test count. Prefer manual visual review for layout, spacing, color, and drawing polish unless the behavior is data-critical.

For stabilization and release work, broader coverage, fixture, E2E, and packaging checks are appropriate.

## Internal Dev Schema Compatibility

Before the first public/released schema, StudioWire IO does not guarantee dev-to-dev import compatibility unless the prompt explicitly requests it.

The app version and current schema version must still always match.

When a dev iteration changes only UI or changes unreleased schema shape, update the current version, JSON Schema, TypeScript version constant, current sample, docs, and README changelog. Do not add identity migrations for every internal dev version unless compatibility is explicitly required.

Once a version is declared a real released baseline, preserve import compatibility from that baseline forward.

## Naming And Files

- React components and TypeScript types use PascalCase.
- Functions, variables, hooks, and normal modules use camelCase.
- Reducer action constants use UPPER_SNAKE_CASE.
- Validation codes and CSS classes use kebab-case.
- Current documents use stable, non-versioned filenames under `docs/`.
- `README.md` is the single changelog source.

## Cleanup Hygiene

Do not commit temporary outputs or generated artifacts from local checks.

Before finishing a task, remove or verify absence of `dist`, `coverage`, `.vite`, `.playwright-cli`, `test-results`, `playwright-report`, `blob-report`, `output`, `.source-package`, `.tmp`, `.temp`, `*.tgz`, `*.zip`, `*.tsbuildinfo`, logs, debug files, and screenshots created for testing. Use `npm run clean` and `npm run clean:check`; do not rely on prose-only cleanup.

Release gates are layered and must remain non-recursive:

- `npm run check:dev` is the normal feature-development gate: typecheck, unit/contract tests, build, sample validation, cleanup, and cleanliness check.
- `npm run check` is a stabilization gate: script hierarchy guard, format check, lint, typecheck, build, coverage-backed tests, fixture validation, version synchronization, cleanup, and cleanliness check.
- `npm run check:release` adds scale validation, Chromium browser bootstrap, and Playwright E2E.
- `npm run package:source` creates and verifies the ZIP from a clean extraction and runs `check:release` inside that extraction; it must not call `check:full`.
- `npm run check:full` runs `check:release`, `package:source`, and final cleanup/cleanliness only.

Cleanup and cleanliness checks are recursive under the maintained repository tree, skip `.git` and `node_modules`, avoid following symlinks outside the repository, and report relative paths in sorted order.
