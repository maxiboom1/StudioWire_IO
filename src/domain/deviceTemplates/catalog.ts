import type { DeviceTemplateCatalogEntry, DeviceTemplateIssue, DeviceTemplateSourceEntry } from './types';
import { normalizeTemplateName, validateDeviceTemplateSource } from './templateValidation';

export function buildDeviceTemplateCatalog(
  sources: DeviceTemplateSourceEntry[],
): DeviceTemplateCatalogEntry[] {
  const entries = sources.map((source) => {
    const result = validateDeviceTemplateSource(source);

    return {
      sourcePath: source.path,
      pathParts: result.pathParts,
      template: result.template,
      issues: result.issues,
    } satisfies DeviceTemplateCatalogEntry;
  });
  const entriesByKey = new Map<string, DeviceTemplateCatalogEntry[]>();

  for (const entry of entries) {
    if (!entry.template) {
      continue;
    }

    const key = [
      entry.template.device.manufacturer,
      entry.template.device.categoryName,
      entry.template.device.model,
    ]
      .map(normalizeTemplateName)
      .join('\u0000');
    const matches = entriesByKey.get(key) ?? [];
    matches.push(entry);
    entriesByKey.set(key, matches);
  }

  for (const matches of entriesByKey.values()) {
    if (matches.length < 2) {
      continue;
    }

    const issue: DeviceTemplateIssue = {
      code: 'device-template-duplicate-model',
      message: 'Collection contains more than one template for this manufacturer/category/model.',
    };

    for (const entry of matches) {
      entry.issues.push(issue);
    }
  }

  return entries.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}
