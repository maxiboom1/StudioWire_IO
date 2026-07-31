import type { ProjectRoot } from './types';

export type ProjectItemNameType = 'device' | 'terminal block' | 'rack' | 'folder';

export interface ProjectItemNameConflict {
  id: string;
  name: string;
  type: ProjectItemNameType;
}

export interface ProjectItemNameExclusion {
  id: string;
  type: ProjectItemNameType;
}

export function normalizeProjectItemName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function findProjectItemNameConflict(
  project: ProjectRoot,
  name: string,
  exclusion?: ProjectItemNameExclusion,
): ProjectItemNameConflict | null {
  const normalizedName = normalizeProjectItemName(name);

  if (!normalizedName) {
    return null;
  }

  const items: ProjectItemNameConflict[] = [
    ...project.devices.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.kind === 'terminal_block' ? ('terminal block' as const) : ('device' as const),
    })),
    ...project.racks.map((rack) => ({
      id: rack.id,
      name: rack.name,
      type: 'rack' as const,
    })),
    ...project.subLocations.map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: 'folder' as const,
    })),
  ];

  return (
    items.find(
      (item) =>
        normalizeProjectItemName(item.name) === normalizedName &&
        !(exclusion && item.id === exclusion.id && item.type === exclusion.type),
    ) ?? null
  );
}

export function findLocationNameConflict(project: ProjectRoot, name: string, excludeLocationId?: string) {
  const normalizedName = normalizeProjectItemName(name);

  if (!normalizedName) {
    return null;
  }

  return (
    project.locations.find(
      (location) =>
        location.id !== excludeLocationId && normalizeProjectItemName(location.name) === normalizedName,
    ) ?? null
  );
}

export function formatProjectItemNameConflict(conflict: ProjectItemNameConflict): string {
  return `Name is already used by ${conflict.type} "${conflict.name}".`;
}
