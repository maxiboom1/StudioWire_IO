import { formatCableNumber } from './cableNumbers';
import { makeId } from './id';
import type { Cable, CableStatus, Endpoint, Port } from './types';

const UNKNOWN_ENDPOINT: Endpoint = {
  type: 'unknown',
  id: null,
  label: 'Unknown',
};

export function createPlannedCableForPort(
  port: Port,
  prefix: string,
  index: number,
  status: CableStatus = 'planned',
): Cable {
  const cableNumber = formatCableNumber(prefix, index);
  const portEndpoint: Endpoint = {
    type: port.direction === 'front' ? 'tb_port' : 'device_port',
    id: port.id,
    label: port.label,
  };
  const isInput = port.direction === 'input';

  return {
    id: makeId('cable', cableNumber),
    number: cableNumber,
    prefix,
    index,
    status,
    sideAEndpoint: isInput ? UNKNOWN_ENDPOINT : portEndpoint,
    sideBEndpoint: isInput ? portEndpoint : UNKNOWN_ENDPOINT,
    labelTop: isInput ? '' : port.label,
    labelMiddle: cableNumber,
    labelBottom: isInput ? port.label : '',
    notes: '',
  };
}

export function createPlannedCablesForPorts(
  ports: Port[],
  prefix: string,
  firstCableNumber: number,
  status: CableStatus = 'planned',
): Cable[] {
  return ports.map((port, offset) =>
    createPlannedCableForPort(port, prefix, firstCableNumber + offset, status),
  );
}

export function createLinkedPlannedCablesForPorts(
  ports: Port[],
  prefix: string,
  firstCableNumber: number,
  status: CableStatus = 'planned',
): { ports: Port[]; cables: Cable[] } {
  const cables = createPlannedCablesForPorts(ports, prefix, firstCableNumber, status);
  const cableIdsByPortId = new Map<string, string>();

  for (const cable of cables) {
    const portId =
      cable.sideAEndpoint.type === 'device_port' || cable.sideAEndpoint.type === 'tb_port'
        ? cable.sideAEndpoint.id
        : cable.sideBEndpoint.type === 'device_port' || cable.sideBEndpoint.type === 'tb_port'
          ? cable.sideBEndpoint.id
          : null;

    if (portId) {
      cableIdsByPortId.set(portId, cable.id);
    }
  }

  return {
    ports: ports.map((port) => ({
      ...port,
      plannedCableId: cableIdsByPortId.get(port.id) ?? port.plannedCableId,
    })),
    cables,
  };
}
