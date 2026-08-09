import { formatPortLabel } from './portLabels';
import type { Device, Port, PortGroup } from './types';

export function getDevicePortLabel(device: Device, group: PortGroup, port: Port): string {
  if (group.devicePortLabelMode === 'manual' && port.devicePortLabelOverride !== null) {
    return port.devicePortLabelOverride;
  }
  if (group.devicePortLabelPattern === null) return port.label;
  return formatPortLabel(group.devicePortLabelPattern, device.labelPrefix, port.index, group.name);
}

export function materializeDevicePortLabels(
  device: Device,
  group: PortGroup,
  ports: readonly Port[],
  editedPortId: string,
  editedLabel: string,
): { group: PortGroup; ports: Port[] } {
  const label = editedLabel.trim();
  return {
    group: { ...group, devicePortLabelMode: 'manual' },
    ports: ports.map((port) => ({
      ...port,
      devicePortLabelOverride: port.id === editedPortId ? label : getDevicePortLabel(device, group, port),
    })),
  };
}

export function resetDevicePortLabels(group: PortGroup, ports: readonly Port[]) {
  return {
    group: { ...group, devicePortLabelMode: 'pattern' as const },
    ports: ports.map((port) => ({ ...port, devicePortLabelOverride: null })),
  };
}

export function getManualDevicePortLabels(group: PortGroup, ports: readonly Port[]): string[] | null {
  if (group.devicePortLabelMode !== 'manual') return null;
  return [...ports]
    .sort((left, right) => left.index - right.index)
    .map((port) => port.devicePortLabelOverride ?? '');
}
