import type { SchemaVersion } from '../types';
import { STUDIOWIRE_CURRENT_VERSION } from '../version';
import { isRecord } from './schemaVersion';
import type { ProjectImportError } from './types';

export interface MigrationStep {
  from: string;
  to: string;
  migrate: (project: unknown) => MigrationStepResult;
}

export interface MigrationStepResult {
  project: unknown;
  removedViewLineCount: number;
}

export type MigrationResult =
  | { ok: true; project: unknown; removedViewLineCount: number }
  | { ok: false; errors: ProjectImportError[] };

export const MIGRATION_STEPS: MigrationStep[] = [
  { from: '0.2.8.25', to: '0.2.9.00', migrate: addViewsCollection },
  { from: '0.2.9.00', to: '0.2.9.01', migrate: identityMigration },
  { from: '0.2.9.01', to: '0.2.9.02', migrate: identityMigration },
  { from: '0.2.9.02', to: '0.2.9.03', migrate: identityMigration },
  { from: '0.2.9.03', to: '0.2.9.04', migrate: identityMigration },
  { from: '0.2.9.04', to: '0.2.9.05', migrate: removeLegacyViewLines },
  { from: '0.2.9.05', to: STUDIOWIRE_CURRENT_VERSION, migrate: identityMigration },
];

export function migrateProjectToCurrent(payload: unknown, version: SchemaVersion): MigrationResult {
  let migrated: unknown = structuredClone(payload);
  let currentVersion: string = version;
  let removedViewLineCount = 0;

  try {
    while (currentVersion !== STUDIOWIRE_CURRENT_VERSION) {
      const step = MIGRATION_STEPS.find((candidate) => candidate.from === currentVersion);

      if (!step) {
        return {
          ok: false,
          errors: [
            {
              code: 'migration-missing-step',
              path: '$.schemaVersion',
              message: `No migration step from ${currentVersion} to ${STUDIOWIRE_CURRENT_VERSION}.`,
            },
          ],
        };
      }

      const stepResult = step.migrate(migrated);
      migrated = stampSchemaVersion(stepResult.project, step.to);
      removedViewLineCount += stepResult.removedViewLineCount;
      currentVersion = step.to;
    }

    return { ok: true, project: migrated, removedViewLineCount };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: 'migration-incompatible',
          path: error instanceof MigrationError ? error.path : '$',
          message: error instanceof Error ? error.message : 'Project migration failed.',
        },
      ],
    };
  }
}

function addViewsCollection(project: unknown): MigrationStepResult {
  const record = requireRecord(project, '$');

  return migrationStep({ ...record, views: [] });
}

function identityMigration(project: unknown): MigrationStepResult {
  return migrationStep(requireRecord(project, '$'));
}

function removeLegacyViewLines(project: unknown): MigrationStepResult {
  const record = requireRecord(project, '$');
  if (!Array.isArray(record.views)) {
    throw new MigrationError('$.views', 'Expected an array of Views while migrating View lines.');
  }
  let removedViewLineCount = 0;
  const views = record.views.map((value, index) => {
    const view = requireRecord(value, `$.views[${index}]`);
    if (!Array.isArray(view.lines)) {
      throw new MigrationError(`$.views[${index}].lines`, 'Expected an array of View lines.');
    }
    removedViewLineCount += view.lines.length;
    return { ...view, lines: [] };
  });
  return { project: { ...record, views }, removedViewLineCount };
}

function migrationStep(project: unknown): MigrationStepResult {
  return { project, removedViewLineCount: 0 };
}

function stampSchemaVersion(project: unknown, version: string): unknown {
  const record = requireRecord(project, '$');

  return {
    ...record,
    schemaVersion: version,
  };
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new MigrationError(path, 'Expected an object while migrating project.');
  }

  return value;
}

class MigrationError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message);
  }
}
