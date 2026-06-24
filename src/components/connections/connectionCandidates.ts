import { createConnectionTargetLookup, getConnectionTargetStatus } from '../../domain/connections';
import type { Device, Location, Port, ProjectRoot, Rack } from '../../domain/types';

export interface PortCandidate {
  location: Location | null;
  device: Device;
  port: Port;
  searchText: string;
}

export interface LocationCandidateGroup {
  key: string;
  name: string;
  devices: Array<{ device: Device; ports: PortCandidate[] }>;
}

export function buildConnectionCandidates(project: ProjectRoot, originPortId: string): PortCandidate[] {
  const lookup = createConnectionTargetLookup(project);
  const devicesById = lookup.devicesById;
  const racksById = new Map(project.racks.map((rack) => [rack.id, rack]));
  const locationsById = new Map(project.locations.map((location) => [location.id, location]));
  const originPort = lookup.portsById.get(originPortId);

  if (!originPort) {
    return [];
  }

  return project.ports
    .filter((port) => isPossibleCandidate(originPort, port))
    .filter(
      (port) =>
        getConnectionTargetStatus(project, { fromPortId: originPortId, toPortId: port.id }, lookup).ok,
    )
    .map((port) => {
      const device = devicesById.get(port.deviceId);

      if (!device) {
        return null;
      }

      const locationId = resolveDeviceLocationId(device, racksById);
      const location = locationId ? (locationsById.get(locationId) ?? null) : null;

      return {
        location,
        device,
        port,
        searchText:
          `${location?.name ?? ''} ${device.name} ${device.labelPrefix} ${port.label} ${port.direction}`.toLowerCase(),
      };
    })
    .filter((candidate): candidate is PortCandidate => candidate !== null)
    .sort((left, right) => {
      const locationSort = (left.location?.name ?? '').localeCompare(right.location?.name ?? '');

      if (locationSort !== 0) {
        return locationSort;
      }

      const deviceSort = left.device.name.localeCompare(right.device.name);

      if (deviceSort !== 0) {
        return deviceSort;
      }

      return left.port.index - right.port.index;
    });
}

export function groupConnectionCandidates(candidates: PortCandidate[]): LocationCandidateGroup[] {
  const locations: LocationCandidateGroup[] = [];

  for (const candidate of candidates) {
    const locationKey = candidate.location?.id ?? 'unassigned';
    let locationGroup = locations.find((group) => group.key === locationKey);

    if (!locationGroup) {
      locationGroup = {
        key: locationKey,
        name: candidate.location?.name ?? 'Unassigned',
        devices: [],
      };
      locations.push(locationGroup);
    }

    let deviceGroup = locationGroup.devices.find((group) => group.device.id === candidate.device.id);

    if (!deviceGroup) {
      deviceGroup = { device: candidate.device, ports: [] };
      locationGroup.devices.push(deviceGroup);
    }

    deviceGroup.ports.push(candidate);
  }

  return locations;
}

export function countCandidatePorts(devices: Array<{ device: Device; ports: PortCandidate[] }>) {
  return devices.reduce((total, device) => total + device.ports.length, 0);
}

function isPossibleCandidate(originPort: Port, candidatePort: Port): boolean {
  return candidatePort.id !== originPort.id && candidatePort.categoryId === originPort.categoryId;
}

function resolveDeviceLocationId(device: Device, racksById: ReadonlyMap<string, Rack>) {
  return device.locationId ?? (device.rackId ? (racksById.get(device.rackId)?.locationId ?? null) : null);
}
