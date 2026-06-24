import { normalizeConnectorCompatibility } from '../connectorCompatibility';
import type { Cable, Device, ProjectRoot, SchemaVersion } from '../types';
import { STUDIOWIRE_CURRENT_VERSION } from '../version';

export interface MigrationStep {
  from: SchemaVersion;
  to: SchemaVersion;
  migrate: (project: ProjectRoot) => ProjectRoot;
}

export const MIGRATION_STEPS: MigrationStep[] = [
  { from: '0.1.0', to: '0.2.4.1', migrate: migrateLegacyEndpointFields },
  { from: '0.2.4.1', to: '0.2.5.1', migrate: normalizeLegacyConnectorCompatibility },
  { from: '0.2.5.1', to: '0.2.6.0', migrate: identityMigration },
  { from: '0.2.6.0', to: '0.2.7.0', migrate: migrateStandardDeviceMetadata },
  { from: '0.2.7.0', to: '0.2.7.1', migrate: identityMigration },
  { from: '0.2.7.1', to: '0.2.7.2', migrate: identityMigration },
  { from: '0.2.7.2', to: '0.2.7.3', migrate: identityMigration },
];

export function migrateProjectToCurrent(project: ProjectRoot, version: SchemaVersion): ProjectRoot {
  let migrated = normalizeCurrentShape(structuredClone(project));
  let currentVersion = version;

  while (currentVersion !== STUDIOWIRE_CURRENT_VERSION) {
    const step = MIGRATION_STEPS.find((candidate) => candidate.from === currentVersion);

    if (!step) {
      break;
    }

    migrated = step.migrate(migrated);
    currentVersion = step.to;
  }

  return {
    ...normalizeConnectorCompatibility(migrated),
    schemaVersion: STUDIOWIRE_CURRENT_VERSION,
  };
}

function normalizeCurrentShape(project: ProjectRoot): ProjectRoot {
  return {
    ...project,
    cables: normalizeCableEndpoints(project.cables),
    devices: normalizeTerminalBlocks(project.devices),
  };
}

function migrateLegacyEndpointFields(project: ProjectRoot): ProjectRoot {
  return {
    ...project,
    cables: normalizeCableEndpoints(project.cables),
  };
}

function normalizeLegacyConnectorCompatibility(project: ProjectRoot): ProjectRoot {
  return normalizeConnectorCompatibility(project);
}

function migrateStandardDeviceMetadata(project: ProjectRoot): ProjectRoot {
  return {
    ...project,
    devices: project.devices.map((device): Device => {
      if (device.kind === 'terminal_block') {
        return device;
      }

      return {
        ...device,
        kind: 'device',
        code: device.code ?? '',
        manufacturer: device.manufacturer ?? '',
        model: device.model ?? '',
        role: device.role ?? '',
      };
    }),
  };
}

function normalizeCableEndpoints(cables: Cable[]): Cable[] {
  const unknownEndpoint = {
    type: 'unknown' as const,
    id: null,
    label: 'Unknown',
  };

  return cables.map((cable) => {
    const legacyCable = cable as Cable & {
      sourceEndpoint?: Cable['sideAEndpoint'];
      destinationEndpoint?: Cable['sideBEndpoint'];
    };
    const {
      sourceEndpoint: _sourceEndpoint,
      destinationEndpoint: _destinationEndpoint,
      ...normalizedCable
    } = legacyCable;

    return {
      ...normalizedCable,
      sideAEndpoint: legacyCable.sideAEndpoint ?? legacyCable.sourceEndpoint ?? unknownEndpoint,
      sideBEndpoint: legacyCable.sideBEndpoint ?? legacyCable.destinationEndpoint ?? unknownEndpoint,
    };
  });
}

function normalizeTerminalBlocks(devices: Device[]): Device[] {
  return devices.map((device): Device => {
    if (device.kind !== 'terminal_block') {
      return device;
    }

    const { code: _code, manufacturer: _manufacturer, model: _model, role: _role, ...terminalBlock } = device;

    return {
      ...terminalBlock,
      kind: 'terminal_block',
      mountType: 'rack',
      rackSizeRu: 1,
    };
  });
}

function identityMigration(project: ProjectRoot): ProjectRoot {
  return project;
}
