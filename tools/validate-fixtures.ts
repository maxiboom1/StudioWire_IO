import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { importProjectJsonText } from '../src/domain/projectImport';
import { STUDIOWIRE_CURRENT_VERSION, SUPPORTED_SCHEMA_VERSIONS } from '../src/domain/version';
import type { ProjectRoot, SchemaVersion } from '../src/domain/types';

const samplesDir = resolve('docs/samples');
const currentSample = join(samplesDir, 'sample-project.studiowire.json');
const legacyDir = join(samplesDir, 'legacy');
const invalidDir = join(samplesDir, 'invalid');

validateCurrent(currentSample);
validateLegacyFixtures();
validateInvalidFixtures();

console.log('Fixture validation passed.');

function validateCurrent(path: string) {
  const result = importProjectJsonText(readFileSync(path, 'utf8'));

  if (!result.ok) {
    fail(`${path} failed import: ${result.error}`);
  }

  if (result.project.schemaVersion !== STUDIOWIRE_CURRENT_VERSION) {
    fail(`${path} imported as ${result.project.schemaVersion}, expected ${STUDIOWIRE_CURRENT_VERSION}.`);
  }

  const errors = result.validationIssues.filter((issue) => issue.severity === 'error');

  if (errors.length > 0) {
    fail(`${path} has validation errors: ${errors.map((issue) => issue.code).join(', ')}`);
  }
}

function validateLegacyFixtures() {
  const files = readdirSync(legacyDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  const expectedLegacyVersions = SUPPORTED_SCHEMA_VERSIONS.filter(
    (version) => version !== STUDIOWIRE_CURRENT_VERSION,
  );
  const actualVersions = files.map(versionFromLegacyFixtureName).sort();

  if (JSON.stringify(actualVersions) !== JSON.stringify([...expectedLegacyVersions].sort())) {
    fail(
      `${legacyDir} must contain exactly one fixture for each legacy version: ${expectedLegacyVersions.join(
        ', ',
      )}. Found: ${actualVersions.join(', ')}.`,
    );
  }

  for (const file of files) {
    const path = join(legacyDir, file);
    const text = readFileSync(path, 'utf8');
    const raw = JSON.parse(text);
    const version = versionFromLegacyFixtureName(file);
    const result = importProjectJsonText(text);

    if (raw.schemaVersion !== version) {
      fail(`${path} schemaVersion ${raw.schemaVersion} does not match fixture version ${version}.`);
    }

    if (!result.ok) {
      fail(`${path} failed migration: ${result.error}`);
    }

    if (result.project.schemaVersion !== STUDIOWIRE_CURRENT_VERSION) {
      fail(`${path} migrated to ${result.project.schemaVersion}, expected ${STUDIOWIRE_CURRENT_VERSION}.`);
    }

    validateLegacySentinel(path, version, raw, result.project);
  }
}

function validateInvalidFixtures() {
  const expectations: Record<string, { code: string; path: string }> = {
    'invalid-current-legacy-endpoints.studiowire.json': {
      code: 'schema-additional-property',
      path: '$.cables[0].sourceEndpoint',
    },
    'invalid-current-missing-settings-array.studiowire.json': {
      code: 'schema-required',
      path: '$.settings.connectorTypes',
    },
    'invalid-current-nested-additional-property.studiowire.json': {
      code: 'schema-additional-property',
      path: '$.settings.connectorTypes[0].legacyNested',
    },
    'invalid-current-terminal-block-metadata.studiowire.json': {
      code: 'schema-forbidden-property',
      path: '$.devices[2].code',
    },
    'invalid-project-status.studiowire.json': {
      code: 'schema-enum',
      path: '$.project.status',
    },
  };

  for (const file of readdirSync(invalidDir)
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const path = join(invalidDir, file);
    const result = importProjectJsonText(readFileSync(path, 'utf8'));

    if (result.ok) {
      fail(`${path} should fail structural import.`);
    }

    const expected = expectations[file];

    if (!expected) {
      fail(`${path} has no invalid fixture expectation.`);
    }

    if (!result.errors.some((error) => error.code === expected.code && error.path === expected.path)) {
      fail(`${path} did not report ${expected.code} at ${expected.path}. Got: ${result.error}`);
    }
  }
}

function validateLegacySentinel(path: string, version: SchemaVersion, raw: any, project: ProjectRoot) {
  if (project.project.id !== raw.project.id || project.project.name !== raw.project.name) {
    fail(`${path} did not preserve stable project identity.`);
  }

  if (version === '0.1.0') {
    if (!('sourceEndpoint' in raw.cables[0]) || !('destinationEndpoint' in raw.cables[0])) {
      fail(`${path} must contain legacy source/destination cable endpoints.`);
    }

    if (
      'sourceEndpoint' in (project.cables[0] as any) ||
      'destinationEndpoint' in (project.cables[0] as any)
    ) {
      fail(`${path} migrated legacy endpoint fields into current cable shape incorrectly.`);
    }

    if (!project.cables[0].sideAEndpoint || !project.cables[0].sideBEndpoint) {
      fail(`${path} did not migrate legacy endpoints to sideAEndpoint/sideBEndpoint.`);
    }
  }

  if (version === '0.2.4.1') {
    if (!raw.settings.connectorTypes.some((connector: any) => 'categoryId' in connector)) {
      fail(`${path} must contain legacy connector category fields.`);
    }

    if (project.settings.connectorTypes.some((connector: any) => 'categoryId' in connector)) {
      fail(`${path} did not migrate connector types into the global current catalog.`);
    }

    if (project.settings.categoryConnectorAssignments.length === 0) {
      fail(`${path} did not create category connector assignments.`);
    }
  }

  if (version === '0.2.5.1' || version === '0.2.6.0') {
    const router = project.devices.find((device) => device.id === 'device-router-1');

    if (!router?.code || !('manufacturer' in router) || !('model' in router) || !('role' in router)) {
      fail(`${path} did not backfill required standard-device metadata.`);
    }
  }

  if (version === '0.2.6.0') {
    const rawTerminalBlock = raw.devices.find((device: any) => device.id === 'device-tb-legacy-metadata');
    const migratedTerminalBlock = project.devices.find((device) => device.id === 'device-tb-legacy-metadata');

    if (
      !rawTerminalBlock?.code ||
      !rawTerminalBlock.manufacturer ||
      !rawTerminalBlock.model ||
      !rawTerminalBlock.role
    ) {
      fail(`${path} must contain legacy terminal block metadata fields.`);
    }

    if (
      !migratedTerminalBlock ||
      'code' in migratedTerminalBlock ||
      'manufacturer' in migratedTerminalBlock ||
      'model' in migratedTerminalBlock ||
      'role' in migratedTerminalBlock ||
      migratedTerminalBlock.rackSizeRu !== 1
    ) {
      fail(`${path} did not remove historical terminal block metadata during migration.`);
    }
  }
}

function versionFromLegacyFixtureName(file: string): SchemaVersion {
  const match = file.match(/^project-(\d+)-(\d+)-(\d+)(?:-(\d+))?\.studiowire\.json$/);

  if (!match) {
    fail(`${file} does not follow the legacy fixture naming convention.`);
  }

  const [, major, minor, patch, build] = match;
  const version = build ? `${major}.${minor}.${patch}.${build}` : `${major}.${minor}.${patch}`;

  if (
    !SUPPORTED_SCHEMA_VERSIONS.includes(version as SchemaVersion) ||
    version === STUDIOWIRE_CURRENT_VERSION
  ) {
    fail(`${file} resolves to unsupported legacy version ${version}.`);
  }

  return version as SchemaVersion;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
