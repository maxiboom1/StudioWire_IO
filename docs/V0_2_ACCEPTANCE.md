# StudioWire IO v0.2 Acceptance

This document defines repeatable acceptance for the closed v0.2 release line. Project data is the source of truth; drawings and document packages are not source data and are future v0.3.0.0 scope.

## Scope Statement

v0.2 is complete around:

- Structured project, settings, location, rack, device, and terminal-block data.
- Generated ports and planned cable numbering.
- Direct device, device-to-terminal-block, and terminal-block front-to-front connection modeling.
- Cable register visibility and filtering.
- Relational validation and structural JSON import validation.
- Guarded deletion and retirement, with retired objects blocked from new connections.
- Safe JSON import/export with supported legacy migration.
- Resilient local browser persistence and recovery.

v0.2 does not support prewire export, Excel export, Bartender export, Visio export, SVG/PDF document export, authentication, backend storage, database storage, or multi-user collaboration.

## Required Commands

Run these from a clean checkout or clean source package extraction:

```bash
npm ci
npm run check
npm run check:scale
npm run test:e2e
npm run check:full
npm run package:source
npm run clean
npm run clean:check
```

`npm run check:full` is the normal release gate. It includes `check`, the synthetic scale check, Playwright E2E, source package creation/inspection, and final cleanup checks.

## Acceptance Matrix

| Acceptance item                                                    | Verification                                                                                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean install and deterministic build                              | `npm ci`, `npm run build`, and package-extraction verification                                                                                    |
| Version synchronization                                            | `npm run version:check` checks package, lockfile, TypeScript constant, JSON Schema, sample data, README, data model, and visible UI version usage |
| Current structural schema validation                               | `npm run validate:fixtures`, `src/domain/projectContract.test.ts`, and JSON Schema validation inside the import pipeline                          |
| Relational validation behavior                                     | `src/domain/validators.test.ts`, `src/domain/validation/validationModules.test.ts`, and `src/domain/projectBehaviorCharacterization.test.ts`      |
| Every supported legacy migration                                   | `npm run validate:fixtures`, `src/domain/projectImport.test.ts`, and Playwright `imports current and legacy fixtures`                             |
| New, open, load sample, import, export flows                       | Playwright lifecycle and import/export tests in `tests/e2e/studiowire.spec.ts`                                                                    |
| Local save, reload, corrupt-record fallback, quota/storage failure | Playwright storage tests plus `src/state/projectStorage.test.ts` and `src/state/projectAutosave.test.ts`                                          |
| Settings and connector compatibility                               | Playwright settings test plus `src/domain/connectorCompatibility.test.ts`                                                                         |
| Location, rack, device, and terminal-block creation/editing        | Playwright lifecycle tests plus reducer and domain command tests                                                                                  |
| Rack placement and movement                                        | `src/domain/rackPlacement.test.ts`, `src/domain/rackDiagnostics.test.ts`, and `src/state/projectReducer.test.ts`                                  |
| Cable allocation, skipped reserved gaps, and uniqueness            | `src/domain/cableNumbers.test.ts`, validator tests, and Playwright lifecycle export inspection                                                    |
| Direct device connections                                          | Playwright lifecycle test and `src/domain/connections.test.ts`                                                                                    |
| Device/TB connections                                              | Playwright lifecycle test and `src/domain/connections.test.ts`                                                                                    |
| TB front-to-front connections                                      | Playwright lifecycle test and `src/domain/connections.test.ts`                                                                                    |
| Disconnect behavior                                                | Playwright lifecycle test and `src/domain/connections.test.ts`                                                                                    |
| Retirement and blocked reconnection                                | Playwright retired-object test plus reducer/connection tests                                                                                      |
| Cable register and filtering                                       | `src/components/cables/cableRows.test.ts`, `src/components/layout/CablesWorkspace.test.ts`, and Playwright exported cable assertions              |
| Unsupported export/auth/backend features absent                    | README, `docs/PRODUCT_SPEC.md`, `docs/ROADMAP.md`, this acceptance doc, and UI/E2E coverage with no unsupported controls expected                 |
| Synthetic multi-thousand-port persistence/import/export check      | `npm run check:scale`                                                                                                                             |
| Clean source packaging                                             | `npm run package:source`, source-package extraction verification, `npm run clean`, and `npm run clean:check`                                      |

## Manual Visual Check

Automated tests cover behavior and data equivalence. Before publishing, a human may optionally run `npm run dev`, load the sample project, and visually inspect:

- App shell layout with tree, workspace, inspector, and validation panel.
- Device and terminal-block connection views.
- Add Device and Add TB dialogs.

This visual check is not a substitute for the automated gates.
