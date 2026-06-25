import { existsSync, lstatSync, readdirSync, rmSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';

export const GENERATED_DIR_NAMES = new Set([
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

const SKIP_DIR_NAMES = new Set(['.git', 'node_modules']);
const OBSOLETE_ROOT_PATHS = new Set(['samples', 'CHANGELOG.md']);
const GENERATED_FILE_SUFFIXES = ['.tsbuildinfo', '.tgz', '.zip', '.trace.zip', '.log', '.tmp', '.webm'];
const GENERATED_FILE_NAMES = new Set(['.DS_Store', 'Thumbs.db']);
const PLAYWRIGHT_IMAGE_SUFFIXES = ['-actual.png', '-diff.png', '-expected.png'];

export function findGeneratedArtifacts(root = '.') {
  const repoRoot = resolve(root);
  const artifacts = [];

  for (const obsoletePath of OBSOLETE_ROOT_PATHS) {
    const absolute = join(repoRoot, obsoletePath);

    if (existsSync(absolute)) {
      artifacts.push(toRelative(repoRoot, absolute));
    }
  }

  walk(repoRoot, repoRoot, artifacts);

  return Array.from(new Set(artifacts)).sort((left, right) => left.localeCompare(right));
}

export function removeGeneratedArtifacts(root = '.') {
  const repoRoot = resolve(root);
  const artifacts = findGeneratedArtifacts(repoRoot);

  for (const artifact of artifacts) {
    const absolute = resolve(repoRoot, artifact);

    if (!isInside(repoRoot, absolute)) {
      throw new Error(`Refusing to remove path outside repository: ${artifact}`);
    }

    rmSync(absolute, { recursive: true, force: true });
  }

  return artifacts;
}

function walk(repoRoot, directory, artifacts) {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stats = lstatSync(absolute);

    if (stats.isSymbolicLink()) {
      continue;
    }

    if (stats.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry)) {
        continue;
      }

      if (GENERATED_DIR_NAMES.has(entry)) {
        artifacts.push(toRelative(repoRoot, absolute));
        continue;
      }

      walk(repoRoot, absolute, artifacts);
      continue;
    }

    if (isGeneratedFile(entry)) {
      artifacts.push(toRelative(repoRoot, absolute));
    }
  }
}

function isGeneratedFile(name) {
  const lowerName = name.toLowerCase();

  return (
    GENERATED_FILE_NAMES.has(name) ||
    GENERATED_FILE_SUFFIXES.some((suffix) => lowerName.endsWith(suffix)) ||
    PLAYWRIGHT_IMAGE_SUFFIXES.some((suffix) => lowerName.endsWith(suffix)) ||
    extname(lowerName) === '.tmp'
  );
}

function toRelative(root, absolute) {
  return relative(root, absolute).replace(/\\/g, '/');
}

function isInside(root, candidate) {
  const relativePath = relative(resolve(root), resolve(candidate));

  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}
