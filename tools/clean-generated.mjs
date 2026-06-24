import { existsSync, readdirSync, rmSync } from 'node:fs';

const generatedPaths = [
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
];

for (const path of generatedPaths) {
  remove(path);
}

for (const entry of readdirSync('.')) {
  if (
    entry.endsWith('.tsbuildinfo') ||
    entry.endsWith('.tgz') ||
    entry.endsWith('.log') ||
    entry.endsWith('.tmp') ||
    entry.endsWith('.trace.zip')
  ) {
    remove(entry);
  }
}

console.log('Generated artifacts removed.');

function remove(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}
