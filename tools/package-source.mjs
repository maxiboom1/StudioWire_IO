import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  SOURCE_PACKAGE_DIR,
  createPackageNames,
  createSourceArchive,
  extractArchiveToFreshTemp,
  inspectArchive,
  readPackageJson,
  removeExtraction,
  runCommand,
} from './release/source-package-lib.mjs';

const repoRoot = resolve('.');
const packageJson = readPackageJson(repoRoot);
const version = packageJson.version;
const target = '0.2.8.5';
const { rootName } = createPackageNames(version);
const reportPath = join(repoRoot, SOURCE_PACKAGE_DIR, 'source-package-report.json');

if (version !== target) {
  fail(`Source package target must be ${target}, found ${version}.`);
}

let extractionParent = null;
let extractionCleaned = false;
const commands = [];

try {
  mkdirSync(join(repoRoot, SOURCE_PACKAGE_DIR), { recursive: true });

  const archive = await createSourceArchive(repoRoot);
  const inspection = await inspectArchive(archive.archivePath, rootName);

  if (!inspection.requiredEntriesPresent || !inspection.forbiddenEntriesAbsent) {
    fail(
      [
        'Source archive inspection failed.',
        `Missing required entries: ${inspection.missingRequiredEntries.join(', ') || 'none'}`,
        `Forbidden entries: ${inspection.forbiddenEntries.join(', ') || 'none'}`,
      ].join('\n'),
    );
  }

  const extraction = await extractArchiveToFreshTemp(archive.archivePath, rootName);
  extractionParent = extraction.extractionParent;

  runPackageCommand('npm', ['ci'], extraction.packageRoot);
  runPackageCommand('npm', ['run', 'test:e2e:install'], extraction.packageRoot);
  runPackageCommand('npm', ['run', 'check:release'], extraction.packageRoot);
  runPackageCommand(
    'npm',
    ['run', 'validate:project', '--', 'docs/samples/sample-project.studiowire.json'],
    extraction.packageRoot,
  );
  runPackageCommand(
    'npm',
    ['run', 'summary', '--', 'docs/samples/sample-project.studiowire.json'],
    extraction.packageRoot,
  );
  runPackageCommand('npm', ['run', 'version:check'], extraction.packageRoot);

  extractionCleaned = removeExtraction(extractionParent);
  extractionParent = null;

  const report = {
    archivePath: archive.archivePath,
    archiveSizeBytes: statSync(archive.archivePath).size,
    entryCount: inspection.entryCount,
    requiredEntriesPresent: inspection.requiredEntriesPresent,
    forbiddenEntriesAbsent: inspection.forbiddenEntriesAbsent,
    missingRequiredEntries: inspection.missingRequiredEntries,
    forbiddenEntries: inspection.forbiddenEntries,
    extractionParent: extraction.extractionParent,
    packageRoot: extraction.packageRoot,
    commands,
    extractionCleaned,
  };

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Source package created and verified: ${archive.archivePath}`);
  console.log(`Archive size: ${report.archiveSizeBytes} bytes`);
  console.log(`Archive entries inspected: ${inspection.entryCount}`);
  console.log(`Required entries present: ${inspection.requiredEntriesPresent}`);
  console.log(`Forbidden entries absent: ${inspection.forbiddenEntriesAbsent}`);
  console.log(`Clean extraction path used: ${extraction.extractionParent}`);
  console.log(`Extraction cleanup complete: ${extractionCleaned}`);
} finally {
  if (extractionParent && existsSync(extractionParent)) {
    rmSync(extractionParent, { recursive: true, force: true });
  }
}

function runPackageCommand(command, args, cwd) {
  commands.push(`${command} ${args.join(' ')}`);
  runCommand(command, args, cwd);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
