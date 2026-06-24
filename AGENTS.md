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
- Update `docs/DATA_MODEL.md` and `docs/VALIDATION_RULES.md` before changing the current data shape or validation behavior.
- Active StudioWire IO versions use four numeric components, and the app version and current project schema version must always be identical.
- Preserve JSON import/export compatibility once a format is released.
- `docs/V0_2_ACCEPTANCE.md` defines the maintained v0.2 acceptance gate and must stay aligned with scripts, architecture, docs, and release packaging.

## Naming And Files

- React components and TypeScript types use PascalCase.
- Functions, variables, hooks, and normal modules use camelCase.
- Reducer action constants use UPPER_SNAKE_CASE.
- Validation codes and CSS classes use kebab-case.
- Current documents use stable, non-versioned filenames under `docs/`.
- `README.md` is the single changelog source.

## Cleanup Rule

Every Codex task must finish by removing generated build, test, browser, cache, package, and temporary artifacts, then running the repository cleanliness check. The cleanup must cover `dist`, `coverage`, `.vite`, `.playwright-cli`, `test-results`, `playwright-report`, `blob-report`, `output`, `.source-package`, `*.tgz`, `*.zip`, `*.tsbuildinfo`, and temporary logs/screenshots. Use `npm run clean` and `npm run clean:check`; do not rely on prose-only cleanup.
