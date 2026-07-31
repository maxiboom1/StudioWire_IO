import { findProjectItemNameConflict, formatProjectItemNameConflict } from '../../domain/projectItemNames';
import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import type { Device, PortGroup, ProjectRoot } from '../../domain/types';
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
  colorOverride: string | null;
}

export function createDeviceInspectorForm(device: Device, portGroups: PortGroup[]): DeviceInspectorForm {
  return {
    name: device.name,
    code: device.code ?? '',
    model: device.model ?? '',
    notes: device.notes,
    locationId: device.locationId,
    rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
    ioGroups: portGroups.map((group) => ({
      id: group.id,
      name: group.name,
      portLabelPattern: group.portLabelPattern,
      colorOverride: group.colorOverride,
    })),
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
    return 'Every I/O interface needs a label pattern.';
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
        colorOverride: edit?.colorOverride ?? null,
      };
    }),
    newPortGroups: [],
    portGroupOrder: portGroups.map((group) => ({ kind: 'existing', id: group.id })),
  };
}
