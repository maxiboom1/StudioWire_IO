# Codex implementation prompt — StudioWire IO `0.2.8.2`

## Assignment

Implement **only** the StudioWire IO `0.2.8.2` reproducible-release-gates release.

The repository must start clean and passing at app/schema version `0.2.8.1`. Verify that prerequisite first. If the strict import work from `0.2.8.1` is absent or incomplete, report the mismatch rather than absorbing it into this release.

Do not run Git commands, create commits, create tags, or rewrite history. Do not add product features or redesign the interface. Full device CRUD, dark theme, settings redesign, connector icons, device-view enhancements, hardware templates, undo, routing matrix, and multi-device views are out of scope.

## Release goal

Make every documented release command reproducible from a clean source extraction and make the repository-cleanliness rule enforceable recursively.

This release must fix the observed tooling defects rather than documenting around them:

- `tools/package-source.mjs` creates the ZIP at an incorrect relative path after changing `cwd`;
- the script tries to inspect a ZIP with `tar -tf`;
- it does not perform the required clean-extraction install and verification;
- `npm ci` does not install the Playwright Chromium browser, so clean-install E2E fails;
- the composite `npm run check` has stalled even though the underlying tests pass independently;
- `check-clean.mjs` checks generated extensions only at repository root, allowing nested artifacts to escape;
- `docs/V0_2_ACCEPTANCE.md` overstates some E2E proof;
- `src/components/ui/separator.tsx`, `src/components/ui/tooltip.tsx`, and `@radix-ui/react-tooltip` appear unused and should be removed if the audit still confirms that state.

## Non-negotiable version policy

The target app version and current schema version are both exactly `0.2.8.2`.

- Update package metadata, lockfile, current version constant, supported versions, JSON Schema title/const, current sample, visible UI, README/docs, and version checks.
- Add and test the identity migration `0.2.8.1 -> 0.2.8.2`.
- Preserve every earlier migration and fixture.
- Export current projects as `0.2.8.2`.
- Current version strings must still have four components.
- Refactor `tools/check-version.mjs` so it does not require a second manually maintained hard-coded current release if practical. It should read the canonical package version, assert four-component formatting, and compare all other current representations to it. The implementation task itself must still verify the target is exactly `0.2.8.2`.

## Required implementation

### 1. Define non-recursive verification layers

Reorganize package scripts into explicit layers so clean-package verification cannot recursively invoke packaging.

Use names appropriate to the repository, but the behavior must be equivalent to:

1. **Core gate** — formatting check, lint, typecheck, build, unit/contract/migration tests with coverage, fixture validation, and version synchronization.
2. **Release gate without packaging** — core gate plus scale check and Playwright E2E.
3. **Source package verification** — create/inspect/extract archive, run `npm ci` and the release gate without packaging inside the extraction, validate the packaged sample/schema, then clean the extraction.
4. **Full gate** — release gate, source package verification, then final cleanup and cleanliness check.

Requirements:

- `npm run check` must be deterministic and non-interactive.
- `npm run check:full` must not call itself indirectly.
- `npm run package:source` must not invoke a command that invokes `package:source` again.
- Keep quick developer scripts such as `test:run` available.
- Avoid running the entire Vitest suite twice in the normal core gate unless there is a demonstrated reason. A coverage run already executes tests and may be the authoritative core test run.
- No script may hide failures with `|| true`, ignored exit codes, arbitrary sleeps, or blanket retries.

Document the exact command hierarchy in README, `docs/V0_2_ACCEPTANCE.md`, and `AGENTS.md`.

### 2. Diagnose and eliminate the composite-test stall

Reproduce the current `npm run check` behavior before changing it. Determine whether the stall is caused by duplicate Vitest runs, worker/pool configuration, leaked handles, child-process orchestration, or another concrete cause.

Requirements:

- Fix the cause rather than only increasing a timeout.
- Use explicit Vitest run mode; no watcher may be entered by a release script.
- Configure a stable worker/pool strategy if needed.
- Ensure test files release timers, browser-like listeners, and other handles.
- Keep coverage thresholds at least as strict as the current values.
- Run the corrected `npm run check` at least three consecutive times in the same clean working tree and report all three outcomes.
- Add a small script-level or configuration regression check where practical so an accidental watcher command cannot return to the release gate.

### 3. Install the Playwright browser reproducibly

Add an explicit supported browser bootstrap command, for example `test:e2e:install`, using the Playwright version pinned in the lockfile.

Requirements:

- A documented clean sequence must work from a machine without the Playwright browser cache:

  ```bash
  npm ci
  npm run test:e2e:install
  npm run test:e2e
  ```

- The release gate and clean-extraction verification must invoke the bootstrap automatically or fail with a precise actionable message before E2E starts.
- Install only the browser(s) actually used by the configured suite; currently that is Chromium.
- Do not add a postinstall that silently downloads all Playwright browsers for every normal dependency install unless there is a strong documented reason.
- Do not depend on an already-populated user browser cache.
- Preserve Playwright trace/video/screenshot-on-failure behavior, and ensure those artifacts are cleaned afterward.
- Keep the Playwright package/browser version compatible and lockfile-controlled.

### 4. Rebuild source packaging as a real ZIP workflow

Repair `tools/package-source.mjs` or replace it with responsibility-focused modules/tests.

The implementation must be cross-platform for the supported Node environments and must not inspect ZIP files through `tar`.

Preferred approach:

- use a small maintained JavaScript ZIP library for creation, listing, and extraction; or
- use another genuinely cross-platform implementation whose dependencies are declared and locked.

Do not require a globally installed `zip`, `unzip`, GNU `tar`, or PowerShell for the normal path.

Required behavior:

1. Read the canonical four-part version.
2. Create a staging directory and archive named `StudioWire_IO-0.2.8.2.zip`.
3. Include only allowlisted maintained source/config/docs entries.
4. Write a source-package manifest.
5. Inspect every ZIP entry using ZIP-aware code.
6. Reject path traversal, absolute paths, drive-qualified paths, duplicate dangerous entries, symlinks escaping the package root, and forbidden paths/extensions.
7. Confirm all required entries exist, including lockfile, source, schema, maintained tools/config, and `docs/samples`.
8. Extract to a fresh temporary directory created outside the repository, preferably with `mkdtemp` under the OS temp directory.
9. Confirm the extraction contains exactly one expected package root.
10. Run `npm ci` inside the extraction.
11. Install the configured Playwright browser inside the extraction.
12. Run the non-packaging release gate inside the extraction.
13. Run current sample validation and summary inside the extraction.
14. Confirm the packaged schema/current sample/version are synchronized.
15. Remove extraction and staging in `finally`, on both success and failure.
16. Never delete an unrelated path even when a command fails.

The direct packaging command may leave the verified ZIP in ignored `.source-package/` for intentional retrieval. The full gate must remove it at the end so the source tree finishes clean.

Add automated tests for package-entry filtering and path-safety logic. Where possible, make archive creation/listing/extraction helpers importable rather than testing only through a large side-effect script.

### 5. Make cleanup and cleanliness checks recursive

Refactor `tools/clean-generated.mjs` and `tools/check-clean.mjs` to walk the maintained tree safely.

Requirements:

- Exclude `.git` and `node_modules` from traversal.
- Do not follow symlinks outside the repository.
- Detect known generated directory names at any depth where they are not intentionally allowlisted, including:
  - `dist`;
  - `build`;
  - `coverage`;
  - `.vite`;
  - `.playwright-cli`;
  - `test-results`;
  - `playwright-report`;
  - `blob-report`;
  - `output`;
  - `.source-package`.
- Detect generated/temporary files at any depth, including `*.tsbuildinfo`, `*.tgz`, `*.zip`, `*.trace.zip`, `*.log`, `*.tmp`, common editor/OS debris, and Playwright screenshots/traces outside approved transient report directories.
- Preserve maintained assets such as the application logo; do not ban all PNG files.
- Preserve committed JSON samples and migration fixtures.
- Keep root-level obsolete checks for `samples/` and `CHANGELOG.md`.
- Print paths relative to repository root in deterministic sorted order.
- Add tests using temporary nested directory trees.
- Cleanup must be idempotent and cleanliness check must pass twice consecutively.

Update the cleanup rule in `AGENTS.md` if the real behavior changes.

### 6. Correct acceptance evidence

Audit `docs/V0_2_ACCEPTANCE.md` against the executable tests.

Do not claim more than is proved. Specifically address the current overstatements:

- “location, rack, device, and terminal-block creation/editing” must distinguish creation from the editing workflows actually covered;
- storage coverage must distinguish unavailable/corrupt storage from a quota failure after a user edit;
- export/import equivalence must state whether full domain data or only a summary is compared.

Choose one of two valid approaches for each item:

1. add the missing focused automated test; or
2. narrow the acceptance wording to the behavior actually tested.

Do not implement full device CRUD merely to satisfy old wording. That is a future UI/product release.

Strengthen the representative export/import E2E assertion to compare complete project-domain data after normalizing only explicitly volatile fields such as timestamps/changelog entries created by the import itself. Do not reduce the comparison to counts and a few labels.

Add a focused storage-failure browser test if the application already exposes the necessary failure injection seam. It should prove that a write/quota failure after a user-visible edit leaves the in-memory project usable and exportable. If adding a safe deterministic seam would become product work, narrow the documentation and retain the unit proof instead.

### 7. Remove confirmed dead primitives/dependency

Re-run import/dependency analysis.

If still unused:

- delete `src/components/ui/separator.tsx`;
- delete `src/components/ui/tooltip.tsx`;
- remove `@radix-ui/react-tooltip` from `package.json` and lockfile.

Do not remove them merely because of a single textual search. Check static imports, aliases, tests, configuration, and dynamic usage. Report the evidence. If either is used after `0.2.8.1`, keep it and explain why.

Do not perform the larger UI hotspot refactor in this release.

## Verification

Run and report exact results for all of the following from a clean tree:

```bash
npm ci
npm run test:e2e:install
npm run check
npm run check
npm run check
npm run check:scale
npm run test:e2e
npm run package:source
npm run check:full
npm run clean
npm run clean:check
npm run clean:check
```

Also inspect the generated ZIP entry list and report:

- archive path and size;
- number of entries;
- required-entry result;
- forbidden-entry result;
- clean-extraction path used;
- exact commands run inside the extraction;
- extraction cleanup result.

After reporting verification, remove generated archives and temporary artifacts unless the user explicitly asked Codex to retain the release artifact outside the source tree.

## Acceptance criteria

The release is complete only when:

- App/schema are `0.2.8.2` everywhere current.
- `0.2.8.1 -> 0.2.8.2` migration is explicit and tested.
- `npm run check` completes successfully three consecutive times without hanging.
- A clean machine/browser cache can run the documented Chromium E2E bootstrap and suite.
- `package:source` creates and inspects a real ZIP without `tar -tf` or incorrect relative paths.
- Package verification installs and runs the non-recursive release gate inside a fresh extraction.
- Archive filtering rejects traversal and all forbidden entries.
- `check:full` passes without recursive packaging.
- Cleanup/checking finds nested generated artifacts and leaves none behind.
- Acceptance documentation exactly matches automated proof.
- Full export/import domain equivalence is tested, with only documented volatile fields normalized.
- Confirmed unused primitives/dependencies are removed.
- The final repository is clean.

## Final Codex response

Report:

1. root cause of the old package failure;
2. root cause of the composite-check stall;
3. final command hierarchy and why it cannot recurse;
4. Playwright bootstrap behavior from an empty browser cache;
5. archive creation, inspection, extraction, and clean-install results;
6. recursive cleanup test results;
7. acceptance claims corrected or tests added;
8. dead files/dependencies removed;
9. exact final gate results.

Do not call the release reproducible unless the clean extraction passes the full non-packaging release gate.
