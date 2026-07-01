import { allocateCableRange } from '../domain/cableNumbers';
import { makeId, makeIndexedId, makeUniqueId, nowIso } from '../domain/id';
import { createLinkedPlannedCablesForPorts } from '../domain/plannedCables';
import { validateRackPlacement } from '../domain/rackPlacement';
import type { Cable, Device, Port, PortGroup, ProjectRoot } from '../domain/types';
import type { DeviceDraft, DevicePortGroupDraft, TerminalBlockDraft } from './projectTypes';

export function createDeviceInProject(
  project: ProjectRoot,
  payload: { device: DeviceDraft; portGroups: DevicePortGroupDraft[] },
): { ok: true; project: ProjectRoot } | { ok: false; error: string } {
  const timestamp = nowIso();
  const locationExists = project.locations.some((location) => location.id === payload.device.locationId);

  if (!locationExists) {
    return { ok: false, error: 'Device creation blocked: select a valid location.' };
  }

  const deviceId = payload.device.id ?? makeUniqueId('device', payload.device.code || payload.device.name);
  const labelPrefix = payload.device.labelPrefix || payload.device.code || payload.device.name;
  const device: Device = {
    id: deviceId,
    name: payload.device.name,
    kind: 'device',
    code: payload.device.code,
    manufacturer: payload.device.manufacturer,
    model: payload.device.model,
    categoryId: payload.device.categoryId,
    locationId: payload.device.locationId,
    role: payload.device.role,
    labelPrefix,
    mountType: payload.device.mountType,
    rackId: payload.device.mountType === 'rack' ? payload.device.rackId : null,
    rackSizeRu: payload.device.mountType === 'rack' ? payload.device.rackSizeRu : null,
    rackBottomRu: payload.device.mountType === 'rack' ? payload.device.rackBottomRu : null,
    status: 'planned',
    notes: payload.device.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  let nextProject: ProjectRoot = {
    ...project,
    devices: [...project.devices, device],
  };
  const newPortGroups: PortGroup[] = [];
  const newPorts: Port[] = [];
  const newCables: Cable[] = [];

  for (let groupIndex = 0; groupIndex < payload.portGroups.length; groupIndex += 1) {
    const draft = payload.portGroups[groupIndex];
    const portGroupId = makeId('port-group', `${deviceId}-${draft.name}-${groupIndex + 1}`);
    const createPlannedCables = draft.createPlannedCables;
    const firstCableNumber = createPlannedCables ? draft.firstCableNumber : null;
    const lastCableNumber =
      createPlannedCables && firstCableNumber !== null && draft.count > 0
        ? firstCableNumber + draft.count - 1
        : null;
    let numberingRangeId: string | null = null;

    if (createPlannedCables && firstCableNumber === null) {
      return {
        ok: false,
        error: `Device creation blocked: missing first cable number for ${draft.name}.`,
      };
    }

    if (createPlannedCables && firstCableNumber !== null) {
      const allocation = allocateCableRange(nextProject, {
        prefix: draft.cablePrefix,
        firstCableNumber,
        count: draft.count,
        ownerType: 'portGroup',
        ownerId: portGroupId,
        reason: `Planned cables for ${device.name} ${draft.name}`,
      });

      if (allocation.preview.errors.length > 0 || !allocation.allocatedRange) {
        return {
          ok: false,
          error: `Device creation blocked: cable allocation failed for ${draft.name}.`,
        };
      }

      nextProject = allocation.project;
      numberingRangeId = allocation.allocatedRange.id;
    }

    const groupPorts = createPortsForDraft({
      device,
      portGroupId,
      draft,
      labelPrefix,
    });

    if (createPlannedCables && firstCableNumber !== null) {
      if (!numberingRangeId) {
        return {
          ok: false,
          error: `Device creation blocked: no allocated cable range for ${draft.name}.`,
        };
      }
      const linked = createLinkedPlannedCablesForPorts(groupPorts, draft.cablePrefix, firstCableNumber);

      if (linked.cables.length !== groupPorts.length || linked.ports.some((port) => !port.plannedCableId)) {
        return {
          ok: false,
          error: `Device creation blocked: planned cable creation failed for ${draft.name}.`,
        };
      }

      groupPorts.splice(0, groupPorts.length, ...linked.ports);
      newCables.push(...linked.cables);
    }

    newPortGroups.push({
      id: portGroupId,
      deviceId,
      name: draft.name,
      direction: draft.direction,
      categoryId: draft.categoryId,
      connectorTypeId: draft.connectorTypeId,
      count: draft.count,
      portLabelPattern: draft.portLabelPattern,
      cablePrefix: draft.cablePrefix,
      firstCableNumber,
      lastCableNumber,
      numberingRangeId,
      createPlannedCables,
      locked: true,
    });
    newPorts.push(...groupPorts);
  }

  return {
    ok: true,
    project: {
      ...nextProject,
      portGroups: [...nextProject.portGroups, ...newPortGroups],
      ports: [...nextProject.ports, ...newPorts],
      cables: [...nextProject.cables, ...newCables],
    },
  };
}

export function createTerminalBlockInProject(
  project: ProjectRoot,
  draft: TerminalBlockDraft,
): { ok: true; project: ProjectRoot } | { ok: false; error: string } {
  const timestamp = nowIso();
  const rack = project.racks.find((candidate) => candidate.id === draft.rackId);

  if (!rack) {
    return { ok: false, error: 'Terminal block creation blocked: select a valid rack.' };
  }

  const placementProbe: Device = {
    id: draft.id ?? makeUniqueId('terminal-block', draft.labelPrefix || draft.name),
    name: draft.name.trim(),
    kind: 'terminal_block',
    categoryId: draft.categoryId,
    locationId: rack.locationId,
    labelPrefix: draft.labelPrefix || draft.name,
    mountType: 'rack',
    rackId: rack.id,
    rackSizeRu: 1,
    rackBottomRu: draft.rackBottomRu,
    status: 'planned',
    notes: draft.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const placementProject = { ...project, devices: [...project.devices, placementProbe] };
  const placement = validateRackPlacement(placementProject, {
    deviceId: placementProbe.id,
    targetRackId: rack.id,
    targetBottomRu: draft.rackBottomRu,
  });

  if (!placement.ok) {
    return { ok: false, error: `Terminal block creation blocked: ${placement.message}` };
  }

  if (!Number.isSafeInteger(draft.count) || draft.count <= 0) {
    return { ok: false, error: 'Terminal block creation blocked: connector count must be positive.' };
  }

  const deviceId = placementProbe.id;
  const labelPrefix = draft.labelPrefix || draft.name;
  const rearGroupId = makeId('port-group', `${deviceId}-rear`);
  const frontGroupId = makeId('port-group', `${deviceId}-front`);
  const rearDraft: DevicePortGroupDraft = {
    name: 'REAR',
    direction: 'rear',
    categoryId: draft.categoryId,
    connectorTypeId: draft.connectorTypeId,
    count: draft.count,
    portLabelPattern: '{DEVICE} (R)-{00}',
    cablePrefix: draft.cablePrefix,
    firstCableNumber: null,
    createPlannedCables: false,
  };
  const frontFirstCableNumber = draft.createPlannedCables ? draft.firstCableNumber : null;
  const frontDraft: DevicePortGroupDraft = {
    name: 'FRONT',
    direction: 'front',
    categoryId: draft.categoryId,
    connectorTypeId: draft.connectorTypeId,
    count: draft.count,
    portLabelPattern: '{DEVICE} (F)-{00}',
    cablePrefix: draft.cablePrefix,
    firstCableNumber: frontFirstCableNumber,
    createPlannedCables: draft.createPlannedCables,
  };
  let nextProject: ProjectRoot = {
    ...project,
    devices: [...project.devices, placementProbe],
  };
  let numberingRangeId: string | null = null;

  if (draft.createPlannedCables && frontFirstCableNumber === null) {
    return { ok: false, error: 'Terminal block creation blocked: missing first front cable number.' };
  }

  if (draft.createPlannedCables && frontFirstCableNumber !== null) {
    const allocation = allocateCableRange(nextProject, {
      prefix: draft.cablePrefix,
      firstCableNumber: frontFirstCableNumber,
      count: draft.count,
      ownerType: 'portGroup',
      ownerId: frontGroupId,
      reason: `Planned front cables for ${placementProbe.name}`,
    });

    if (allocation.preview.errors.length > 0 || !allocation.allocatedRange) {
      return { ok: false, error: 'Terminal block creation blocked: front cable allocation failed.' };
    }

    nextProject = allocation.project;
    numberingRangeId = allocation.allocatedRange.id;
  }

  const rearPorts = createPortsForDraft({
    device: placementProbe,
    portGroupId: rearGroupId,
    draft: rearDraft,
    labelPrefix,
  });
  const frontPorts = createPortsForDraft({
    device: placementProbe,
    portGroupId: frontGroupId,
    draft: frontDraft,
    labelPrefix,
  });
  const linkedFront =
    draft.createPlannedCables && frontFirstCableNumber !== null
      ? createLinkedPlannedCablesForPorts(frontPorts, draft.cablePrefix, frontFirstCableNumber)
      : { ports: frontPorts, cables: [] };

  if (
    draft.createPlannedCables &&
    (linkedFront.cables.length !== frontPorts.length ||
      linkedFront.ports.some((port) => !port.plannedCableId))
  ) {
    return { ok: false, error: 'Terminal block creation blocked: front planned cable creation failed.' };
  }

  const rearGroup: PortGroup = {
    id: rearGroupId,
    deviceId,
    ...rearDraft,
    lastCableNumber: null,
    numberingRangeId: null,
    locked: true,
  };
  const frontGroup: PortGroup = {
    id: frontGroupId,
    deviceId,
    ...frontDraft,
    lastCableNumber:
      draft.createPlannedCables && frontFirstCableNumber !== null
        ? frontFirstCableNumber + draft.count - 1
        : null,
    numberingRangeId,
    locked: true,
  };

  return {
    ok: true,
    project: {
      ...nextProject,
      portGroups: [...nextProject.portGroups, rearGroup, frontGroup],
      ports: [...nextProject.ports, ...rearPorts, ...linkedFront.ports],
      cables: [...nextProject.cables, ...linkedFront.cables],
    },
  };
}

function createPortsForDraft({
  device,
  portGroupId,
  draft,
  labelPrefix,
}: {
  device: Device;
  portGroupId: string;
  draft: DevicePortGroupDraft;
  labelPrefix: string;
}): Port[] {
  return Array.from({ length: Math.max(0, draft.count) }, (_, offset) => {
    const index = offset + 1;

    return {
      id: makeIndexedId(`${portGroupId}-port`, index),
      deviceId: device.id,
      portGroupId,
      index,
      name: `${draft.name} ${index}`,
      label: formatPortLabel(draft.portLabelPattern, labelPrefix, index),
      direction: draft.direction,
      categoryId: draft.categoryId,
      connectorTypeId: draft.connectorTypeId,
      plannedCableId: null,
      notes: '',
    };
  });
}

function formatPortLabel(pattern: string, deviceLabelPrefix: string, index: number): string {
  return pattern
    .split('{DEVICE}')
    .join(deviceLabelPrefix)
    .split('{00}')
    .join(String(index).padStart(2, '0'))
    .split('{000}')
    .join(String(index).padStart(3, '0'));
}
