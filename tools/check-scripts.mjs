import { readFileSync } from 'node:fs';

const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
const failures = [];

assertScriptDoesNotInvoke('check', ['test:run', 'test', 'package:source', 'check:full']);
assertScriptDoesNotInvoke('check:release', ['package:source', 'check:full']);
assertScriptDoesNotInvoke('package:source', ['package:source', 'check:full']);
assertScriptDoesNotInvoke('check:full', ['check:full']);

if (!scripts.coverage?.includes('vitest run --coverage')) {
  failures.push('coverage must use explicit Vitest run mode.');
}

if (/\bvitest\b(?!\s+(run|--run))/.test(resolveScript('check'))) {
  failures.push('check must not invoke Vitest watcher mode.');
}

if (
  resolveScript('check:full').includes('package:source') &&
  resolveScript('package:source').includes('check:full')
) {
  failures.push('check:full/package:source recursion detected.');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Release script hierarchy check passed.');

function assertScriptDoesNotInvoke(scriptName, forbiddenTargets) {
  const script = scripts[scriptName] ?? '';

  for (const target of forbiddenTargets) {
    if (scriptName === target) {
      continue;
    }

    if (script.includes(`npm run ${target}`)) {
      failures.push(`${scriptName} must not invoke ${target}.`);
    }
  }
}

function resolveScript(scriptName, seen = new Set()) {
  if (seen.has(scriptName)) {
    return '';
  }

  seen.add(scriptName);

  const script = scripts[scriptName] ?? '';

  return script.replace(
    /npm run ([\w:-]+)/g,
    (_match, target) => `${scripts[target] ?? ''} ${resolveScript(target, seen)}`,
  );
}
