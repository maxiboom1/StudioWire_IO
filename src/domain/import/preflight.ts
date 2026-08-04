import type { ProjectImportError } from './types';
import { isRecord } from './schemaVersion';

export interface PreflightProjectShapeOptions {
  requireViews?: boolean;
}

export function preflightProjectShape(
  payload: unknown,
  options: PreflightProjectShapeOptions = {},
): ProjectImportError[] {
  if (!isRecord(payload)) {
    return [];
  }

  const errors: ProjectImportError[] = [];

  requireRecord(payload.project, '$.project', errors);
  requireRecord(payload.settings, '$.settings', errors);

  const collectionFields = [
    'locations',
    'subLocations',
    'racks',
    'devices',
    'portGroups',
    'ports',
    'cables',
    'numberingLedgers',
    'validationIssues',
    'changeLog',
  ];

  if (options.requireViews ?? true) {
    collectionFields.splice(3, 0, 'views');
  }

  for (const field of collectionFields) {
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
