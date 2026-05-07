import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

type Mode = 'diff' | 'snapshot';
type TestResult = 'pass' | 'fail' | 'partial';

interface CliArgs {
  name: string | null;
  base: string | null;
  snapshot: boolean;
}

interface CommandResult {
  command: string;
  status: number | null;
  output: string;
}

const REPO_ROOT = process.cwd();
const DIFF_LOG_ROOT = resolve(REPO_ROOT, 'tools', 'diff_logs');
const EXCLUDED_PREFIXES = ['node_modules/', 'dist/', 'build/', '.git/', 'tools/diff_logs/', 'coverage/', '.vite/'];
const EXCLUDED_FILE_PATTERNS = [/\.tsbuildinfo$/, /^StudioWire_IO_.*\.zip$/];
const MAX_COPY_BYTES = 2 * 1024 * 1024;
const TEST_COMMANDS = [
  ['npm', ['test', '--', '--run']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'validate:project', '--', 'samples/sample-project.studiowire.json']],
  ['npm', ['run', 'summary', '--', 'samples/sample-project.studiowire.json']],
] as const;
const KEY_FILES = [
  '.gitignore',
  'CHANGELOG.md',
  'package.json',
  'package-lock.json',
  'AGENTS.md',
  'README.md',
  'docs/PRODUCT_SPEC_V0_1.md',
  'docs/DATA_MODEL_V0_1.md',
  'docs/VALIDATION_RULES_V0_1.md',
  'docs/ROADMAP.md',
  'docs/REVIEW_WORKFLOW.md',
  'tools/diff_logs/README.md',
  'schema/studiowire.project.schema.json',
  'samples/sample-project.studiowire.json',
  'src/domain/types.ts',
  'src/domain/cableNumbers.ts',
  'src/domain/plannedCables.ts',
  'src/domain/validators.ts',
  'src/state/projectReducer.ts',
  'src/state/ProjectContext.tsx',
];

main();

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.name) {
    fail('Missing required --name argument.');
  }

  const mode: Mode = args.snapshot ? 'snapshot' : 'diff';
  const baseRef = mode === 'snapshot' ? null : resolveBaseRef(args.base);

  if (mode === 'diff' && !baseRef) {
    fail('No valid base ref found. Re-run with --snapshot to create a current-state review bundle.');
  }

  mkdirSync(DIFF_LOG_ROOT, { recursive: true });
  const outputPath = resolve(DIFF_LOG_ROOT, args.name);
  assertInside(outputPath, DIFF_LOG_ROOT);
  rmSync(outputPath, { recursive: true, force: true });
  mkdirSync(outputPath, { recursive: true });
  mkdirSync(join(outputPath, 'key-files'), { recursive: true });
  mkdirSync(join(outputPath, 'changed-files-full'), { recursive: true });
  mkdirSync(join(outputPath, 'snapshot-files'), { recursive: true });

  const currentBranch = gitText(['branch', '--show-current']).trim();
  const headCommit = gitText(['rev-parse', 'HEAD']).trim();
  const shortHead = gitText(['rev-parse', '--short', 'HEAD']).trim();

  writeText(outputPath, 'git-status.txt', gitText(['status', '--short', '--branch']));
  writeText(
    outputPath,
    'git-branch.txt',
    [
      '$ git branch --show-current',
      currentBranch,
      '$ git rev-parse HEAD',
      headCommit,
      '$ git rev-parse --short HEAD',
      shortHead,
      '$ git tag --points-at HEAD',
      gitText(['tag', '--points-at', 'HEAD']).trim(),
      '',
    ].join('\n'),
  );
  writeText(
    outputPath,
    'git-log.txt',
    mode === 'diff' && baseRef
      ? gitText(['log', '--oneline', `${baseRef}..HEAD`])
      : gitText(['log', '--oneline', '--max-count=20']),
  );

  const untrackedFiles = filterPaths(gitLines(['ls-files', '--others', '--exclude-standard']));
  const changedFiles = mode === 'snapshot' ? getSnapshotFiles() : getDiffChangedFiles(baseRef as string, untrackedFiles);
  const sortedChangedFiles = uniqueSorted(changedFiles);

  writeText(outputPath, 'untracked-files.txt', untrackedFiles.join('\n') + trailingNewline(untrackedFiles));
  writeText(outputPath, 'changed-files.txt', sortedChangedFiles.join('\n') + trailingNewline(sortedChangedFiles));
  writeText(outputPath, 'repository-tree.txt', createRepositoryTree());

  if (mode === 'snapshot') {
    writeText(outputPath, 'diff-stat.txt', 'Snapshot mode: no base ref was used.\n');
    writeText(outputPath, 'diff.patch', 'Snapshot mode: no diff patch was generated.\n');
    copyFiles(sortedChangedFiles, join(outputPath, 'snapshot-files'));
  } else {
    writeText(outputPath, 'diff-stat.txt', createDiffStat(baseRef as string));
    writeText(outputPath, 'diff.patch', createDiffPatch(baseRef as string));
    copyFiles(sortedChangedFiles, join(outputPath, 'changed-files-full'));
  }

  copyFiles(KEY_FILES, join(outputPath, 'key-files'));

  const testResults = runTestCommands();
  const testOutput = formatCommandResults(testResults);
  writeText(outputPath, 'test-output.txt', testOutput);

  const testResult = summarizeTests(testResults);
  const manifest = {
    generatedAt: new Date().toISOString(),
    bundleName: args.name,
    mode,
    baseRef,
    currentBranch,
    headCommit,
    nodeVersion: process.version,
    npmVersion: commandText('npm', ['--version']).trim(),
    changedFileCount: sortedChangedFiles.length,
    untrackedFileCount: untrackedFiles.length,
    testCommandsRun: TEST_COMMANDS.map(([command, commandArgs]) => `${command} ${commandArgs.join(' ')}`),
    testResult,
    outputPath: toRepoPath(outputPath),
  };

  writeText(outputPath, 'manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  writeText(outputPath, 'REVIEW_SUMMARY.md', createReviewSummary(args.name, mode, baseRef, currentBranch, headCommit, testResults));

  console.log(`Review bundle created: ${toRepoPath(outputPath)}`);
  console.log(`Mode: ${mode}`);
  console.log(`${mode === 'snapshot' ? 'Snapshot' : 'Changed'} file count: ${sortedChangedFiles.length}`);
  console.log(`Tests/build: ${testResult}`);
  const failures = testResults.filter((result) => result.status !== 0);
  if (failures.length > 0) {
    console.log(`Failures: ${failures.map((result) => result.command).join(', ')}`);
  } else {
    console.log('Failures: none');
  }
}

function parseArgs(argv: string[]): CliArgs {
  const parsed: CliArgs = { name: null, base: null, snapshot: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--snapshot') {
      parsed.snapshot = true;
    } else if (arg === '--name') {
      parsed.name = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith('--name=')) {
      parsed.name = arg.slice('--name='.length);
    } else if (arg === '--base') {
      parsed.base = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith('--base=')) {
      parsed.base = arg.slice('--base='.length);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function resolveBaseRef(explicitBase: string | null): string | null {
  if (explicitBase) {
    return isValidGitRef(explicitBase) ? explicitBase : null;
  }

  const latestTag = gitText(['describe', '--tags', '--abbrev=0']).trim();
  const candidates = [latestTag, 'main', 'master', 'HEAD~1'].filter(Boolean);

  for (const candidate of candidates) {
    if (isValidGitRef(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isValidGitRef(ref: string): boolean {
  const result = spawnSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  return result.status === 0;
}

function getDiffChangedFiles(baseRef: string, untrackedFiles: string[]): string[] {
  return uniqueSorted([
    ...gitLines(['diff', '--name-only', baseRef, 'HEAD', '--', ...gitExcludes()]),
    ...gitLines(['diff', '--name-only', '--cached', '--', ...gitExcludes()]),
    ...gitLines(['diff', '--name-only', '--', ...gitExcludes()]),
    ...untrackedFiles,
  ]);
}

function getSnapshotFiles(): string[] {
  const files = new Set<string>();
  const directFiles = [
    'package.json',
    'package-lock.json',
    'AGENTS.md',
    'README.md',
    'index.html',
  ];

  for (const file of directFiles) {
    addIfFile(files, file);
  }

  for (const pattern of ['vite.config.', 'vitest.config.']) {
    for (const file of listFiles('.')) {
      if (!file.includes('/') && file.startsWith(pattern)) {
        files.add(file);
      }
    }
  }

  for (const file of listFiles('.')) {
    if (/^tsconfig.*\.json$/.test(file)) {
      files.add(file);
    }
  }

  for (const directory of ['docs', 'schema', 'samples', 'src', 'public']) {
    if (existsSync(join(REPO_ROOT, directory))) {
      for (const file of listFiles(directory)) {
        files.add(file);
      }
    }
  }

  if (existsSync(join(REPO_ROOT, 'tools'))) {
    for (const file of listFiles('tools')) {
      if (/^tools\/[^/]+\.ts$/.test(file)) {
        files.add(file);
      }
    }
  }

  return uniqueSorted([...files]);
}

function createDiffStat(baseRef: string): string {
  return [
    `# git diff --stat ${baseRef} HEAD`,
    gitText(['diff', '--stat', baseRef, 'HEAD', '--', ...gitExcludes()]),
    '# git diff --stat --cached',
    gitText(['diff', '--stat', '--cached', '--', ...gitExcludes()]),
    '# git diff --stat',
    gitText(['diff', '--stat', '--', ...gitExcludes()]),
    '',
  ].join('\n');
}

function createDiffPatch(baseRef: string): string {
  return [
    `# git diff ${baseRef} HEAD`,
    gitText(['diff', baseRef, 'HEAD', '--', ...gitExcludes()]),
    '# git diff --cached',
    gitText(['diff', '--cached', '--', ...gitExcludes()]),
    '# git diff',
    gitText(['diff', '--', ...gitExcludes()]),
    '',
  ].join('\n');
}

function copyFiles(files: string[], destinationRoot: string): void {
  for (const file of files) {
    const normalized = normalizePath(file);

    if (isExcluded(normalized) || !existsSync(join(REPO_ROOT, normalized))) {
      continue;
    }

    const source = join(REPO_ROOT, normalized);
    const stats = statSync(source);

    if (!stats.isFile() || stats.size > MAX_COPY_BYTES || isBinaryFile(source)) {
      continue;
    }

    const destination = resolve(destinationRoot, normalized);
    assertInside(destination, destinationRoot);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
}

function createRepositoryTree(): string {
  const files = listFiles('.');
  const lines = ['.'];

  for (const file of files) {
    lines.push(`  ${file}`);
  }

  return `${lines.join('\n')}\n`;
}

function listFiles(startDirectory: string): string[] {
  const start = join(REPO_ROOT, startDirectory);
  const results: string[] = [];

  if (!existsSync(start)) {
    return results;
  }

  walk(start, results);
  return uniqueSorted(results);
}

function walk(currentPath: string, results: string[]): void {
  const entries = readdirSync(currentPath, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const absolute = join(currentPath, entry.name);
    const repoPath = toRepoPath(absolute);

    if (isExcluded(repoPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(absolute, results);
    } else if (entry.isFile()) {
      results.push(repoPath);
    }
  }
}

function runTestCommands(): CommandResult[] {
  return TEST_COMMANDS.map(([command, commandArgs]) => {
    const result = spawnSync(resolveExecutable(command), [...commandArgs], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      shell: false,
    });

    return {
      command: `${command} ${commandArgs.join(' ')}`,
      status: result.status,
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    };
  });
}

function formatCommandResults(results: CommandResult[]): string {
  return results
    .map((result) =>
      [
        `$ ${result.command}`,
        `Exit code: ${result.status ?? 'not started'}`,
        result.output.trimEnd(),
        '',
      ].join('\n'),
    )
    .join('\n');
}

function summarizeTests(results: CommandResult[]): TestResult {
  const passed = results.filter((result) => result.status === 0).length;

  if (passed === results.length) {
    return 'pass';
  }

  if (passed === 0) {
    return 'fail';
  }

  return 'partial';
}

function createReviewSummary(
  bundleName: string,
  mode: Mode,
  baseRef: string | null,
  currentBranch: string,
  headCommit: string,
  testResults: CommandResult[],
): string {
  const failures = testResults.filter((result) => result.status !== 0);
  const snapshotNote =
    mode === 'snapshot' && bundleName === '0.1.1'
      ? '\nThis repository appears to have been initialized after v0.1.1 implementation, so this bundle is a snapshot rather than a v0.1.0 to v0.1.1 diff.\n'
      : '';

  return `# StudioWire IO Review Summary

- Project: StudioWire IO
- Bundle name: ${bundleName}
- Mode: ${mode}
- Base reference used: ${baseRef ?? 'none - snapshot mode'}
- Current branch: ${currentBranch || '(detached or unknown)'}
- Current HEAD commit: ${headCommit || '(unavailable)'}

Architecture review bundle for StudioWire IO.
${snapshotNote}
## Commands Run

${TEST_COMMANDS.map(([command, commandArgs]) => `- \`${command} ${commandArgs.join(' ')}\``).join('\n')}

## Test/Build Result Summary

${testResults.map((result) => `- \`${result.command}\`: ${result.status === 0 ? 'pass' : `failed (${result.status ?? 'not started'})`}`).join('\n')}

## Known Failures

${failures.length === 0 ? 'None.' : failures.map((result) => `- \`${result.command}\` failed with exit code ${result.status ?? 'not started'}.`).join('\n')}

## Codex Notes/Deviations

${mode === 'snapshot' ? '- Snapshot mode was used, so no base diff patch was generated.' : '- Diff mode was used against the selected base reference.'}

## Scope Reminder

v0.2 features should not be included in v0.1.1: terminal blocks, rear/front TB logic, device-to-TB connections, Excel export, Bartender export, Visio export, backend, database, and auth.
`;
}

function gitText(args: string[]): string {
  return commandText('git', args);
}

function gitLines(args: string[]): string[] {
  return filterPaths(gitText(args).split(/\r?\n/).filter(Boolean));
}

function commandText(command: string, args: string[]): string {
  try {
    return execFileSync(resolveExecutable(command), args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const childError = error as { stdout?: string; stderr?: string };
    return `${childError.stdout ?? ''}${childError.stderr ?? ''}`;
  }
}

function resolveExecutable(command: string): string {
  return process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
}

function gitExcludes(): string[] {
  return [
    '.',
    ...EXCLUDED_PREFIXES.map((prefix) => `:(exclude)${prefix}**`),
    ':(exclude)*.tsbuildinfo',
    ':(exclude)StudioWire_IO_*.zip',
  ];
}

function filterPaths(paths: string[]): string[] {
  return uniqueSorted(paths.map(normalizePath).filter((file) => file && !isExcluded(file)));
}

function normalizePath(file: string): string {
  return file.replaceAll('\\', '/').replace(/^\.\//, '');
}

function isExcluded(file: string): boolean {
  const normalized = normalizePath(file);
  const basename = normalized.split('/').pop() ?? normalized;

  return (
    EXCLUDED_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)) ||
    EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(basename))
  );
}

function isBinaryFile(file: string): boolean {
  const sample = readFileSync(file).subarray(0, 8000);

  return sample.includes(0);
}

function addIfFile(files: Set<string>, file: string): void {
  if (existsSync(join(REPO_ROOT, file)) && statSync(join(REPO_ROOT, file)).isFile()) {
    files.add(file);
  }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function trailingNewline(values: string[]): string {
  return values.length > 0 ? '\n' : '';
}

function writeText(root: string, file: string, content: string): void {
  const destination = resolve(root, file);
  assertInside(destination, root);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function toRepoPath(absolutePath: string): string {
  return normalizePath(relative(REPO_ROOT, absolutePath).split(sep).join('/'));
}

function assertInside(targetPath: string, parentPath: string): void {
  const relativePath = relative(resolve(parentPath), resolve(targetPath));

  if (relativePath.startsWith('..') || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`Refusing to write outside ${parentPath}: ${targetPath}`);
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
