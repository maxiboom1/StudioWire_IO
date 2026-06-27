# StudioWire IO Review Workflow

## Roles

### Product owner/user

- Defines the requested change and target version.
- Runs Codex.
- Chooses whether review happens from an uploaded archive or from pushed repository state.
- Publishes or uploads the review artifact when ready.
- Tells GPT-5.5 Pro which review source is ready.

### Codex

- Edits files.
- Updates version/docs/changelog.
- Runs non-Git validation commands.
- Does not run Git commands.
- Does not commit.
- Does not push.
- Does not create branches.
- Does not create tags.

### GPT-5.5 Pro

- Reviews after the user says the archive or repository state is ready.
- Uses the uploaded archive, pushed branch, or latest pushed repository state as directed by the user.
- Approves or produces the next Codex prompt.

## Normal Workflow

1. GPT-5.5 Pro gives the user a Codex prompt with a target version.
2. Codex edits files and runs validation.
3. Codex reports files changed and validation results.
4. User prepares the review source: an uploaded archive, a pushed branch, or the latest pushed repository state.
5. User tells GPT-5.5 Pro what is ready for review.
6. GPT-5.5 Pro reviews that source.
7. If fixes are needed, GPT-5.5 Pro assigns the next version and writes the next Codex prompt.

Public history is not rewritten. If review finds a problem, the fix is made as the next versioned Codex change.

## Codex Git Rule

- Codex must not run Git commands.
- Codex must not print Git commands as part of normal final output.
- Git is fully controlled by the user.

## Required Validation

For ordinary feature-development work:

```bash
npm run check:dev
```

For stabilization or release checkpoints:

```bash
npm run check
npm run check:release
npm run check:full
npm run validate:project -- docs/samples/sample-project.studiowire.json
npm run summary -- docs/samples/sample-project.studiowire.json
```

`npm run package:source`, Playwright E2E, and clean-extraction verification are release/stabilization tools, not mandatory for every product/UI feature.

## Versioning Rules

StudioWire IO uses versioned Codex changes.

1. Every Codex implementation/change prompt must specify a new app version.
2. Every Codex implementation/change must bump the app version and current project schema version together.
3. Every Codex implementation/change must bump the app/package version.
4. Active and future versions use exactly four numeric components, such as `0.2.7.2` or `0.3.0.0`.
5. These are internal app/product versions for this local project; StudioWire IO is not being published to npm as a package.
6. Active StudioWire IO versions use four numeric components, and the app version and current `schemaVersion` must always be identical, even for UI-only or documentation releases.
7. Every version bump must update `package.json`, `package-lock.json` when present or affected, the TypeScript current-version constant, JSON Schema metadata, generated/sample project data, and the root `README.md` Version Changelog section.
8. Before the first public/released schema, dev-to-dev schema compatibility is not guaranteed; preserve import compatibility from the first declared released baseline forward.
9. Each prompt normally corresponds to one final user-published or uploaded review version.
10. GPT-5.5 Pro reviews only after the user says the selected review source is ready.

## Not Used For Normal Workflow

- Codex Git operations.
- Release tags.

## Review Sources

Supported review sources are:

- Uploaded source archive.
- Pushed feature branch.
- Latest pushed repository state, including `master` when the user works directly there.
