import { allocateCableRange, formatCableNumber, previewCableRange } from '../../domain/cableNumbers';
import { isHexColor } from '../../domain/colors';
import { findProjectItemNameConflict, formatProjectItemNameConflict } from '../../domain/projectItemNames';
import { getConnectorsForCategory } from '../../domain/connectorCompatibility';
import type { Device, PortGroup, ProjectRoot } from '../../domain/types';
import type { EditDeviceInput } from '../../state/projectContextTypes';
import type { EditDevicePortGroupOrderItem } from '../../state/projectTypes';
import type { DeviceDraft } from '../../state/projectTypes';
import {
  addPortGroupDraft,
  normalizeDeviceToken,
  rebalancePlannedCableRanges,
  removePortGroupDraft,
  togglePortGroupPlannedCables,
  updatePortGroupCategory,
  updatePortGroupDrafts,
  type AddDeviceValidation,
  type DevicePortGroupForm,
} from './addDeviceDraft';
import type { AddDeviceLocalIdFactory } from './addDeviceLocalIds';

export interface ExistingPortGroupForm extends DevicePortGroupForm {
  id: string;
  existingDevicePortLabels: Array<{ portId: string; label: string }> | null;
}

export interface EditDeviceValidation extends AddDeviceValidation {}

export function createEditDeviceDraft(device: Device): DeviceDraft {
  return {
    id: device.id,
    name: device.name,
    code: device.kind === 'terminal_block' ? '' : (device.code ?? ''),
    manufacturer: device.kind === 'terminal_block' ? '' : (device.manufacturer ?? ''),
    model: device.kind === 'terminal_block' ? '' : (device.model ?? ''),
    categoryId: device.categoryId,
    locationId: device.locationId,
    subLocationId: device.subLocationId,
    role: device.kind === 'terminal_block' ? '' : (device.role ?? ''),
    labelPrefix: device.labelPrefix,
    mountType: device.mountType,
    rackId: device.rackId,
    rackSizeRu: device.rackSizeRu,
    rackBottomRu: device.rackBottomRu,
    notes: device.notes,
  };
}

export function createExistingPortGroupForms(
  project: ProjectRoot,
  deviceId: string,
): ExistingPortGroupForm[] {
  return project.portGroups
    .filter((group) => group.deviceId === deviceId)
    .map((group) => ({
      ...groupToForm(project, group),
      id: group.id,
      localId: group.id,
    }));
}

export function updateExistingPortGroupForms(
  groups: ExistingPortGroupForm[],
  id: string,
  updates: Pick<
    Partial<ExistingPortGroupForm>,
    'name' | 'portLabelPattern' | 'devicePortLabelPattern' | 'colorOverride'
  >,
): ExistingPortGroupForm[] {
  return groups.map((group) =>
    group.id === id
      ? {
          ...group,
          ...(updates.name === undefined ? {} : { name: updates.name }),
          ...(updates.portLabelPattern === undefined ? {} : { portLabelPattern: updates.portLabelPattern }),
          ...(updates.devicePortLabelPattern === undefined
            ? {}
            : { devicePortLabelPattern: updates.devicePortLabelPattern }),
          ...(updates.colorOverride === undefined ? {} : { colorOverride: updates.colorOverride }),
        }
      : group,
  );
}

export function addNewEditPortGroup(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  device: DeviceDraft,
  makeLocalId: AddDeviceLocalIdFactory,
  localId?: string,
): DevicePortGroupForm[] {
  return addPortGroupDraft(project, groups, device, makeLocalId, localId);
}

export function removeNewEditPortGroup(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  localId: string,
): DevicePortGroupForm[] {
  return rebalancePlannedCableRanges(project, removePortGroupDraft(project, groups, localId));
}

export function updateNewEditPortGroup(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  localId: string,
  updates: Partial<DevicePortGroupForm>,
): DevicePortGroupForm[] {
  return updatePortGroupDrafts(project, groups, localId, updates);
}

export function updateNewEditPortGroupCategory(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  localId: string,
  categoryId: string,
): DevicePortGroupForm[] {
  return updatePortGroupCategory(project, groups, localId, categoryId);
}

export function toggleNewEditPortGroupPlannedCables(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  localId: string,
  checked: boolean,
): DevicePortGroupForm[] {
  return togglePortGroupPlannedCables(project, groups, localId, checked);
}

export function getEditDeviceValidation(
  project: ProjectRoot,
  device: DeviceDraft,
  existingGroups: ExistingPortGroupForm[],
  newGroups: DevicePortGroupForm[],
): EditDeviceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let previewProject = project;

  if (!device.name.trim()) {
    errors.push('Device name is required.');
  }

  const nameConflict = findProjectItemNameConflict(project, device.name, {
    id: device.id ?? '',
    type: 'device',
  });

  if (nameConflict) {
    errors.push(formatProjectItemNameConflict(nameConflict));
  }

  if (!device.categoryId) {
    errors.push('Device category is required.');
  }

  if (!project.locations.some((location) => location.id === device.locationId)) {
    errors.push('Device location is required.');
  }

  for (const group of existingGroups) {
    if (!group.name.trim()) {
      errors.push('Existing I/O Name is required.');
    }

    if (!group.portLabelPattern.trim()) {
      errors.push(`${group.name || 'Existing interface'} label pattern is required.`);
    }

    if (
      group.colorOverride !== null &&
      group.colorOverride !== undefined &&
      !isHexColor(group.colorOverride)
    ) {
      errors.push(`${group.name || 'Existing interface'} color override must use #RRGGBB.`);
    }
  }

  for (const group of newGroups) {
    const count = Number(group.count);
    const hasValidCount = Number.isSafeInteger(count) && count > 0;

    if (!group.name.trim()) {
      errors.push('New I/O Name is required.');
    }

    if (!hasValidCount) {
      errors.push(`${group.name || 'New interface'} count must be positive.`);
    }

    if (!project.settings.cablePrefixes.some((prefix) => prefix.prefix === group.cablePrefix)) {
      errors.push(`${group.name || 'New interface'} uses an unknown cable prefix.`);
    }

    if (!project.settings.connectorTypes.some((connector) => connector.id === group.connectorTypeId)) {
      errors.push(`${group.name || 'New interface'} uses an unknown connector.`);
    } else if (
      !getConnectorsForCategory(project.settings, group.categoryId).some(
        (connector) => connector.id === group.connectorTypeId,
      )
    ) {
      errors.push(`${group.name || 'New interface'} connector must be assigned to the selected category.`);
    }

    if (
      group.colorOverride !== null &&
      group.colorOverride !== undefined &&
      !isHexColor(group.colorOverride)
    ) {
      errors.push(`${group.name || 'New interface'} color override must use #RRGGBB.`);
    }

    if (group.createPlannedCables) {
      if (!group.firstCableNumber || group.firstCableNumber < 1) {
        errors.push(`${group.name || 'New interface'} needs a positive first cable number.`);
        continue;
      }

      if (!hasValidCount) {
        continue;
      }

      const preview = previewCableRange(previewProject, group.cablePrefix, group.firstCableNumber, count);

      for (const error of preview.errors) {
        errors.push(`${group.name}: ${error.message}`);
      }

      if (preview.reservedGap) {
        warnings.push(
          `Numbers ${formatCableNumber(preview.reservedGap.prefix, preview.reservedGap.from)} to ${formatCableNumber(
            preview.reservedGap.prefix,
            preview.reservedGap.to,
          )} will be reserved and cannot be used later.`,
        );
      }

      if (preview.errors.length === 0) {
        previewProject = allocateCableRange(previewProject, {
          prefix: group.cablePrefix,
          firstCableNumber: group.firstCableNumber,
          count,
          ownerType: 'preview',
          ownerId: group.localId,
          reason: 'Preview edit device allocation',
        }).project;
      }
    }
  }

  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}

export function createEditDeviceCommandInput(
  device: DeviceDraft,
  existingGroups: ExistingPortGroupForm[],
  newGroups: DevicePortGroupForm[],
  portGroupOrder?: EditDevicePortGroupOrderItem[],
): EditDeviceInput {
  const deviceSubLabel = normalizeDeviceToken(device.code || device.name);
  const effectiveLabelPrefix = normalizeDeviceToken(device.code || device.name);

  return {
    deviceId: device.id ?? '',
    deviceUpdates: {
      name: device.name.trim(),
      code: deviceSubLabel,
      manufacturer: device.manufacturer,
      model: device.model,
      categoryId: device.categoryId,
      locationId: device.locationId,
      subLocationId: device.subLocationId,
      role: '',
      labelPrefix: effectiveLabelPrefix,
      notes: '',
      rackSizeRu: device.rackSizeRu,
    },
    existingPortGroups: existingGroups.map((group) => ({
      id: group.id,
      name: group.name.trim(),
      portLabelPattern: group.portLabelPattern,
      devicePortLabelPattern: group.devicePortLabelPattern?.trim() || null,
      devicePortLabels: group.existingDevicePortLabels,
      colorOverride: group.colorOverride,
    })),
    newPortGroups: newGroups.map((group) => ({
      ...group,
      count: Number(group.count),
      name: group.name.trim(),
      firstCableNumber: group.createPlannedCables ? group.firstCableNumber : null,
    })),
    portGroupOrder,
  };
}

function groupToForm(project: ProjectRoot, group: PortGroup): Omit<ExistingPortGroupForm, 'id' | 'localId'> {
  return {
    name: group.name,
    direction: group.direction,
    categoryId: group.categoryId,
    connectorTypeId: group.connectorTypeId,
    count: group.count,
    portLabelPattern: group.portLabelPattern,
    devicePortLabelPattern: group.devicePortLabelPattern,
    devicePortLabels: null,
    existingDevicePortLabels:
      group.devicePortLabelMode === 'manual'
        ? project.ports
            .filter((port) => port.portGroupId === group.id)
            .sort((left, right) => left.index - right.index)
            .map((port) => ({ portId: port.id, label: port.devicePortLabelOverride ?? port.label }))
        : null,
    cablePrefix: group.cablePrefix,
    firstCableNumber: group.firstCableNumber,
    createPlannedCables: group.createPlannedCables,
    colorOverride: group.colorOverride,
  };
}
