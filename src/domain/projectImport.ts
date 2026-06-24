import { formatImportErrors, importFailure } from './import/formatErrors';
import { migrateProjectToCurrent } from './import/migrations';
import { preflightProjectShape } from './import/preflight';
import { isSupportedSchemaVersion, readSupportedSchemaVersion } from './import/schemaVersion';
import { validateCurrentStructuralProject } from './import/structuralValidation';
import type { ProjectImportResult } from './import/types';
import type { ProjectRoot } from './types';
import { validateProject } from './validators';

export type {
  ProjectImportError,
  ProjectImportFailure,
  ProjectImportResult,
  ProjectImportSuccess,
} from './import/types';

export { formatImportErrors, isSupportedSchemaVersion };

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

export function parseImportedProject(
  payload: unknown,
):
  | { ok: true; project: ProjectRoot; validationIssues: ProjectRoot['validationIssues'] }
  | { ok: false; error: string } {
  const result = importProjectValue(payload);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return result;
}
