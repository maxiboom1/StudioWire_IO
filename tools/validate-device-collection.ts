import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { buildDeviceTemplateCatalog } from '../src/domain/deviceTemplates/catalog';
import type { DeviceTemplateSourceEntry } from '../src/domain/deviceTemplates/types';

const repositoryRoot = resolve('.');
const collectionRoot = join(repositoryRoot, 'collections', 'devices');
const failures: string[] = [];
const sources: DeviceTemplateSourceEntry[] = [];

for (const filePath of walkFiles(collectionRoot)) {
  if (!filePath.endsWith('.studiowire-device.json')) {
    failures.push(`${formatPath(filePath)}: unsupported file; expected *.studiowire-device.json`);
    continue;
  }

  try {
    sources.push({
      path: formatPath(filePath),
      value: JSON.parse(readFileSync(filePath, 'utf8')) as unknown,
    });
  } catch (error) {
    failures.push(`${formatPath(filePath)}: ${error instanceof Error ? error.message : 'invalid JSON'}`);
  }
}

for (const entry of buildDeviceTemplateCatalog(sources)) {
  for (const issue of entry.issues) {
    failures.push(`${entry.sourcePath}${issue.path ? ` ${issue.path}` : ''}: ${issue.message}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Device collection validation passed for ${sources.length} template(s).`);

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
  });
}

function formatPath(path: string): string {
  return relative(repositoryRoot, path).replace(/\\/g, '/');
}
