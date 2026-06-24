import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../../../schema/studiowire.project.schema.json';
import type { ProjectRoot } from '../types';
import type { ProjectImportError } from './types';

const validateCurrentProject = createCurrentProjectValidator();

export function validateCurrentStructuralProject(project: ProjectRoot): ProjectImportError[] {
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

function createCurrentProjectValidator() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
  });

  addFormats(ajv);

  return ajv.compile(schema);
}
