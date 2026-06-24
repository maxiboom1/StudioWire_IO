import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const outputDir = '.source-package';
const rootName = `StudioWire_IO-${version}`;
const stagingRoot = join(outputDir, rootName);
const archiveName = `${rootName}.zip`;
const archivePath = join(outputDir, archiveName);
const requiredRootFiles = ['package.json', 'package-lock.json', 'README.md', '.gitattributes'];
const sourceEntries = [...new Set([...requiredRootFiles, ...packageJson.files])];
const forbiddenPathParts = new Set([
  '.git',
  'node_modules',
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
]);
const forbiddenRootPaths = new Set(['samples']);
const forbiddenExactNames = new Set(['CHANGELOG.md']);
const forbiddenExtensions = [
  '.tgz',
  '.tsbuildinfo',
  '.trace.zip',
  '.log',
  '.tmp',
  '.env',
  '.pdf',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
];

if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
  fail(`Expected four-component internal version, found ${version}.`);
}

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true });
}

mkdirSync(stagingRoot, { recursive: true });

for (const entry of sourceEntries) {
  if (!existsSync(entry)) {
    fail(`Package source entry does not exist: ${entry}`);
  }

  copySourceEntry(entry);
}

const manifest = {
  name: packageJson.name,
  version,
  archive: archiveName,
  generatedAt: new Date().toISOString(),
  sourceEntries,
};
writeFileSync(join(stagingRoot, 'SOURCE_PACKAGE_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);

createZip();

const listing = listArchiveEntries();
const violations = listing.filter(isForbiddenArchiveEntry);

if (violations.length > 0) {
  fail(`Source package contains forbidden entries:\n${violations.join('\n')}`);
}

if (!listing.some((entry) => entry.endsWith('/package-lock.json'))) {
  fail('Source package must contain package-lock.json.');
}

if (!listing.some((entry) => entry.endsWith('/docs/samples/sample-project.studiowire.json'))) {
  fail('Source package must contain docs/samples.');
}

rmSync(stagingRoot, { recursive: true, force: true });

console.log(`Source package created and inspected: ${archivePath}`);
console.log(`Archive entries inspected: ${listing.length}`);

function copySourceEntry(entry) {
  const destination = join(stagingRoot, entry);

  if (statSync(entry).isDirectory()) {
    cpSync(entry, destination, {
      recursive: true,
      filter: (source) => !isForbiddenSourcePath(source),
    });
    return;
  }

  if (isForbiddenSourcePath(entry)) {
    fail(`Package source entry is forbidden: ${entry}`);
  }

  mkdirSync(dirname(destination), { recursive: true });
  cpSync(entry, destination);
}

function createZip() {
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        [
          '$ErrorActionPreference = "Stop"',
          `Compress-Archive -Path ${quotePowerShellPath(stagingRoot)} -DestinationPath ${quotePowerShellPath(
            archivePath,
          )} -Force`,
        ].join('; '),
      ],
      { stdio: 'inherit' },
    );
    return;
  }

  execFileSync('zip', ['-qr', archivePath, basename(stagingRoot)], {
    cwd: outputDir,
    stdio: 'inherit',
  });
}

function listArchiveEntries() {
  return execFileSync('tar', ['-tf', archivePath], { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((entry) => entry.replace(/\\/g, '/'))
    .filter(Boolean);
}

function isForbiddenSourcePath(path) {
  const normalizedParts = path.split(/[\\/]+/).filter(Boolean);
  const name = normalizedParts[normalizedParts.length - 1] ?? '';
  const normalized = normalizedParts.join('/').toLowerCase();

  return (
    forbiddenRootPaths.has(normalizedParts[0] ?? '') ||
    normalizedParts.some((part) => forbiddenPathParts.has(part)) ||
    forbiddenExactNames.has(name) ||
    name === '.env' ||
    name.startsWith('.env.') ||
    forbiddenExtensions.some((extension) => normalized.endsWith(extension))
  );
}

function isForbiddenArchiveEntry(entry) {
  const parts = entry.split('/').filter(Boolean);
  const relativeParts = parts[0] === rootName ? parts.slice(1) : parts;
  const name = relativeParts[relativeParts.length - 1] ?? '';
  const normalized = relativeParts.join('/').toLowerCase();

  return (
    forbiddenRootPaths.has(relativeParts[0] ?? '') ||
    relativeParts.some((part) => forbiddenPathParts.has(part)) ||
    forbiddenExactNames.has(name) ||
    name === '.env' ||
    name.startsWith('.env.') ||
    forbiddenExtensions.some((extension) => normalized.endsWith(extension))
  );
}

function quotePowerShellPath(path) {
  return `'${path.replace(/'/g, "''")}'`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
