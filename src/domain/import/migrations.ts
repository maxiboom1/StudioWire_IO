import type { SchemaVersion } from '../types';
import { STUDIOWIRE_CURRENT_VERSION } from '../version';
import { isRecord } from './schemaVersion';
import type { ProjectImportError } from './types';

export interface MigrationStep {
  from: string;
  to: string;
  migrate: (project: unknown) => unknown;
}

export type MigrationResult = { ok: true; project: unknown } | { ok: false; errors: ProjectImportError[] };

export const MIGRATION_STEPS: MigrationStep[] = [
  { from: '0.2.8.25', to: '0.2.9.00', migrate: addViewsCollection },
  { from: '0.2.9.00', to: '0.2.9.01', migrate: identityMigration },
  { from: '0.2.9.01', to: STUDIOWIRE_CURRENT_VERSION, migrate: identityMigration },
];

export function migrateProjectToCurrent(payload: unknown, version: SchemaVersion): MigrationResult {
  let migrated: unknown = structuredClone(payload);
  let currentVersion: string = version;

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

      migrated = stampSchemaVersion(step.migrate(migrated), step.to);
      currentVersion = step.to;
    }

    return { ok: true, project: migrated };
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

function addViewsCollection(project: unknown): unknown {
  const record = requireRecord(project, '$');

  return {
    ...record,
    views: [],
  };
}

function identityMigration(project: unknown): unknown {
  return requireRecord(project, '$');
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
