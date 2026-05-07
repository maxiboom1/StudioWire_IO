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
  const devicePortEndpoint: Endpoint = {
    type: 'device_port',
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
    sourceEndpoint: isInput ? UNKNOWN_ENDPOINT : devicePortEndpoint,
    destinationEndpoint: isInput ? devicePortEndpoint : UNKNOWN_ENDPOINT,
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
