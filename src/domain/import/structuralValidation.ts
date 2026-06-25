import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../../schema/studiowire.project.schema.json';
import type { ProjectRoot } from '../types';
import type { ProjectImportError } from './types';

const validateCurrentProject = createCurrentProjectValidator();

export type CurrentStructuralProjectResult =
  | { ok: true; project: ProjectRoot }
  | { ok: false; errors: ProjectImportError[] };

export function validateCurrentStructuralProject(payload: unknown): CurrentStructuralProjectResult {
  const valid = validateCurrentProject(payload);

  if (valid) {
    return { ok: true, project: payload as unknown as ProjectRoot };
  }

  return { ok: false, errors: (validateCurrentProject.errors ?? []).map(schemaErrorToImportError) };
}

function schemaErrorToImportError(error: ErrorObject): ProjectImportError {
  const path = formatJsonPointerPath(error.instancePath);

  if (error.keyword === 'additionalProperties') {
    const property = String(error.params.additionalProperty ?? '');
    const propertyPath = property ? appendPathSegment(path, property) : path;

    return {
      code: 'schema-additional-property',
      path: propertyPath,
      message: property
        ? `Additional property "${property}" is not allowed.`
        : 'Additional property is not allowed.',
    };
  }

  if (error.keyword === 'required') {
    const property = String(error.params.missingProperty ?? '');

    return {
      code: 'schema-required',
      path: property ? appendPathSegment(path, property) : path,
      message: property ? `Required property "${property}" is missing.` : 'Required property is missing.',
    };
  }

  if (error.keyword === 'false schema') {
    return {
      code: 'schema-forbidden-property',
      path,
      message: 'Property is not allowed for this object type.',
    };
  }

  return {
    code: `schema-${error.keyword}`,
    path,
    message: error.message ?? 'Project structure is invalid.',
  };
}

function formatJsonPointerPath(pointer: string): string {
  if (!pointer) {
    return '$';
  }

  return pointer
    .slice(1)
    .split('/')
    .reduce((path, rawSegment) => appendPathSegment(path, decodeJsonPointerSegment(rawSegment)), '$');
}

function appendPathSegment(path: string, segment: string): string {
  if (/^(0|[1-9]\d*)$/.test(segment)) {
    return `${path}[${segment}]`;
  }

  return `${path}.${segment}`;
}

function decodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function createCurrentProjectValidator() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  });

  addFormats(ajv);

  return ajv.compile(schema);
}
