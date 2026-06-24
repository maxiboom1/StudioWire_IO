import { readFileSync } from 'node:fs';

const expected = '0.2.7.3';
const checks = [
  ['package.json version', () => JSON.parse(read('package.json')).version],
  ['package-lock root version', () => JSON.parse(read('package-lock.json')).version],
  ['package-lock package version', () => JSON.parse(read('package-lock.json')).packages[''].version],
  [
    'TypeScript current version',
    () => match(read('src/domain/version.ts'), /STUDIOWIRE_CURRENT_VERSION = '([^']+)'/),
  ],
  ['JSON Schema title', () => match(read('schema/studiowire.project.schema.json'), /Project v([0-9.]+)/)],
  [
    'JSON Schema const',
    () => JSON.parse(read('schema/studiowire.project.schema.json')).properties.schemaVersion.const,
  ],
  [
    'current sample schemaVersion',
    () => JSON.parse(read('docs/samples/sample-project.studiowire.json')).schemaVersion,
  ],
  ['README current release', () => match(read('README.md'), /repository contains the v([0-9.]+)/)],
  ['DATA_MODEL current schema', () => match(read('docs/DATA_MODEL.md'), /current schema version `([^`]+)`/)],
];

const failures = [];

for (const [label, getValue] of checks) {
  const value = getValue();

  if (value !== expected) {
    failures.push(`${label}: expected ${expected}, found ${value}`);
  }
}

if (!read('src/components/layout/LeftTree.tsx').includes('STUDIOWIRE_CURRENT_VERSION')) {
  failures.push('visible app version must import STUDIOWIRE_CURRENT_VERSION');
}

if (read('AGENTS.md').includes('V0_2_5') || read('README.md').includes('V0_2_5')) {
  failures.push('current instructions must not reference V0_2_5 document names');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Version sync passed for ${expected}.`);

function read(path) {
  return readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
}

function match(text, pattern) {
  const result = text.match(pattern);

  if (!result) {
    return '';
  }

  return result[1];
}
