import type { SchemaVersion } from '../types';
import { SUPPORTED_SCHEMA_VERSIONS } from '../version';
import type { ProjectImportError } from './types';

export function isSupportedSchemaVersion(value: unknown): value is SchemaVersion {
  return typeof value === 'string' && SUPPORTED_SCHEMA_VERSIONS.includes(value as SchemaVersion);
}

export function readSupportedSchemaVersion(
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
