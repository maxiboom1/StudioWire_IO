import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { importProjectJsonText } from '../src/domain/projectImport';
import { STUDIOWIRE_CURRENT_VERSION } from '../src/domain/version';

const samplesDir = resolve('docs/samples');
const currentSample = join(samplesDir, 'sample-project.studiowire.json');
const legacyDir = join(samplesDir, 'legacy');
const invalidDir = join(samplesDir, 'invalid');

validateCurrent(currentSample);
validateLegacyFixtures();
validateInvalidFixtures();

console.log('Fixture validation passed.');

function validateCurrent(path: string) {
  const result = importProjectJsonText(readFileSync(path, 'utf8'));

  if (!result.ok) {
    fail(`${path} failed import: ${result.error}`);
  }

  if (result.project.schemaVersion !== STUDIOWIRE_CURRENT_VERSION) {
    fail(`${path} imported as ${result.project.schemaVersion}, expected ${STUDIOWIRE_CURRENT_VERSION}.`);
  }

  const errors = result.validationIssues.filter((issue) => issue.severity === 'error');

  if (errors.length > 0) {
    fail(`${path} has validation errors: ${errors.map((issue) => issue.code).join(', ')}`);
  }
}

function validateLegacyFixtures() {
  for (const file of readdirSync(legacyDir)
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const path = join(legacyDir, file);
    const result = importProjectJsonText(readFileSync(path, 'utf8'));

    if (!result.ok) {
      fail(`${path} failed migration: ${result.error}`);
    }

    if (result.project.schemaVersion !== STUDIOWIRE_CURRENT_VERSION) {
      fail(`${path} migrated to ${result.project.schemaVersion}, expected ${STUDIOWIRE_CURRENT_VERSION}.`);
    }
  }
}

function validateInvalidFixtures() {
  for (const file of readdirSync(invalidDir)
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const path = join(invalidDir, file);
    const result = importProjectJsonText(readFileSync(path, 'utf8'));

    if (result.ok) {
      fail(`${path} should fail structural import.`);
    }
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
