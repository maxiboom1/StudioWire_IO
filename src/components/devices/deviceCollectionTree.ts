import type { DeviceTemplateCatalogEntry } from '../../domain/deviceTemplates/types';

export interface CollectionTreeCategory {
  name: string;
  models: DeviceTemplateCatalogEntry[];
}

export interface CollectionTreeManufacturer {
  name: string;
  categories: CollectionTreeCategory[];
}

export function buildDeviceCollectionTree(
  entries: DeviceTemplateCatalogEntry[],
): CollectionTreeManufacturer[] {
  const manufacturers = new Map<string, Map<string, DeviceTemplateCatalogEntry[]>>();

  for (const entry of entries) {
    const manufacturer = entry.template?.device.manufacturer ?? entry.pathParts?.manufacturer ?? 'Invalid';
    const category = entry.template?.device.categoryName ?? entry.pathParts?.category ?? 'Unsorted';
    const categories = manufacturers.get(manufacturer) ?? new Map<string, DeviceTemplateCatalogEntry[]>();
    const models = categories.get(category) ?? [];
    models.push(entry);
    categories.set(category, models);
    manufacturers.set(manufacturer, categories);
  }

  return [...manufacturers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, categories]) => ({
      name,
      categories: [...categories.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([categoryName, models]) => ({
          name: categoryName,
          models: models.sort((left, right) =>
            (left.template?.device.model ?? left.sourcePath).localeCompare(
              right.template?.device.model ?? right.sourcePath,
            ),
          ),
        })),
    }));
}
