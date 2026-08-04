import type { Device, Port, PortDirection, ProjectRoot } from './types';

export interface DevicePortColumns {
  left: Port[];
  right: Port[];
}

export function getOrderedDevicePortColumns(project: ProjectRoot, device: Device): DevicePortColumns {
  const leftDirections: PortDirection[] = device.kind === 'terminal_block' ? ['rear'] : ['input'];
  const rightDirections: PortDirection[] =
    device.kind === 'terminal_block' ? ['front'] : ['output', 'bidirectional'];

  return {
    left: getOrderedPorts(project, device.id, leftDirections),
    right: getOrderedPorts(project, device.id, rightDirections),
  };
}

export function getDeviceViewRowCount(project: ProjectRoot, device: Device): number {
  const columns = getOrderedDevicePortColumns(project, device);
  return Math.max(columns.left.length, columns.right.length, 1);
}

function getOrderedPorts(project: ProjectRoot, deviceId: string, directions: PortDirection[]): Port[] {
  const directionSet = new Set(directions);
  const groups = project.portGroups.filter(
    (group) => group.deviceId === deviceId && directionSet.has(group.direction),
  );
  const portsByGroup = new Map<string, Port[]>();

  for (const port of project.ports) {
    if (port.deviceId !== deviceId) {
      continue;
    }

    const groupPorts = portsByGroup.get(port.portGroupId) ?? [];
    groupPorts.push(port);
    portsByGroup.set(port.portGroupId, groupPorts);
  }

  return groups.flatMap((group) =>
    [...(portsByGroup.get(group.id) ?? [])].sort((left, right) => left.index - right.index),
  );
}
