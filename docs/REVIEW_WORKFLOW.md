# StudioWire IO Review Workflow

StudioWire IO uses a master-only manual commit workflow for normal Codex changes.

## Roles

- Human/product owner: defines the requested version, reviews the result, and manually commits and pushes.
- Codex coder: modifies files, runs validation, and reports exact manual commit and push commands. Codex does not commit, push, tag, or create branches.
- GPT-5.5 Pro reviewer: reviews the pushed change using a GitHub compare URL or explicit commit SHAs.

## Normal Workflow

1. Work directly on `master`.
2. The prompt specifies the next app version.
3. Codex edits files and runs validation.
4. The user manually commits and pushes.
5. The user sends GPT-5.5 Pro either the GitHub compare URL or `BASE_SHA` and `AFTER_SHA`.
6. Review compares the previous commit to the new commit.
7. If review finds a problem, fix it as the next versioned commit.

Do not rewrite public history, force-push, or rebase public `master`.

## Review Commands

GitHub compare URL:

```bash
https://github.com/maxiboom1/StudioWire_IO/compare/<BASE_SHA>..<AFTER_SHA>
```

Latest one-commit local review:

```bash
git diff HEAD~1..HEAD
```

Specific local commit review:

```bash
git diff <BASE_SHA>..<AFTER_SHA>
```

## Required Validation

Run these before the manual commit:

```bash
npm test -- --run
npm run build
npm run validate:project -- samples/sample-project.studiowire.json
npm run summary -- samples/sample-project.studiowire.json
```

## Versioning Rules

StudioWire IO uses versioned Codex changes.

1. Every Codex implementation/change prompt must specify a new app version.
2. Every Codex implementation/change must bump the app version.
3. Normal version bumps must use valid npm SemVer, such as `0.1.3`, `0.1.4`, `0.2.0`, or `0.2.1`.
4. Do not use invalid npm/package.json versions such as `0.1.3.1`.
5. Extremely small follow-up fixes still use the next valid SemVer patch version unless the product owner explicitly approves a valid prerelease form.
6. Every version bump must update `package.json`, `package-lock.json` when present or affected, `CHANGELOG.md`, and the root `README.md` Version Changelog section.
7. Each prompt should normally correspond to one final versioned commit, made manually by the user.

## Not Used For Normal Workflow

- No feature branches are required.
- No release tags are required for review.
- No generated review bundles are used.
