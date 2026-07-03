import type { ProjectRoot, SubLocation } from './types';

export interface SubLocationOption {
  id: string | null;
  name: string;
}

export function getSubLocationsForLocation(project: ProjectRoot, locationId: string): SubLocation[] {
  return project.subLocations.filter((subLocation) => subLocation.locationId === locationId);
}

export function isSubLocationInLocation(
  project: ProjectRoot,
  subLocationId: string | null | undefined,
  locationId: string,
): boolean {
  if (!subLocationId) {
    return true;
  }

  return project.subLocations.some(
    (subLocation) => subLocation.id === subLocationId && subLocation.locationId === locationId,
  );
}

export function normalizeSubLocationForLocation(
  project: ProjectRoot,
  subLocationId: string | null | undefined,
  locationId: string,
): string | null {
  return isSubLocationInLocation(project, subLocationId, locationId) ? (subLocationId ?? null) : null;
}

export function getSubLocationOptions(project: ProjectRoot, locationId: string): SubLocationOption[] {
  return [
    { id: null, name: 'No folder' },
    ...getSubLocationsForLocation(project, locationId).map((subLocation) => ({
      id: subLocation.id,
      name: subLocation.name,
    })),
  ];
}
