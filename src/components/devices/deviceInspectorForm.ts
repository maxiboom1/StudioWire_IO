import { findProjectItemNameConflict, formatProjectItemNameConflict } from '../../domain/projectItemNames';
import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import { getDevicePortLabel } from '../../domain/devicePortLabels';
import { formatPortLabel } from '../../domain/portLabels';
import type { Device, DevicePortLabelMode, Port, PortGroup, ProjectRoot } from '../../domain/types';
import type { EditDeviceInput } from '../../state/projectTypes';
import { normalizeDeviceToken } from './addDeviceDraft';

export interface DeviceInspectorForm {
  name: string;
  code: string;
  model: string;
  notes: string;
  locationId: string;
  rackSizeRu: string;
  ioGroups: DeviceInspectorPortGroupForm[];
}

export interface DeviceInspectorPortGroupForm {
  id: string;
  name: string;
  portLabelPattern: string;
  devicePortLabelPattern: string;
  devicePortLabelMode: DevicePortLabelMode;
  devicePortLabels: Array<{ portId: string; index: number; label: string }>;
  colorOverride: string | null;
}

export function resolveInspectorDevicePortLabels(
  group: DeviceInspectorPortGroupForm,
  deviceLabelPrefix: string,
): DeviceInspectorPortGroupForm['devicePortLabels'] {
  const pattern = group.devicePortLabelPattern.trim() || group.portLabelPattern;
  return group.devicePortLabels.map((item) => ({
    ...item,
    label: formatPortLabel(pattern, deviceLabelPrefix, item.index, group.name),
  }));
}

export function createDeviceInspectorForm(
  device: Device,
  portGroups: PortGroup[],
  ports: Port[],
): DeviceInspectorForm {
  return {
    name: device.name,
    code: device.code ?? '',
    model: device.model ?? '',
    notes: device.notes,
    locationId: device.locationId,
    rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
    ioGroups: portGroups.map((group) => {
      const groupPorts = ports
        .filter((port) => port.portGroupId === group.id)
        .sort((left, right) => left.index - right.index);
      return {
        id: group.id,
        name: group.name,
        portLabelPattern: group.portLabelPattern,
        devicePortLabelPattern: group.devicePortLabelPattern ?? '',
        devicePortLabelMode: group.devicePortLabelMode,
        devicePortLabels: groupPorts.map((port) => ({
          portId: port.id,
          index: port.index,
          label: getDevicePortLabel(device, group, port),
        })),
        colorOverride: group.colorOverride,
      };
    }),
  };
}

export function getDeviceInspectorError(
  project: ProjectRoot,
  device: Device,
  form: DeviceInspectorForm,
): string | null {
  if (!form.name.trim()) {
    return 'Device Name is required.';
  }

  const conflict = findProjectItemNameConflict(project, form.name, {
    id: device.id,
    type: 'device',
  });

  if (conflict) {
    return formatProjectItemNameConflict(conflict);
  }

  if (form.rackSizeRu && (!Number.isSafeInteger(Number(form.rackSizeRu)) || Number(form.rackSizeRu) <= 0)) {
    return 'Mount height must be a positive integer.';
  }

  if (form.ioGroups.some((group) => !group.name.trim())) {
    return 'Every I/O interface needs a name.';
  }

  if (form.ioGroups.some((group) => !group.portLabelPattern.trim())) {
    return 'Every I/O interface needs a Cable Label Pattern.';
  }

  if (
    form.ioGroups.some(
      (group) =>
        group.devicePortLabelMode === 'manual' && group.devicePortLabels.some((item) => !item.label.trim()),
    )
  ) {
    return 'Manual Device Port Labels cannot be empty.';
  }

  return null;
}

export function createInspectorEditInput(
  project: ProjectRoot,
  device: Device,
  form: DeviceInspectorForm,
  portGroups: PortGroup[],
  effectiveLocationId: string,
): EditDeviceInput {
  const normalizedCode = normalizeDeviceToken(form.code || form.name);
  const locationId = device.mountType === 'rack' ? device.locationId : form.locationId;

  return {
    deviceId: device.id,
    deviceUpdates: {
      name: form.name.trim(),
      code: normalizedCode,
      manufacturer: device.manufacturer ?? '',
      model: form.model,
      categoryId: device.categoryId,
      locationId,
      subLocationId: normalizeSubLocationForLocation(project, device.subLocationId, effectiveLocationId),
      role: '',
      labelPrefix: normalizeDeviceToken(normalizedCode || form.name),
      notes: form.notes,
      rackSizeRu: form.rackSizeRu ? Number(form.rackSizeRu) : null,
    },
    existingPortGroups: portGroups.map((group) => {
      const edit = form.ioGroups.find((candidate) => candidate.id === group.id);

      return {
        id: group.id,
        name: edit?.name ?? group.name,
        portLabelPattern: edit?.portLabelPattern ?? group.portLabelPattern,
        devicePortLabelPattern: edit ? edit.devicePortLabelPattern.trim() || null : undefined,
        devicePortLabels:
          edit?.devicePortLabelMode === 'manual'
            ? edit.devicePortLabels.map((item) => ({
                portId: item.portId,
                label: item.label.trim(),
              }))
            : null,
        colorOverride: edit?.colorOverride ?? null,
      };
    }),
    newPortGroups: [],
    portGroupOrder: portGroups.map((group) => ({ kind: 'existing', id: group.id })),
  };
}
