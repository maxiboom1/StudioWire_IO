import type { Device, ProjectRoot, Rack, Location } from '../../domain/types';

export const UNASSIGNED_KEY = 'unassigned-devices';

export interface LocationTreeBranchModel {
  location: Location;
  key: string;
  racksKey: string;
  devicesKey: string;
  terminalBlocksKey: string;
  racks: Rack[];
  devices: Device[];
  terminalBlocks: Device[];
  count: number;
}

export interface UnassignedTreeBranchModel {
  key: string;
  devices: Device[];
  count: number;
}

export interface LeftTreeModel {
  locations: LocationTreeBranchModel[];
  unassigned: UnassignedTreeBranchModel;
  isNavigatorEmpty: boolean;
}

export function buildLeftTreeModel(project: ProjectRoot): LeftTreeModel {
  const locationBranches = project.locations.map((location) => {
    const racks = project.racks.filter((rack) => rack.locationId === location.id);
    const devices = project.devices.filter(
      (device) => device.locationId === location.id && device.kind !== 'terminal_block',
    );
    const terminalBlocks = project.devices.filter(
      (device) => device.locationId === location.id && device.kind === 'terminal_block',
    );

    return {
      location,
      key: getLocationKey(location.id),
      racksKey: getLocationFolderKey(location.id, 'racks'),
      devicesKey: getLocationFolderKey(location.id, 'devices'),
      terminalBlocksKey: getLocationFolderKey(location.id, 'terminal-blocks'),
      racks,
      devices,
      terminalBlocks,
      count: racks.length + devices.length + terminalBlocks.length,
    };
  });
  const unassignedDevices = buildUnassignedDeviceList(project);
  const unassigned = {
    key: UNASSIGNED_KEY,
    devices: unassignedDevices,
    count: unassignedDevices.length,
  };

  return {
    locations: locationBranches,
    unassigned,
    isNavigatorEmpty: locationBranches.length === 0 && unassignedDevices.length === 0,
  };
}

export function buildUnassignedDeviceList(project: ProjectRoot): Device[] {
  return project.devices.filter((device) => {
    if (device.kind === 'terminal_block') {
      return false;
    }

    const hasKnownLocation = project.locations.some((location) => location.id === device.locationId);

    return !device.locationId || !hasKnownLocation;
  });
}

export function getLocationKey(locationId: string): string {
  return `location:${locationId}`;
}

export function getLocationFolderKey(
  locationId: string,
  folder: 'racks' | 'devices' | 'terminal-blocks',
): string {
  return `location:${locationId}:${folder}`;
}

export function getDeviceTreeTitle(device: Device): string {
  return device.rackSizeRu && device.rackSizeRu > 0
    ? 'Drag to a visible rack to assign or move'
    : 'Set rack size before assigning to a rack';
}

export function getDeviceTreeMeta(device: Device): string {
  return device.kind === 'terminal_block' ? 'TB' : device.labelPrefix || device.role || 'Device';
}
