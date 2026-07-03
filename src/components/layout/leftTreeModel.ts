import type { Device, ProjectRoot, Rack, Location, SubLocation } from '../../domain/types';

export type NavigatorTreeItem =
  | { type: 'rack'; id: string; rack: Rack; label: string; meta: string }
  | { type: 'device'; id: string; device: Device; label: string; meta: string };

export interface SubLocationTreeBranchModel {
  subLocation: SubLocation;
  key: string;
  items: NavigatorTreeItem[];
  count: number;
}

export interface LocationTreeBranchModel {
  location: Location;
  key: string;
  subLocations: SubLocationTreeBranchModel[];
  items: NavigatorTreeItem[];
  count: number;
}

export interface LeftTreeModel {
  locations: LocationTreeBranchModel[];
  isNavigatorEmpty: boolean;
}

export function buildLeftTreeModel(project: ProjectRoot): LeftTreeModel {
  const locationBranches = project.locations.map((location) => {
    const locationRacks = project.racks.filter((rack) => rack.locationId === location.id);
    const locationDevices = project.devices.filter((device) => device.locationId === location.id);
    const subLocations = project.subLocations
      .filter((subLocation) => subLocation.locationId === location.id)
      .map((subLocation) => {
        const items = buildNavigatorItems(
          locationRacks.filter((rack) => rack.subLocationId === subLocation.id),
          locationDevices.filter((device) => device.subLocationId === subLocation.id),
        );

        return {
          subLocation,
          key: getSubLocationKey(location.id, subLocation.id),
          items,
          count: items.length,
        };
      });
    const items = buildNavigatorItems(
      locationRacks.filter((rack) => rack.subLocationId === null),
      locationDevices.filter((device) => device.subLocationId === null),
    );
    const subLocationCount = subLocations.reduce((sum, subLocation) => sum + subLocation.count, 0);

    return {
      location,
      key: getLocationKey(location.id),
      subLocations,
      items,
      count: items.length + subLocationCount,
    };
  });

  return {
    locations: locationBranches,
    isNavigatorEmpty: locationBranches.length === 0,
  };
}

export function getSubLocationKey(locationId: string, subLocationId: string): string {
  return `location:${locationId}:folder:${subLocationId}`;
}

export function getLocationKey(locationId: string): string {
  return `location:${locationId}`;
}

export function getDeviceTreeTitle(device: Device): string {
  return device.rackSizeRu && device.rackSizeRu > 0
    ? 'Drag to a visible rack to assign or move'
    : 'Set rack size before assigning to a rack';
}

export function getDeviceTreeMeta(device: Device): string {
  return device.kind === 'terminal_block' ? 'TB' : device.labelPrefix || device.role || 'Device';
}

export function buildNavigatorItems(racks: Rack[], devices: Device[]): NavigatorTreeItem[] {
  return [
    ...racks.map(
      (rack): NavigatorTreeItem => ({
        type: 'rack',
        id: rack.id,
        rack,
        label: rack.name,
        meta: `${rack.heightRu} RU`,
      }),
    ),
    ...devices.map(
      (device): NavigatorTreeItem => ({
        type: 'device',
        id: device.id,
        device,
        label: device.name,
        meta: getDeviceTreeMeta(device),
      }),
    ),
  ];
}
