import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const outputDir = '.source-package';

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true });
}

mkdirSync(outputDir);

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const archiveName = execFileSync(npmCommand, ['pack', '--pack-destination', outputDir], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
})
  .trim()
  .split(/\r?\n/)
  .pop();

if (!archiveName) {
  console.error('npm pack did not report an archive name.');
  process.exit(1);
}

const archivePath = join(outputDir, archiveName);
const listing = execFileSync('tar', ['-tf', archivePath], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);
const forbidden = [
  'node_modules/',
  'dist/',
  'coverage/',
  'test-results/',
  'playwright-report/',
  'blob-report/',
  '.playwright-cli/',
  'output/',
  'samples/',
  '.git/',
  '.source-package/',
  'CHANGELOG.md',
];
const violations = listing.filter((entry) => forbidden.some((path) => entry.includes(`package/${path}`)));

if (violations.length > 0) {
  console.error(`Source package contains forbidden paths:\n${violations.join('\n')}`);
  process.exit(1);
}

console.log(`Source package created and inspected: ${archivePath}`);
