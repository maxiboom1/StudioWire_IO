import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import type { Device, ProjectRoot } from '../../domain/types';
import type { DeviceDraft } from '../../state/projectTypes';
import {
  getDefaultPrefixForCategory,
  rebalancePlannedCableRanges,
  type DevicePortGroupForm,
} from './addDeviceDraft';
import type { AddDeviceLocalIdFactory } from './addDeviceLocalIds';

export interface ClonedAddDeviceDraft {
  device: DeviceDraft;
  portGroups: DevicePortGroupForm[];
}

export function createClonedAddDeviceDraft(
  project: ProjectRoot,
  sourceDevice: Device,
  makeLocalId: AddDeviceLocalIdFactory,
): ClonedAddDeviceDraft {
  const portGroups = project.portGroups
    .filter((group) => group.deviceId === sourceDevice.id)
    .map((group) => ({
      localId: makeLocalId(),
      name: group.name,
      direction: group.direction,
      categoryId: group.categoryId,
      connectorTypeId: group.connectorTypeId,
      count: group.count,
      portLabelPattern: group.portLabelPattern,
      cablePrefix: getDefaultPrefixForCategory(project, group.categoryId),
      firstCableNumber: null,
      createPlannedCables: true,
      colorOverride: group.colorOverride,
    }));

  return {
    device: {
      name: sourceDevice.name,
      code: sourceDevice.code ?? '',
      manufacturer: sourceDevice.manufacturer ?? '',
      model: sourceDevice.model ?? '',
      categoryId: sourceDevice.categoryId,
      locationId: sourceDevice.locationId,
      subLocationId: normalizeSubLocationForLocation(
        project,
        sourceDevice.subLocationId,
        sourceDevice.locationId,
      ),
      role: '',
      labelPrefix: '',
      mountType: 'virtual',
      rackId: null,
      rackSizeRu: sourceDevice.rackSizeRu,
      rackBottomRu: null,
      notes: '',
    },
    portGroups: rebalancePlannedCableRanges(project, portGroups),
  };
}
