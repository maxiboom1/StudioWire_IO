import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import JSZip from 'jszip';

export const SOURCE_PACKAGE_DIR = '.source-package';
export const MANIFEST_NAME = 'SOURCE_PACKAGE_MANIFEST.json';

const REQUIRED_ROOT_FILES = ['package.json', 'package-lock.json', 'README.md', '.gitattributes'];
const FORBIDDEN_PATH_PARTS = new Set([
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
  SOURCE_PACKAGE_DIR,
]);
const FORBIDDEN_ROOT_PATHS = new Set(['samples']);
const FORBIDDEN_EXACT_NAMES = new Set(['CHANGELOG.md']);
const FORBIDDEN_EXTENSIONS = [
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

export function readPackageJson(repoRoot) {
  return JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
}

export function assertFourPartVersion(version) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Expected four-component internal version, found ${version}.`);
  }
}

export function createPackageNames(version) {
  assertFourPartVersion(version);
  const rootName = `StudioWire_IO-${version}`;

  return {
    rootName,
    archiveName: `${rootName}.zip`,
  };
}

export function getAllowlistedSourceEntries(packageJson) {
  return [...new Set([...REQUIRED_ROOT_FILES, ...packageJson.files])];
}

export function isForbiddenPackageRelativePath(path) {
  const parts = normalizeRelativeParts(path);
  const name = parts[parts.length - 1] ?? '';
  const normalized = parts.join('/').toLowerCase();

  return (
    parts.length === 0 ||
    FORBIDDEN_ROOT_PATHS.has(parts[0] ?? '') ||
    parts.some((part) => FORBIDDEN_PATH_PARTS.has(part)) ||
    FORBIDDEN_EXACT_NAMES.has(name) ||
    name === '.env' ||
    name.startsWith('.env.') ||
    FORBIDDEN_EXTENSIONS.some((extension) => normalized.endsWith(extension))
  );
}

export function validateArchiveEntryName(entryName, rootName, seenEntries = new Set()) {
  const normalized = normalizeArchiveEntryName(entryName);

  if (!normalized || normalized.endsWith('/')) {
    return { ok: true, normalized };
  }

  if (isAbsolute(normalized) || /^[a-zA-Z]:/.test(normalized) || normalized.includes('\0')) {
    return { ok: false, reason: 'absolute or drive-qualified ZIP entry' };
  }

  const parts = normalized.split('/').filter(Boolean);

  if (parts.some((part) => part === '..') || parts[0] !== rootName) {
    return { ok: false, reason: 'path traversal or unexpected package root' };
  }

  const relativePath = parts.slice(1).join('/');

  if (!relativePath || isForbiddenPackageRelativePath(relativePath)) {
    return { ok: false, reason: 'forbidden package path' };
  }

  const duplicateKey = normalized.toLowerCase();

  if (seenEntries.has(duplicateKey)) {
    return { ok: false, reason: 'duplicate ZIP entry' };
  }

  seenEntries.add(duplicateKey);

  return { ok: true, normalized };
}

export async function createSourceArchive(repoRoot, options = {}) {
  const packageJson = readPackageJson(repoRoot);
  const version = options.version ?? packageJson.version;
  const { rootName, archiveName } = createPackageNames(version);
  const outputDir = resolve(repoRoot, options.outputDir ?? SOURCE_PACKAGE_DIR);
  const stagingRoot = join(outputDir, `${rootName}-staging`);
  const packageRoot = join(stagingRoot, rootName);
  const archivePath = join(outputDir, archiveName);
  const sourceEntries = getAllowlistedSourceEntries(packageJson);
  const zip = new JSZip();

  rmSync(stagingRoot, { recursive: true, force: true });
  mkdirSync(packageRoot, { recursive: true });

  try {
    for (const entry of sourceEntries) {
      const sourcePath = resolve(repoRoot, entry);

      if (!existsSync(sourcePath)) {
        throw new Error(`Package source entry does not exist: ${entry}`);
      }

      copySourceEntry(repoRoot, sourcePath, join(packageRoot, entry), entry);
    }

    const manifest = {
      name: packageJson.name,
      version,
      archive: archiveName,
      generatedAt: new Date().toISOString(),
      sourceEntries,
    };

    writeFileSync(join(packageRoot, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);

    addDirectoryToZip(zip, packageRoot, rootName);

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      archivePath,
      await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      }),
    );
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }

  return { archivePath, archiveName, rootName, sourceEntries };
}

export async function inspectArchive(archivePath, rootName) {
  const zip = await JSZip.loadAsync(readFileSync(archivePath));
  const seenEntries = new Set();
  const entries = [];
  const forbidden = [];

  for (const entry of Object.values(zip.files)) {
    const result = validateArchiveEntryName(entry.name, rootName, seenEntries);

    if (!result.ok) {
      forbidden.push(`${entry.name}: ${result.reason}`);
      continue;
    }

    if (!entry.dir) {
      entries.push(result.normalized);
    }
  }

  const required = requiredArchiveEntries(rootName);
  const missing = required.filter((entry) => !entries.includes(entry));
  const roots = new Set(entries.map((entry) => entry.split('/')[0]));

  if (roots.size !== 1 || !roots.has(rootName)) {
    forbidden.push(`expected exactly one root ${rootName}, found ${Array.from(roots).sort().join(', ')}`);
  }

  return {
    entries: entries.sort(),
    entryCount: entries.length,
    forbiddenEntries: forbidden.sort(),
    missingRequiredEntries: missing,
    requiredEntriesPresent: missing.length === 0,
    forbiddenEntriesAbsent: forbidden.length === 0,
  };
}

export async function extractArchiveToFreshTemp(archivePath, rootName) {
  const extractionParent = mkdtempSync(join(tmpdir(), 'studiowire-source-'));
  const zip = await JSZip.loadAsync(readFileSync(archivePath));
  const seenEntries = new Set();

  try {
    for (const entry of Object.values(zip.files)) {
      const result = validateArchiveEntryName(entry.name, rootName, seenEntries);

      if (!result.ok) {
        throw new Error(`Unsafe ZIP entry ${entry.name}: ${result.reason}`);
      }

      if (entry.dir) {
        continue;
      }

      const destination = resolve(extractionParent, result.normalized);

      if (!isInside(extractionParent, destination)) {
        throw new Error(`ZIP entry escapes extraction root: ${entry.name}`);
      }

      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, await entry.async('nodebuffer'));
    }

    const roots = readdirSync(extractionParent);

    if (roots.length !== 1 || roots[0] !== rootName) {
      throw new Error(`Expected one extracted package root ${rootName}, found ${roots.join(', ')}.`);
    }

    return {
      extractionParent,
      packageRoot: join(extractionParent, rootName),
    };
  } catch (error) {
    rmSync(extractionParent, { recursive: true, force: true });
    throw error;
  }
}

export function removeExtraction(extractionParent) {
  rmSync(extractionParent, { recursive: true, force: true });
  return !existsSync(extractionParent);
}

export function runCommand(command, args, cwd) {
  execFileSync(resolveExecutable(command), args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  });
}

function resolveExecutable(command) {
  if (process.platform === 'win32' && command === 'npm') {
    return 'npm.cmd';
  }

  return command;
}

export function requiredArchiveEntries(rootName) {
  return [
    `${rootName}/package.json`,
    `${rootName}/package-lock.json`,
    `${rootName}/README.md`,
    `${rootName}/src/domain/version.ts`,
    `${rootName}/schema/studiowire.project.schema.json`,
    `${rootName}/docs/samples/sample-project.studiowire.json`,
    `${rootName}/tools/package-source.mjs`,
    `${rootName}/${MANIFEST_NAME}`,
  ];
}

function copySourceEntry(repoRoot, sourcePath, destinationPath, relativeEntry) {
  if (isForbiddenPackageRelativePath(relativeEntry)) {
    throw new Error(`Package source entry is forbidden: ${relativeEntry}`);
  }

  const stats = lstatSync(sourcePath);

  if (stats.isSymbolicLink()) {
    const realSource = realpathSync(sourcePath);

    if (!isInside(repoRoot, realSource)) {
      throw new Error(`Package source symlink escapes repository: ${relativeEntry}`);
    }
  }

  if (statSync(sourcePath).isDirectory()) {
    cpSync(sourcePath, destinationPath, {
      recursive: true,
      filter: (source) => {
        const relativePath = relative(repoRoot, source);

        if (!relativePath) {
          return true;
        }

        return !isForbiddenPackageRelativePath(relativePath);
      },
    });
    return;
  }

  mkdirSync(dirname(destinationPath), { recursive: true });
  cpSync(sourcePath, destinationPath, { dereference: true });
}

function addDirectoryToZip(zip, directory, rootName) {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const relativeName = join(rootName, relative(directory, absolute)).split(sep).join('/');
    const stats = statSync(absolute);

    if (stats.isDirectory()) {
      addDirectoryToZip(zip.folder(relativeName), absolute, '');
      continue;
    }

    const zipPath = rootName ? relativeName : relative(directory, absolute).split(sep).join('/');
    zip.file(zipPath, readFileSync(absolute));
  }
}

function normalizeArchiveEntryName(entryName) {
  return entryName.replace(/\\/g, '/').replace(/^\/+/, '');
}

function normalizeRelativeParts(path) {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.');
}

function isInside(root, candidate) {
  const relativePath = relative(resolve(root), resolve(candidate));

  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}
