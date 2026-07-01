import { allocateCableRange } from '../domain/cableNumbers';
import { getConnectorsForCategory } from '../domain/connectorCompatibility';
import { makeId, makeIndexedId } from '../domain/id';
import { formatPortLabel } from '../domain/portLabels';
import { createLinkedPlannedCablesForPorts } from '../domain/plannedCables';
import type { Cable, Device, Endpoint, Port, PortGroup, ProjectRoot } from '../domain/types';
import type { EditDeviceInput, DevicePortGroupDraft } from './projectTypes';

export function editDeviceInProject(
  project: ProjectRoot,
  input: EditDeviceInput,
  timestamp: string,
): { ok: true; project: ProjectRoot } | { ok: false; error: string } {
  const device = project.devices.find((candidate) => candidate.id === input.deviceId);

  if (!device) {
    return { ok: false, error: 'Device edit blocked: selected device no longer exists.' };
  }

  if (device.kind === 'terminal_block') {
    return { ok: false, error: 'Device edit blocked: terminal blocks use the TB workflow.' };
  }

  const locationExists = project.locations.some(
    (location) => location.id === input.deviceUpdates.locationId,
  );

  if (!locationExists) {
    return { ok: false, error: 'Device edit blocked: select a valid location.' };
  }

  const existingGroupsById = new Map(
    project.portGroups
      .filter((group) => group.deviceId === input.deviceId)
      .map((group) => [group.id, group] as const),
  );
  const editedGroupIds = new Set(input.existingPortGroups.map((group) => group.id));

  for (const group of input.existingPortGroups) {
    const current = existingGroupsById.get(group.id);

    if (!current) {
      return { ok: false, error: `Device edit blocked: interface ${group.id} no longer exists.` };
    }

    if (!group.name.trim()) {
      return { ok: false, error: 'Device edit blocked: interface name is required.' };
    }

    if (!group.portLabelPattern.trim()) {
      return { ok: false, error: `Device edit blocked: label pattern is required for ${group.name}.` };
    }
  }

  for (const group of existingGroupsById.values()) {
    if (!editedGroupIds.has(group.id)) {
      return { ok: false, error: `Device edit blocked: interface ${group.name} is missing.` };
    }
  }

  for (const draft of input.newPortGroups) {
    const error = validateNewPortGroup(project, draft);

    if (error) {
      return { ok: false, error: `Device edit blocked: ${error}` };
    }
  }

  const assignedRack = device.rackId ? project.racks.find((rack) => rack.id === device.rackId) : null;
  const labelPrefix =
    input.deviceUpdates.labelPrefix.trim() ||
    input.deviceUpdates.code.trim() ||
    input.deviceUpdates.name.trim();
  const nextDevice: Device = {
    ...device,
    name: input.deviceUpdates.name.trim(),
    code: input.deviceUpdates.code.trim(),
    manufacturer: input.deviceUpdates.manufacturer ?? '',
    model: input.deviceUpdates.model ?? '',
    categoryId: input.deviceUpdates.categoryId,
    locationId: device.mountType === 'rack' ? (assignedRack?.locationId ?? device.locationId) : input.deviceUpdates.locationId,
    role: input.deviceUpdates.role ?? '',
    labelPrefix,
    notes: input.deviceUpdates.notes,
    rackSizeRu: input.deviceUpdates.rackSizeRu,
    updatedAt: timestamp,
  };
  const existingEditsById = new Map(input.existingPortGroups.map((group) => [group.id, group] as const));
  const relabeledPortIds = new Set<string>();
  const nextExistingGroups = project.portGroups.map((group) => {
    const edit = existingEditsById.get(group.id);

    if (!edit) {
      return group;
    }

    return {
      ...group,
      name: edit.name.trim(),
      portLabelPattern: edit.portLabelPattern,
    };
  });
  const groupsById = new Map(nextExistingGroups.map((group) => [group.id, group] as const));
  const nextExistingPorts = project.ports.map((port) => {
    if (port.deviceId !== input.deviceId) {
      return port;
    }

    const group = groupsById.get(port.portGroupId);

    if (!group) {
      return port;
    }

    const nextLabel = formatPortLabel(group.portLabelPattern, nextDevice.labelPrefix, port.index);

    if (nextLabel !== port.label) {
      relabeledPortIds.add(port.id);
    }

    return {
      ...port,
      name: `${group.name} ${port.index}`,
      label: nextLabel,
    };
  });
  let nextProject: ProjectRoot = {
    ...project,
    devices: project.devices.map((candidate) => (candidate.id === nextDevice.id ? nextDevice : candidate)),
    portGroups: nextExistingGroups,
    ports: nextExistingPorts,
  };
  const newPortGroups: PortGroup[] = [];
  const newPorts: Port[] = [];
  const newCables: Cable[] = [];

  for (const draft of input.newPortGroups) {
    const portGroupId = makeUniquePortGroupId(nextProject, input.deviceId, draft.name);
    const firstCableNumber = draft.createPlannedCables ? draft.firstCableNumber : null;
    const lastCableNumber =
      draft.createPlannedCables && firstCableNumber !== null ? firstCableNumber + draft.count - 1 : null;
    let numberingRangeId: string | null = null;

    if (draft.createPlannedCables && firstCableNumber === null) {
      return { ok: false, error: `Device edit blocked: missing first cable number for ${draft.name}.` };
    }

    if (draft.createPlannedCables && firstCableNumber !== null) {
      const allocation = allocateCableRange(nextProject, {
        prefix: draft.cablePrefix,
        firstCableNumber,
        count: draft.count,
        ownerType: 'portGroup',
        ownerId: portGroupId,
        reason: `Planned cables for ${nextDevice.name} ${draft.name}`,
      });

      if (allocation.preview.errors.length > 0 || !allocation.allocatedRange) {
        return { ok: false, error: `Device edit blocked: cable allocation failed for ${draft.name}.` };
      }

      nextProject = allocation.project;
      numberingRangeId = allocation.allocatedRange.id;
    }

    let groupPorts = createPortsForDraft(nextDevice, portGroupId, draft);

    if (draft.createPlannedCables && firstCableNumber !== null) {
      const linked = createLinkedPlannedCablesForPorts(groupPorts, draft.cablePrefix, firstCableNumber);

      groupPorts = linked.ports;
      newCables.push(...linked.cables);
    }

    newPortGroups.push({
      id: portGroupId,
      deviceId: input.deviceId,
      name: draft.name.trim(),
      direction: draft.direction,
      categoryId: draft.categoryId,
      connectorTypeId: draft.connectorTypeId,
      count: draft.count,
      portLabelPattern: draft.portLabelPattern,
      cablePrefix: draft.cablePrefix,
      firstCableNumber,
      lastCableNumber,
      numberingRangeId,
      createPlannedCables: draft.createPlannedCables,
      locked: true,
    });
    newPorts.push(...groupPorts);
  }

  const portLabelsById = new Map(
    [...nextProject.ports, ...newPorts].map((port) => [port.id, port.label] as const),
  );

  return {
    ok: true,
    project: {
      ...nextProject,
      portGroups: [...nextProject.portGroups, ...newPortGroups],
      ports: [...nextProject.ports, ...newPorts],
      cables: [
        ...nextProject.cables.map((cable) =>
          relabeledPortIds.size > 0 ? relabelCableEndpoints(cable, portLabelsById) : cable,
        ),
        ...newCables,
      ],
    },
  };
}

function validateNewPortGroup(project: ProjectRoot, draft: DevicePortGroupDraft): string | null {
  if (!draft.name.trim()) {
    return 'new interface name is required.';
  }

  if (!Number.isSafeInteger(draft.count) || draft.count <= 0) {
    return `${draft.name} count must be positive.`;
  }

  if (!project.settings.categories.some((category) => category.id === draft.categoryId)) {
    return `${draft.name} uses an unknown category.`;
  }

  if (!project.settings.connectorTypes.some((connector) => connector.id === draft.connectorTypeId)) {
    return `${draft.name} uses an unknown connector.`;
  }

  if (
    !getConnectorsForCategory(project.settings, draft.categoryId).some(
      (connector) => connector.id === draft.connectorTypeId,
    )
  ) {
    return `${draft.name} connector must be assigned to the selected category.`;
  }

  if (!project.settings.cablePrefixes.some((prefix) => prefix.prefix === draft.cablePrefix)) {
    return `${draft.name} uses an unknown cable prefix.`;
  }

  if (draft.createPlannedCables && (!draft.firstCableNumber || draft.firstCableNumber < 1)) {
    return `${draft.name} needs a positive first cable number.`;
  }

  return null;
}

function createPortsForDraft(device: Device, portGroupId: string, draft: DevicePortGroupDraft): Port[] {
  return Array.from({ length: draft.count }, (_, offset) => {
    const index = offset + 1;

    return {
      id: makeIndexedId(`${portGroupId}-port`, index),
      deviceId: device.id,
      portGroupId,
      index,
      name: `${draft.name.trim()} ${index}`,
      label: formatPortLabel(draft.portLabelPattern, device.labelPrefix, index),
      direction: draft.direction,
      categoryId: draft.categoryId,
      connectorTypeId: draft.connectorTypeId,
      plannedCableId: null,
      notes: '',
    };
  });
}

function makeUniquePortGroupId(project: ProjectRoot, deviceId: string, name: string): string {
  const existingIds = new Set(project.portGroups.map((group) => group.id));
  const base = makeId('port-group', `${deviceId}-${name}`);
  let candidate = base;
  let index = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

function relabelCableEndpoints(cable: Cable, portLabelsById: Map<string, string>): Cable {
  const sideAEndpoint = relabelEndpoint(cable.sideAEndpoint, portLabelsById);
  const sideBEndpoint = relabelEndpoint(cable.sideBEndpoint, portLabelsById);
  const sideALabelChanged = sideAEndpoint !== cable.sideAEndpoint;
  const sideBLabelChanged = sideBEndpoint !== cable.sideBEndpoint;

  if (!sideALabelChanged && !sideBLabelChanged) {
    return cable;
  }

  return {
    ...cable,
    sideAEndpoint,
    sideBEndpoint,
    labelTop: sideAEndpoint.type === 'device_port' || sideAEndpoint.type === 'tb_port' ? sideAEndpoint.label : cable.labelTop,
    labelMiddle: cable.number,
    labelBottom:
      sideBEndpoint.type === 'device_port' || sideBEndpoint.type === 'tb_port'
        ? sideBEndpoint.label
        : cable.labelBottom,
  };
}

function relabelEndpoint(endpoint: Endpoint, portLabelsById: Map<string, string>): Endpoint {
  if ((endpoint.type !== 'device_port' && endpoint.type !== 'tb_port') || !endpoint.id) {
    return endpoint;
  }

  const label = portLabelsById.get(endpoint.id);

  if (!label || label === endpoint.label) {
    return endpoint;
  }

  return {
    ...endpoint,
    label,
  };
}
