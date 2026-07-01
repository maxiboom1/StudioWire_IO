import { cableReferencesPort } from './connections';
import { normalizeNumberingLedgers } from './cableNumbers';
import type { Cable, Endpoint, Port, ProjectRoot } from './types';

const UNKNOWN_ENDPOINT: Endpoint = {
  type: 'unknown',
  id: null,
  label: 'Unknown',
};

export type DeleteDeviceResult =
  | {
      ok: true;
      project: ProjectRoot;
      deletedPortCount: number;
      deletedCableCount: number;
      releasedRangeCount: number;
    }
  | { ok: false; error: string };

export function deleteNormalDeviceFromProject(
  project: ProjectRoot,
  deviceId: string,
): DeleteDeviceResult {
  const device = project.devices.find((candidate) => candidate.id === deviceId);

  if (!device) {
    return { ok: false, error: 'Device deletion blocked: selected device no longer exists.' };
  }

  if (device.kind === 'terminal_block') {
    return { ok: false, error: 'Device deletion blocked: terminal block delete is not in this iteration.' };
  }

  const devicePortGroups = project.portGroups.filter((portGroup) => portGroup.deviceId === deviceId);
  const devicePortGroupIds = new Set(devicePortGroups.map((portGroup) => portGroup.id));
  const devicePorts = project.ports.filter((port) => port.deviceId === deviceId);
  const devicePortIds = new Set(devicePorts.map((port) => port.id));
  const deviceOwnedCableIds = new Set(
    devicePorts.map((port) => port.plannedCableId).filter((id): id is string => Boolean(id)),
  );
  const survivingPorts = project.ports.filter((port) => !devicePortIds.has(port.id));
  const survivingPortsByOwnedCableId = new Map(
    survivingPorts
      .filter((port) => port.plannedCableId)
      .map((port) => [port.plannedCableId as string, port] as const),
  );
  let deletedCableCount = 0;

  const nextCables = project.cables.flatMap((cable) => {
    if (deviceOwnedCableIds.has(cable.id)) {
      deletedCableCount += 1;
      return [];
    }

    if (!referencesAnyPort(cable, devicePortIds)) {
      return [cable];
    }

    const survivingOwner = survivingPortsByOwnedCableId.get(cable.id) ?? null;

    if (!survivingOwner) {
      deletedCableCount += 1;
      return [];
    }

    return [resetCableToPortSlot(cable, survivingOwner)];
  });
  let releasedRangeCount = 0;
  const nextProject = normalizeNumberingLedgers({
    ...project,
    devices: project.devices.filter((candidate) => candidate.id !== deviceId),
    portGroups: project.portGroups.filter((portGroup) => !devicePortGroupIds.has(portGroup.id)),
    ports: survivingPorts,
    cables: nextCables,
    numberingLedgers: project.numberingLedgers.map((ledger) => ({
      ...ledger,
      ranges: ledger.ranges.filter((range) => {
        const release =
          range.status === 'allocated' &&
          range.ownerType === 'portGroup' &&
          devicePortGroupIds.has(range.ownerId);

        if (release) {
          releasedRangeCount += 1;
        }

        return !release;
      }),
    })),
  });

  return {
    ok: true,
    project: nextProject,
    deletedPortCount: devicePorts.length,
    deletedCableCount,
    releasedRangeCount,
  };
}

function referencesAnyPort(cable: Cable, portIds: Set<string>): boolean {
  for (const portId of portIds) {
    if (cableReferencesPort(cable, portId)) {
      return true;
    }
  }

  return false;
}

function resetCableToPortSlot(cable: Cable, port: Port): Cable {
  const endpoint: Endpoint = {
    type: port.direction === 'rear' || port.direction === 'front' ? 'tb_port' : 'device_port',
    id: port.id,
    label: port.label,
  };
  const nextCable: Cable = {
    ...cable,
    status: 'planned',
    labelTop: '',
    labelMiddle: cable.number,
    labelBottom: '',
  };

  if (port.direction === 'input') {
    return {
      ...nextCable,
      sideAEndpoint: UNKNOWN_ENDPOINT,
      sideBEndpoint: endpoint,
      labelBottom: port.label,
    };
  }

  return {
    ...nextCable,
    sideAEndpoint: endpoint,
    sideBEndpoint: UNKNOWN_ENDPOINT,
    labelTop: port.label,
  };
}
