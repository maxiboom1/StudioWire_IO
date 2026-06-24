import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const forbiddenPaths = [
  'dist',
  'build',
  'coverage',
  '.vite',
  '.playwright-cli',
  'test-results',
  'playwright-report',
  'blob-report',
  'output',
  '.source-package',
  'samples',
  'CHANGELOG.md',
];
const failures = [];

for (const path of forbiddenPaths) {
  if (existsSync(path)) {
    failures.push(path);
  }
}

for (const entry of readdirSync('.')) {
  if (
    entry.endsWith('.tsbuildinfo') ||
    entry.endsWith('.tgz') ||
    entry.endsWith('.zip') ||
    entry.endsWith('.log') ||
    entry.endsWith('.tmp') ||
    entry.endsWith('.trace.zip')
  ) {
    failures.push(entry);
  }
}

for (const docsEntry of readdirSync('docs')) {
  if (/V0_2_5/.test(docsEntry)) {
    failures.push(join('docs', docsEntry));
  }
}

if (failures.length > 0) {
  console.error(`Generated or obsolete artifacts remain:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('Repository cleanliness check passed.');
