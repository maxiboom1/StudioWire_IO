import {
  allocateCableRange,
  formatCableNumber,
  getNextSuggestedForPrefix,
  previewCableRange,
} from '../../domain/cableNumbers';
import {
  getConnectorsForCategory,
  getDefaultConnectorForCategory,
  isConnectorAssignedToCategory,
} from '../../domain/connectorCompatibility';
import type { ProjectRoot } from '../../domain/types';
import type { DeviceDraft, DevicePortGroupDraft } from '../../state/projectTypes';
import type { AddDeviceInput } from '../../state/projectContextTypes';
import type { AddDeviceLocalIdFactory } from './addDeviceLocalIds';

export interface DevicePortGroupForm extends DevicePortGroupDraft {
  localId: string;
}

export interface AddDeviceValidation {
  errors: string[];
  warnings: string[];
}

export function createInitialDeviceDraft(
  project: ProjectRoot,
  initialLocationId: string | null,
): DeviceDraft {
  const firstCategory = project.settings.categories[0];

  return {
    name: '',
    code: '',
    manufacturer: '',
    model: '',
    categoryId: firstCategory?.id ?? '',
    locationId: initialLocationId ?? project.locations[0]?.id ?? '',
    subLocationId: null,
    role: '',
    labelPrefix: '',
    mountType: 'virtual',
    rackId: null,
    rackSizeRu: null,
    rackBottomRu: null,
    notes: '',
  };
}

export function createInitialPortGroups(
  project: ProjectRoot,
  categoryId: string,
  makeLocalId: AddDeviceLocalIdFactory,
): DevicePortGroupForm[] {
  return createQuickPortGroups(project, categoryId, makeLocalId);
}

export function createQuickPortGroups(
  project: ProjectRoot,
  categoryId: string,
  makeLocalId: AddDeviceLocalIdFactory,
): DevicePortGroupForm[] {
  const category = project.settings.categories.find((item) => item.id === categoryId);
  const categoryName = category?.name.toLowerCase() ?? '';
  const defaultPrefix = getDefaultPrefixForCategory(project, categoryId);

  function makeGroup(input: {
    name: string;
    direction: DevicePortGroupDraft['direction'];
    connectorName: string;
    prefix: string;
    pattern: string;
    count?: number;
  }): DevicePortGroupForm {
    return {
      localId: makeLocalId(),
      name: input.name,
      direction: input.direction,
      categoryId,
      connectorTypeId: findConnectorTypeId(project, categoryId, input.connectorName),
      count: input.count ?? 4,
      portLabelPattern: input.pattern,
      cablePrefix: input.prefix,
      firstCableNumber: null,
      createPlannedCables: true,
      colorOverride: null,
    };
  }

  if (categoryName === 'video') {
    return rebalancePlannedCableRanges(project, [
      makeGroup({
        name: 'SDI IN',
        direction: 'input',
        connectorName: 'BNC',
        prefix: 'V',
        pattern: '{DEVICE}-IN-{000}',
      }),
      makeGroup({
        name: 'SDI OUT',
        direction: 'output',
        connectorName: 'BNC',
        prefix: 'V',
        pattern: '{DEVICE}-OUT-{000}',
      }),
    ]);
  }

  if (categoryName === 'audio') {
    return rebalancePlannedCableRanges(project, [
      makeGroup({
        name: 'AUDIO IN',
        direction: 'input',
        connectorName: 'XLR',
        prefix: 'A',
        pattern: '{DEVICE}-AIN-{000}',
      }),
      makeGroup({
        name: 'AUDIO OUT',
        direction: 'output',
        connectorName: 'XLR',
        prefix: 'A',
        pattern: '{DEVICE}-AOUT-{000}',
      }),
    ]);
  }

  if (categoryName === 'network') {
    return rebalancePlannedCableRanges(project, [
      makeGroup({
        name: 'NETWORK',
        direction: 'bidirectional',
        connectorName: 'RJ45',
        prefix: 'N',
        pattern: '{DEVICE}-NET-{000}',
      }),
    ]);
  }

  return rebalancePlannedCableRanges(project, [
    makeGroup({
      name: 'PORTS',
      direction: 'bidirectional',
      connectorName: project.settings.connectorTypes[0]?.name ?? 'Other',
      prefix: defaultPrefix,
      pattern: '{DEVICE}-{000}',
    }),
  ]);
}

export function updatePortGroupDrafts(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  localId: string,
  updates: Partial<DevicePortGroupForm>,
): DevicePortGroupForm[] {
  return rebalancePlannedCableRanges(
    project,
    groups.map((group) => {
      if (group.localId !== localId) {
        return group;
      }

      const updated = { ...group, ...updates };

      return {
        ...updated,
        count: Number(updated.count),
      };
    }),
  );
}

export function updatePortGroupCategory(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  localId: string,
  categoryId: string,
): DevicePortGroupForm[] {
  return updatePortGroupDrafts(project, groups, localId, {
    categoryId,
    connectorTypeId: getDefaultConnectorForCategory(project.settings, categoryId)?.id ?? '',
    cablePrefix: getDefaultPrefixForCategory(project, categoryId),
  });
}

export function togglePortGroupPlannedCables(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  localId: string,
  checked: boolean,
): DevicePortGroupForm[] {
  return rebalancePlannedCableRanges(
    project,
    groups.map((group) =>
      group.localId === localId
        ? {
            ...group,
            createPlannedCables: checked,
            firstCableNumber:
              group.firstCableNumber ??
              project.numberingLedgers.find((ledger) => ledger.prefix === group.cablePrefix)?.nextSuggested ??
              1,
          }
        : group,
    ),
  );
}

export function addPortGroupDraft(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  device: DeviceDraft,
  makeLocalId: AddDeviceLocalIdFactory,
): DevicePortGroupForm[] {
  const prefix = getDefaultPrefixForCategory(project, device.categoryId);

  return rebalancePlannedCableRanges(project, [
    ...groups,
    {
      localId: makeLocalId(),
      name: 'PORTS',
      direction: 'bidirectional',
      categoryId: device.categoryId,
      connectorTypeId: getDefaultConnectorForCategory(project.settings, device.categoryId)?.id ?? '',
      count: 1,
      portLabelPattern: '{DEVICE}-{000}',
      cablePrefix: prefix,
      firstCableNumber: null,
      createPlannedCables: true,
      colorOverride: null,
    },
  ]);
}

export function removePortGroupDraft(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
  localId: string,
): DevicePortGroupForm[] {
  return rebalancePlannedCableRanges(
    project,
    groups.filter((group) => group.localId !== localId),
  );
}

export function rebalancePlannedCableRanges(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
): DevicePortGroupForm[] {
  let previewProject = project;

  return groups.map((group) => {
    const count = Number(group.count);

    if (!group.createPlannedCables) {
      return {
        ...group,
        count,
        firstCableNumber: group.firstCableNumber ?? getNextSuggestedForPrefix(previewProject, group.cablePrefix),
      };
    }

    const nextCableNumber = Number.isSafeInteger(count) && count > 0
      ? getNextSuggestedForPrefix(previewProject, group.cablePrefix, count)
      : getNextSuggestedForPrefix(previewProject, group.cablePrefix);

    if (Number.isSafeInteger(count) && count > 0) {
      const allocation = allocateCableRange(previewProject, {
        prefix: group.cablePrefix,
        firstCableNumber: nextCableNumber,
        count,
        ownerType: 'preview',
        ownerId: group.localId,
        reason: 'Preview device allocation',
      });

      if (allocation.preview.errors.length === 0) {
        previewProject = allocation.project;
      }
    }

    return {
      ...group,
      count,
      firstCableNumber: nextCableNumber,
    };
  });
}

export function findConnectorTypeId(project: ProjectRoot, categoryId: string, name: string): string {
  return (
    getConnectorsForCategory(project.settings, categoryId).find(
      (connectorType) => connectorType.name.toLowerCase() === name.toLowerCase(),
    )?.id ??
    getDefaultConnectorForCategory(project.settings, categoryId)?.id ??
    ''
  );
}

export function getDefaultPrefixForCategory(project: ProjectRoot, categoryId: string): string {
  return (
    project.settings.categories.find((category) => category.id === categoryId)?.defaultCablePrefix ??
    project.settings.cablePrefixes[0]?.prefix ??
    'V'
  );
}

export function normalizeDeviceToken(value: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'DEVICE';
}

export function formatPortGroupRange(group: DevicePortGroupForm): string {
  if (!group.firstCableNumber || !Number.isSafeInteger(group.count) || group.count <= 0) {
    return group.createPlannedCables ? 'Set count' : 'Set first cable number';
  }

  return `${formatCableNumber(group.cablePrefix, group.firstCableNumber)} -> ${formatCableNumber(
    group.cablePrefix,
    group.firstCableNumber + group.count - 1,
  )}`;
}

export function formatPortGroupLastCableNumber(group: DevicePortGroupForm): string {
  if (!group.firstCableNumber || !Number.isSafeInteger(group.count) || group.count <= 0) {
    return '';
  }

  return formatCableNumber(group.cablePrefix, group.firstCableNumber + group.count - 1);
}

export function getAddDeviceValidation(
  project: ProjectRoot,
  device: DeviceDraft,
  portGroups: DevicePortGroupForm[],
): AddDeviceValidation {
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

  if (!normalizeDeviceToken(device.labelPrefix || device.name)) {
    errors.push('A label prefix or device name is required for generated port labels.');
  }

  if (portGroups.length === 0) {
    errors.push('At least one port group is required.');
  }

  for (const group of portGroups) {
    if (!group.name.trim()) {
      errors.push('Port group name is required.');
    }

    if (!Number.isSafeInteger(group.count) || group.count <= 0) {
      errors.push(`${group.name || 'Port group'} count must be positive.`);
    }

    if (!project.settings.cablePrefixes.some((prefix) => prefix.prefix === group.cablePrefix)) {
      errors.push(`${group.name || 'Port group'} uses an unknown cable prefix.`);
    }

    if (!project.settings.connectorTypes.some((connector) => connector.id === group.connectorTypeId)) {
      errors.push(`${group.name || 'Port group'} uses an unknown connector.`);
    } else if (!isConnectorAssignedToCategory(project.settings, group.categoryId, group.connectorTypeId)) {
      errors.push(`${group.name || 'Port group'} connector must be assigned to the selected category.`);
    }

    if (group.createPlannedCables) {
      if (!group.firstCableNumber || group.firstCableNumber < 1) {
        errors.push(`${group.name || 'Port group'} needs a positive first cable number.`);
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
          reason: 'Preview device allocation',
        }).project;
      }
    }
  }

  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}

export function createAddDeviceCommandInput(
  device: DeviceDraft,
  portGroups: DevicePortGroupForm[],
): AddDeviceInput {
  const generatedCode = normalizeDeviceToken(device.labelPrefix || device.name);
  const effectiveLabelPrefix = normalizeDeviceToken(device.labelPrefix || device.name);

  return {
    device: {
      ...device,
      name: device.name.trim(),
      code: generatedCode,
      role: '',
      labelPrefix: effectiveLabelPrefix,
      mountType: 'virtual',
      rackId: null,
      rackSizeRu: null,
      rackBottomRu: null,
      notes: '',
    },
    portGroups: portGroups.map(({ localId: _localId, ...group }) => ({
      ...group,
      firstCableNumber: group.createPlannedCables ? group.firstCableNumber : null,
    })),
  };
}
