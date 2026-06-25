import { normalizeConnectorCompatibility } from '../connectorCompatibility';
import type { ProjectRoot, SchemaVersion } from '../types';
import { STUDIOWIRE_CURRENT_VERSION } from '../version';
import { isRecord } from './schemaVersion';
import type { ProjectImportError } from './types';

export interface MigrationStep {
  from: SchemaVersion;
  to: SchemaVersion;
  migrate: (project: unknown) => unknown;
}

export type MigrationResult = { ok: true; project: unknown } | { ok: false; errors: ProjectImportError[] };

export const MIGRATION_STEPS: MigrationStep[] = [
  { from: '0.1.0', to: '0.2.4.1', migrate: migrateLegacyEndpointFields },
  { from: '0.2.4.1', to: '0.2.5.1', migrate: normalizeLegacyConnectorCompatibility },
  { from: '0.2.5.1', to: '0.2.6.0', migrate: identityMigration },
  { from: '0.2.6.0', to: '0.2.7.0', migrate: migrateStandardDeviceMetadata },
  { from: '0.2.7.0', to: '0.2.7.1', migrate: identityMigration },
  { from: '0.2.7.1', to: '0.2.7.2', migrate: identityMigration },
  { from: '0.2.7.2', to: '0.2.7.3', migrate: identityMigration },
  { from: '0.2.7.3', to: '0.2.8.0', migrate: identityMigration },
  { from: '0.2.8.0', to: '0.2.8.1', migrate: identityMigration },
  { from: '0.2.8.1', to: '0.2.8.2', migrate: identityMigration },
];

export function migrateProjectToCurrent(payload: unknown, version: SchemaVersion): MigrationResult {
  let migrated: unknown = structuredClone(payload);
  let currentVersion = version;

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

function migrateLegacyEndpointFields(project: unknown): unknown {
  const record = requireRecord(project, '$');
  const cables = requireArray(record.cables, '$.cables');

  return {
    ...record,
    cables: cables.map((cable, index) => {
      const cableRecord = requireRecord(cable, `$.cables[${index}]`);
      const {
        sourceEndpoint: _sourceEndpoint,
        destinationEndpoint: _destinationEndpoint,
        ...normalizedCable
      } = cableRecord;

      return {
        ...normalizedCable,
        sideAEndpoint: cableRecord.sideAEndpoint ?? cableRecord.sourceEndpoint ?? unknownEndpoint(),
        sideBEndpoint: cableRecord.sideBEndpoint ?? cableRecord.destinationEndpoint ?? unknownEndpoint(),
      };
    }),
  };
}

function normalizeLegacyConnectorCompatibility(project: unknown): unknown {
  const record = requireRecord(project, '$');

  requireRecord(record.settings, '$.settings');
  requireArray((record.settings as Record<string, unknown>).categories, '$.settings.categories');
  requireArray((record.settings as Record<string, unknown>).connectorTypes, '$.settings.connectorTypes');
  requireArray(record.portGroups, '$.portGroups');
  requireArray(record.ports, '$.ports');

  return normalizeConnectorCompatibility(record as unknown as ProjectRoot);
}

function migrateStandardDeviceMetadata(project: unknown): unknown {
  const record = requireRecord(project, '$');
  const devices = requireArray(record.devices, '$.devices');

  return {
    ...record,
    devices: devices.map((device, index) => {
      const deviceRecord = requireRecord(device, `$.devices[${index}]`);

      if (deviceRecord.kind === 'terminal_block') {
        const {
          code: _code,
          manufacturer: _manufacturer,
          model: _model,
          role: _role,
          ...terminalBlock
        } = deviceRecord;

        return {
          ...terminalBlock,
          kind: 'terminal_block',
          mountType: 'rack',
          rackSizeRu: 1,
        };
      }

      return {
        ...deviceRecord,
        kind: 'device',
        code:
          readString(deviceRecord.code) ??
          readString(deviceRecord.labelPrefix) ??
          readString(deviceRecord.name) ??
          '',
        manufacturer: typeof deviceRecord.manufacturer === 'string' ? deviceRecord.manufacturer : '',
        model: typeof deviceRecord.model === 'string' ? deviceRecord.model : '',
        role: typeof deviceRecord.role === 'string' ? deviceRecord.role : '',
      };
    }),
  };
}

function identityMigration(project: unknown): unknown {
  return project;
}

function stampSchemaVersion(project: unknown, version: SchemaVersion): unknown {
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

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new MigrationError(path, 'Expected an array while migrating project.');
  }

  return value;
}

function unknownEndpoint() {
  return {
    type: 'unknown',
    id: null,
    label: 'Unknown',
  };
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

class MigrationError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message);
  }
}
