# StudioWire IO Review Workflow

Review bundles give the architecture reviewer a reproducible view of a version without committing generated artifacts.

## Roles

- Human/product owner: defines product scope, accepts or rejects version boundaries, and approves release readiness.
- Architecture reviewer: reviews structure, data model stability, validation rules, and implementation risk.
- Codex coder: implements requested work, runs validation, creates review bundles, and addresses approved findings.

## Normal Future Workflow

1. `main` contains the last approved version.
2. Create a feature branch for the next version.
3. Codex implements the requested scope on that branch.
4. Run a review bundle.
5. Upload `tools/diff_logs/<name>` to the reviewer.
6. Reviewer approves or requests fixes.
7. Merge the approved branch.
8. Tag the approved version.

## First Snapshot Bundle

Use snapshot mode when the repository was initialized after the implementation and no useful prior base exists:

```bash
npm run review:bundle -- --name 0.1.1 --snapshot
```

## Future Diff Bundle

Use diff mode when the previous approved version has a valid tag or branch reference:

```bash
npm run review:bundle -- --base v0.1.1 --name 0.2.0
```

If `--base` is omitted in diff mode, the tool tries the latest git tag, `main`, `master`, and `HEAD~1` in that order. If none exists, use snapshot mode.

## Rules

- Review bundles are generated artifacts and should not be committed.
- Review bundles are excluded from Vitest using `vitest.config.ts`; tests must run only against the active source tree.
- After a version is approved, tag it:

```bash
git tag v0.1.1
```

- Future review should use diffs, not full project uploads.
- v0.2 features should not be included in v0.1.1 review bundles: terminal blocks, rear/front TB logic, device-to-TB connections, Excel export, Bartender export, Visio export, backend, database, and auth.
