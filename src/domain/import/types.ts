import type { ProjectRoot, ValidationIssue } from '../types';

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
