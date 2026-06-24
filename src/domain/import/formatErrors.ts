import type { ProjectImportError, ProjectImportFailure } from './types';

export function formatImportErrors(errors: ProjectImportError[]): string {
  if (errors.length === 0) {
    return 'Import failed.';
  }

  const [first] = errors;
  const suffix = errors.length > 1 ? ` (${errors.length} errors)` : '';

  return `${first.path}: ${first.message}${suffix}`;
}

export function importFailure(errors: ProjectImportError[]): ProjectImportFailure {
  return {
    ok: false,
    errors,
    error: formatImportErrors(errors),
  };
}
