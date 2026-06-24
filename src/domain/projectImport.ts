import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../schema/studiowire.project.schema.json';
import { normalizeConnectorCompatibility } from './connectorCompatibility';
import type { Cable, Device, ProjectRoot, SchemaVersion, ValidationIssue } from './types';
import { STUDIOWIRE_CURRENT_VERSION, SUPPORTED_SCHEMA_VERSIONS } from './version';
import { validateProject } from './validators';

export interface ProjectImportError {
  code: string;
  path: string;
  message: string;
}

export interface ProjectImportSuccess {
  ok: true;
  project: ProjectRoot;
  validationIssues: ValidationIssue[];
}

export interface ProjectImportFailure {
  ok: false;
  errors: ProjectImportError[];
  error: string;
}

export type ProjectImportResult = ProjectImportSuccess | ProjectImportFailure;

const validateCurrentProject = createCurrentProjectValidator();

export function importProjectJsonText(text: string): ProjectImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return importFailure([
      {
        code: 'json-syntax',
        path: '$',
        message: error instanceof Error ? error.message : 'JSON syntax is invalid.',
      },
    ]);
  }

  return importProjectValue(parsed);
}

export function importProjectValue(payload: unknown): ProjectImportResult {
  try {
    const versionResult = readSupportedSchemaVersion(payload);

    if (!versionResult.ok) {
      return importFailure([versionResult.error]);
    }

    const preflightErrors = preflightProjectShape(payload);

    if (preflightErrors.length > 0) {
      return importFailure(preflightErrors);
    }

    const migrated = migrateProjectToCurrent(payload as ProjectRoot, versionResult.version);
    const structuralErrors = validateCurrentStructuralProject(migrated);

    if (structuralErrors.length > 0) {
      return importFailure(structuralErrors);
    }

    const validationIssues = validateProject(migrated);

    return {
      ok: true,
      project: migrated,
      validationIssues,
    };
  } catch (error) {
    return importFailure([
      {
        code: 'import-exception',
        path: '$',
        message: error instanceof Error ? error.message : 'Project import failed unexpectedly.',
      },
    ]);
  }
}

export function formatImportErrors(errors: ProjectImportError[]): string {
  if (errors.length === 0) {
    return 'Import failed.';
  }

  const [first] = errors;
  const suffix = errors.length > 1 ? ` (${errors.length} errors)` : '';

  return `${first.path}: ${first.message}${suffix}`;
}

export function isSupportedSchemaVersion(value: unknown): value is SchemaVersion {
  return typeof value === 'string' && SUPPORTED_SCHEMA_VERSIONS.includes(value as SchemaVersion);
}

function readSupportedSchemaVersion(
  payload: unknown,
): { ok: true; version: SchemaVersion } | { ok: false; error: ProjectImportError } {
  if (!isRecord(payload)) {
    return {
      ok: false,
      error: {
        code: 'project-root-not-object',
        path: '$',
        message: 'Imported JSON must be an object.',
      },
    };
  }

  if (!isSupportedSchemaVersion(payload.schemaVersion)) {
    return {
      ok: false,
      error: {
        code: 'unsupported-schema-version',
        path: '$.schemaVersion',
        message: `Unsupported schemaVersion. Supported versions: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`,
      },
    };
  }

  return { ok: true, version: payload.schemaVersion };
}

function preflightProjectShape(payload: unknown): ProjectImportError[] {
  if (!isRecord(payload)) {
    return [];
  }

  const errors: ProjectImportError[] = [];

  requireRecord(payload.project, '$.project', errors);
  requireRecord(payload.settings, '$.settings', errors);

  for (const field of [
    'locations',
    'racks',
    'devices',
    'portGroups',
    'ports',
    'cables',
    'numberingLedgers',
    'validationIssues',
    'changeLog',
  ]) {
    requireArray(payload[field], `$.${field}`, errors);
  }

  if (isRecord(payload.settings)) {
    for (const field of [
      'categories',
      'connectorTypes',
      'categoryConnectorAssignments',
      'connectorCompatibilityGroups',
      'connectorCompatibilityGroupMembers',
      'cablePrefixes',
    ]) {
      if (field in payload.settings) {
        requireArray(payload.settings[field], `$.settings.${field}`, errors);
      }
    }
  }

  if (Array.isArray(payload.numberingLedgers)) {
    payload.numberingLedgers.forEach((ledger, index) => {
      if (isRecord(ledger)) {
        requireArray(ledger.ranges, `$.numberingLedgers[${index}].ranges`, errors);
      }
    });
  }

  return errors;
}

function requireRecord(value: unknown, path: string, errors: ProjectImportError[]) {
  if (!isRecord(value)) {
    errors.push({
      code: 'expected-object',
      path,
      message: 'Expected an object.',
    });
  }
}

function requireArray(value: unknown, path: string, errors: ProjectImportError[]) {
  if (!Array.isArray(value)) {
    errors.push({
      code: 'expected-array',
      path,
      message: 'Expected an array.',
    });
    return;
  }

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push({
        code: 'expected-object',
        path: `${path}[${index}]`,
        message: 'Expected an object entry.',
      });
    }
  });
}

function migrateProjectToCurrent(project: ProjectRoot, version: SchemaVersion): ProjectRoot {
  const unknownEndpoint = {
    type: 'unknown' as const,
    id: null,
    label: 'Unknown',
  };

  const migrated: ProjectRoot = {
    ...structuredClone(project),
    schemaVersion: STUDIOWIRE_CURRENT_VERSION,
    cables: project.cables.map((cable) => {
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
    }),
    devices: project.devices.map((device): Device => {
      if (device.kind === 'terminal_block') {
        const {
          code: _code,
          manufacturer: _manufacturer,
          model: _model,
          role: _role,
          ...terminalBlock
        } = device;

        return {
          ...terminalBlock,
          kind: 'terminal_block',
          mountType: 'rack',
          rackSizeRu: 1,
        };
      }

      if (version === STUDIOWIRE_CURRENT_VERSION || version === '0.2.7.1' || version === '0.2.7.0') {
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

  return normalizeConnectorCompatibility(migrated);
}

function validateCurrentStructuralProject(project: ProjectRoot): ProjectImportError[] {
  const valid = validateCurrentProject(project);

  if (valid) {
    return [];
  }

  return (validateCurrentProject.errors ?? []).map(schemaErrorToImportError);
}

function schemaErrorToImportError(error: ErrorObject): ProjectImportError {
  const path = error.instancePath ? `$.${error.instancePath.slice(1).replace(/\//g, '.')}` : '$';

  if (error.keyword === 'additionalProperties') {
    const property = String(error.params.additionalProperty ?? '');

    return {
      code: 'schema-additional-property',
      path: property ? `${path}.${property}` : path,
      message: property
        ? `Additional property "${property}" is not allowed.`
        : 'Additional property is not allowed.',
    };
  }

  return {
    code: `schema-${error.keyword}`,
    path,
    message: error.message ?? 'Project structure is invalid.',
  };
}

function importFailure(errors: ProjectImportError[]): ProjectImportFailure {
  return {
    ok: false,
    errors,
    error: formatImportErrors(errors),
  };
}

function createCurrentProjectValidator() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  });

  addFormats(ajv);

  return ajv.compile(schema);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
