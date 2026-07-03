import type { Device, ProjectRoot } from '../../domain/types';
import type { EditDeviceInput } from '../../state/projectTypes';
import { normalizeDeviceToken } from './addDeviceDraft';

export interface DeviceMetadataEdit {
  name?: string;
  code?: string;
  model?: string;
  locationId?: string;
  subLocationId?: string | null;
  rackSizeRu?: number | null;
  notes?: string;
}

export function createDeviceMetadataEditInput(
  project: ProjectRoot,
  device: Device,
  updates: DeviceMetadataEdit,
): EditDeviceInput {
  const nextName = (updates.name ?? device.name).trim();
  const nextCode = normalizeDeviceToken(updates.code ?? device.code ?? '');
  const effectiveLabelPrefix = normalizeDeviceToken(nextCode || nextName);

  return {
    deviceId: device.id,
    deviceUpdates: {
      name: nextName,
      code: nextCode,
      manufacturer: device.manufacturer ?? '',
      model: updates.model ?? device.model ?? '',
      categoryId: device.categoryId,
      locationId: updates.locationId ?? device.locationId,
      subLocationId: updates.subLocationId === undefined ? device.subLocationId : updates.subLocationId,
      role: device.role ?? '',
      labelPrefix: effectiveLabelPrefix,
      notes: updates.notes ?? device.notes,
      rackSizeRu: updates.rackSizeRu === undefined ? device.rackSizeRu : updates.rackSizeRu,
    },
    existingPortGroups: project.portGroups
      .filter((group) => group.deviceId === device.id)
      .map((group) => ({
        id: group.id,
        name: group.name,
        portLabelPattern: group.portLabelPattern,
        colorOverride: group.colorOverride,
      })),
    newPortGroups: [],
  };
}
