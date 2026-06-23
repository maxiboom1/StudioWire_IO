import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importProjectJsonText } from '../src/domain/projectImport';
import type { ValidationIssue } from '../src/domain/types';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npm run validate:project -- <project-file.json>');
  process.exit(1);
}

const importResult = importProjectJsonText(readFileSync(resolve(filePath), 'utf8'));

if (!importResult.ok) {
  console.error(importResult.error);
  process.exit(1);
}

const issues = importResult.validationIssues;
const errors = issues.filter((issue) => issue.severity === 'error');
const warnings = issues.filter((issue) => issue.severity === 'warning');

printIssues('Errors', errors);
printIssues('Warnings', warnings);

if (errors.length === 0 && warnings.length === 0) {
  console.log('No validation issues.');
}

if (errors.length > 0) {
  process.exitCode = 1;
}

function printIssues(title: string, issuesToPrint: ValidationIssue[]): void {
  console.log(`${title}: ${issuesToPrint.length}`);

  for (const issue of issuesToPrint) {
    console.log(`- [${issue.code}] ${issue.message} (${issue.objectType}:${issue.objectId})`);
  }
}
