import { allocateCableRange, formatCableNumber, previewCableRange } from '../../domain/cableNumbers';
import { getConnectorsForCategory } from '../../domain/connectorCompatibility';
import type { Device, PortGroup, ProjectRoot } from '../../domain/types';
import type { EditDeviceInput } from '../../state/projectContextTypes';
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
      ...groupToForm(group),
      id: group.id,
      localId: group.id,
    }));
}

export function updateExistingPortGroupForms(
  groups: ExistingPortGroupForm[],
  id: string,
  updates: Pick<Partial<ExistingPortGroupForm>, 'name' | 'portLabelPattern'>,
): ExistingPortGroupForm[] {
  return groups.map((group) =>
    group.id === id
      ? {
          ...group,
          ...(updates.name === undefined ? {} : { name: updates.name }),
          ...(updates.portLabelPattern === undefined
            ? {}
            : { portLabelPattern: updates.portLabelPattern }),
        }
      : group,
  );
}

export function addNewEditPortGroup(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  device: DeviceDraft,
  makeLocalId: AddDeviceLocalIdFactory,
): DevicePortGroupForm[] {
  return addPortGroupDraft(project, groups, device, makeLocalId);
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

  if (!device.categoryId) {
    errors.push('Device category is required.');
  }

  if (!project.locations.some((location) => location.id === device.locationId)) {
    errors.push('Device location is required.');
  }

  if (!normalizeDeviceToken(device.labelPrefix || device.code || device.name)) {
    errors.push('A label prefix, device code, or device name is required for generated port labels.');
  }

  for (const group of existingGroups) {
    if (!group.name.trim()) {
      errors.push('Existing interface name is required.');
    }

    if (!group.portLabelPattern.trim()) {
      errors.push(`${group.name || 'Existing interface'} label pattern is required.`);
    }
  }

  for (const group of newGroups) {
    if (!group.name.trim()) {
      errors.push('New interface name is required.');
    }

    if (!Number.isSafeInteger(group.count) || group.count <= 0) {
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

    if (group.createPlannedCables) {
      if (!group.firstCableNumber || group.firstCableNumber < 1) {
        errors.push(`${group.name || 'New interface'} needs a positive first cable number.`);
        continue;
      }

      const preview = previewCableRange(
        previewProject,
        group.cablePrefix,
        group.firstCableNumber,
        group.count,
      );

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
          count: group.count,
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
): EditDeviceInput {
  const effectiveLabelPrefix = normalizeDeviceToken(device.labelPrefix || device.code || device.name);

  return {
    deviceId: device.id ?? '',
    deviceUpdates: {
      name: device.name.trim(),
      code: normalizeDeviceToken(device.code || effectiveLabelPrefix),
      manufacturer: device.manufacturer,
      model: device.model,
      categoryId: device.categoryId,
      locationId: device.locationId,
      subLocationId: device.subLocationId,
      role: device.role,
      labelPrefix: effectiveLabelPrefix,
      notes: device.notes,
      rackSizeRu: device.rackSizeRu,
    },
    existingPortGroups: existingGroups.map((group) => ({
      id: group.id,
      name: group.name.trim(),
      portLabelPattern: group.portLabelPattern,
    })),
    newPortGroups: newGroups.map(({ localId: _localId, ...group }) => ({
      ...group,
      name: group.name.trim(),
      firstCableNumber: group.createPlannedCables ? group.firstCableNumber : null,
    })),
  };
}

function groupToForm(group: PortGroup): Omit<ExistingPortGroupForm, 'id' | 'localId'> {
  return {
    name: group.name,
    direction: group.direction,
    categoryId: group.categoryId,
    connectorTypeId: group.connectorTypeId,
    count: group.count,
    portLabelPattern: group.portLabelPattern,
    cablePrefix: group.cablePrefix,
    firstCableNumber: group.firstCableNumber,
    createPlannedCables: group.createPlannedCables,
    colorOverride: group.colorOverride,
  };
}
