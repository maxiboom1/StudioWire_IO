import { cableReferencesPort } from './connections';
import { arePortConnectorsCompatible, isConnectorAssignedToCategory } from './connectorCompatibility';
import { makeIndexedId } from './id';
import { formatPortLabel } from './portLabels';
import { findProjectItemNameConflict, formatProjectItemNameConflict } from './projectItemNames';
import { validateRackPlacement } from './rackPlacement';
import type { Cable, Device, Endpoint, Port, PortGroup, ProjectRoot } from './types';
import type { TerminalBlockEditInput } from '../state/projectTypes';

export type EditTerminalBlockResult = { ok: true; project: ProjectRoot } | { ok: false; error: string };

export function editTerminalBlockInProject(
  project: ProjectRoot,
  input: TerminalBlockEditInput,
  timestamp: string,
): EditTerminalBlockResult {
  const device = project.devices.find((candidate) => candidate.id === input.deviceId);

  if (!device || device.kind !== 'terminal_block') {
    return { ok: false, error: 'TB edit blocked: selected terminal block no longer exists.' };
  }

  if (!input.name.trim()) {
    return { ok: false, error: 'TB edit blocked: name is required.' };
  }

  const nameConflict = findProjectItemNameConflict(project, input.name, {
    id: device.id,
    type: 'terminal block',
  });

  if (nameConflict) {
    return { ok: false, error: `TB edit blocked: ${formatProjectItemNameConflict(nameConflict)}` };
  }

  if (!Number.isSafeInteger(input.count) || input.count <= 0) {
    return { ok: false, error: 'TB edit blocked: connector count must be positive.' };
  }

  const category = project.settings.categories.find((candidate) => candidate.id === input.categoryId);

  if (!category) {
    return { ok: false, error: 'TB edit blocked: select a valid category.' };
  }

  if (
    !project.settings.connectorTypes.some((candidate) => candidate.id === input.connectorTypeId) ||
    !isConnectorAssignedToCategory(project.settings, input.categoryId, input.connectorTypeId)
  ) {
    return { ok: false, error: 'TB edit blocked: select a connector assigned to the category.' };
  }

  const rack = project.racks.find((candidate) => candidate.id === input.rackId);

  if (!rack) {
    return { ok: false, error: 'TB edit blocked: select a valid rack.' };
  }

  const nextDevice: Device = {
    ...device,
    name: input.name.trim(),
    categoryId: input.categoryId,
    locationId: rack.locationId,
    labelPrefix: normalizeTerminalBlockPrefix(input.labelPrefix || input.name),
    rackId: rack.id,
    rackSizeRu: 1,
    rackBottomRu: input.rackBottomRu,
    notes: input.notes.trim(),
    updatedAt: timestamp,
  };
  const placementProject = {
    ...project,
    devices: project.devices.map((candidate) => (candidate.id === device.id ? nextDevice : candidate)),
  };
  const placement = validateRackPlacement(placementProject, {
    deviceId: device.id,
    targetRackId: rack.id,
    targetBottomRu: input.rackBottomRu,
  });

  if (!placement.ok) {
    return { ok: false, error: `TB edit blocked: ${placement.message}` };
  }

  const deviceGroups = project.portGroups.filter((group) => group.deviceId === device.id);
  const rearGroup = deviceGroups.find((group) => group.direction === 'rear');
  const frontGroup = deviceGroups.find((group) => group.direction === 'front');

  if (!rearGroup || !frontGroup) {
    return { ok: false, error: 'TB edit blocked: rear or front interface is missing.' };
  }

  const removedPorts = project.ports.filter(
    (port) => port.deviceId === device.id && port.index > input.count,
  );

  if (removedPorts.some((port) => project.cables.some((cable) => cableReferencesPort(cable, port.id)))) {
    return {
      ok: false,
      error: 'TB edit blocked: disconnect ports above the new connector count first.',
    };
  }

  const cablePrefix = category.defaultCablePrefix;
  const nextGroups = project.portGroups.map((group) => {
    if (group.id !== rearGroup.id && group.id !== frontGroup.id) {
      return group;
    }

    return {
      ...group,
      categoryId: input.categoryId,
      connectorTypeId: input.connectorTypeId,
      count: input.count,
      cablePrefix,
      firstCableNumber: null,
      lastCableNumber: null,
      numberingRangeId: null,
      createPlannedCables: false,
      locked: true,
    };
  });
  const nextGroupsById = new Map(nextGroups.map((group) => [group.id, group] as const));
  const keptPorts = project.ports
    .filter((port) => port.deviceId !== device.id || port.index <= input.count)
    .map((port) => {
      if (port.deviceId !== device.id) {
        return port;
      }

      const group = nextGroupsById.get(port.portGroupId);

      return group ? updateTerminalBlockPort(port, group, nextDevice) : port;
    });
  const existingPortKeys = new Set(
    keptPorts
      .filter((port) => port.deviceId === device.id)
      .map((port) => `${port.portGroupId}:${port.index}`),
  );
  const appendedPorts = [rearGroup.id, frontGroup.id].flatMap((groupId) => {
    const group = nextGroupsById.get(groupId);

    if (!group) {
      return [];
    }

    return Array.from({ length: input.count }, (_, offset) => offset + 1)
      .filter((index) => !existingPortKeys.has(`${group.id}:${index}`))
      .map((index) => createTerminalBlockPort(group, nextDevice, index));
  });
  const nextPorts = [...keptPorts, ...appendedPorts];
  const nextPortsById = new Map(nextPorts.map((port) => [port.id, port] as const));
  const compatibilityError = findConnectionCompatibilityError(project, device.id, nextPortsById);

  if (compatibilityError) {
    return { ok: false, error: `TB edit blocked: ${compatibilityError}` };
  }

  const labelsById = new Map(nextPorts.map((port) => [port.id, port.label] as const));

  return {
    ok: true,
    project: {
      ...project,
      devices: project.devices.map((candidate) => (candidate.id === device.id ? nextDevice : candidate)),
      portGroups: nextGroups,
      ports: nextPorts,
      cables: project.cables.map((cable) => relabelCable(cable, labelsById)),
    },
  };
}

function updateTerminalBlockPort(port: Port, group: PortGroup, device: Device): Port {
  return {
    ...port,
    name: `${group.name} ${port.index}`,
    label: formatPortLabel(group.portLabelPattern, device.labelPrefix, port.index, group.name),
    direction: group.direction,
    categoryId: group.categoryId,
    connectorTypeId: group.connectorTypeId,
    plannedCableId: null,
  };
}

function createTerminalBlockPort(group: PortGroup, device: Device, index: number): Port {
  return updateTerminalBlockPort(
    {
      id: makeIndexedId(`${group.id}-port`, index),
      deviceId: device.id,
      portGroupId: group.id,
      index,
      name: '',
      label: '',
      direction: group.direction,
      categoryId: group.categoryId,
      connectorTypeId: group.connectorTypeId,
      plannedCableId: null,
      notes: '',
    },
    group,
    device,
  );
}

function findConnectionCompatibilityError(
  project: ProjectRoot,
  deviceId: string,
  nextPortsById: ReadonlyMap<string, Port>,
): string | null {
  const currentPortIds = new Set(
    project.ports.filter((port) => port.deviceId === deviceId).map((port) => port.id),
  );

  for (const cable of project.cables) {
    const endpointIds = [cable.sideAEndpoint.id, cable.sideBEndpoint.id].filter((id): id is string =>
      Boolean(id),
    );
    const terminalBlockPortId = endpointIds.find((id) => currentPortIds.has(id));
    const otherPortId = endpointIds.find((id) => id !== terminalBlockPortId);

    if (!terminalBlockPortId || !otherPortId) {
      continue;
    }

    const terminalBlockPort = nextPortsById.get(terminalBlockPortId);
    const otherPort = nextPortsById.get(otherPortId) ?? project.ports.find((port) => port.id === otherPortId);

    if (!terminalBlockPort || !otherPort) {
      continue;
    }

    const compatibility = arePortConnectorsCompatible(project, terminalBlockPort, otherPort);

    if (!compatibility.ok) {
      return `existing connection ${cable.number} would be incompatible.`;
    }
  }

  return null;
}

function relabelCable(cable: Cable, labelsById: ReadonlyMap<string, string>): Cable {
  const sideAEndpoint = relabelEndpoint(cable.sideAEndpoint, labelsById);
  const sideBEndpoint = relabelEndpoint(cable.sideBEndpoint, labelsById);

  if (sideAEndpoint === cable.sideAEndpoint && sideBEndpoint === cable.sideBEndpoint) {
    return cable;
  }

  return {
    ...cable,
    sideAEndpoint,
    sideBEndpoint,
    labelTop:
      sideAEndpoint.type === 'device_port' || sideAEndpoint.type === 'tb_port'
        ? sideAEndpoint.label
        : cable.labelTop,
    labelMiddle: cable.number,
    labelBottom:
      sideBEndpoint.type === 'device_port' || sideBEndpoint.type === 'tb_port'
        ? sideBEndpoint.label
        : cable.labelBottom,
  };
}

function relabelEndpoint(endpoint: Endpoint, labelsById: ReadonlyMap<string, string>): Endpoint {
  if ((endpoint.type !== 'device_port' && endpoint.type !== 'tb_port') || !endpoint.id) {
    return endpoint;
  }

  const label = labelsById.get(endpoint.id);

  return label && label !== endpoint.label ? { ...endpoint, label } : endpoint;
}

export function normalizeTerminalBlockPrefix(value: string): string {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^A-Z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'TB'
  );
}
