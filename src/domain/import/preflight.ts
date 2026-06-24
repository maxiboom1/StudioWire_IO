import type { ProjectImportError } from './types';
import { isRecord } from './schemaVersion';

export function preflightProjectShape(payload: unknown): ProjectImportError[] {
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
