import {
  arePortConnectorsCompatible,
  createConnectorCompatibilityLookup,
  type ConnectorCompatibilityLookup,
} from './connectorCompatibility';
import type { Cable, Device, Endpoint, Port, ProjectRoot } from './types';

const UNKNOWN_ENDPOINT: Endpoint = {
  type: 'unknown',
  id: null,
  label: 'Unknown',
};

export interface ConnectPortsInput {
  fromPortId: string;
  toPortId: string;
}

export interface DisconnectPortInput {
  portId: string;
}

export interface ConnectionTargetLookup {
  portsById: ReadonlyMap<string, Port>;
  devicesById: ReadonlyMap<string, Device>;
  cablesById: ReadonlyMap<string, Cable>;
  connectorCompatibility: ConnectorCompatibilityLookup;
}

export interface PortConnectionSummary {
  cable: Cable | null;
  isConnected: boolean;
  chainLabel: string;
  chainParts: PortConnectionChainPart[];
}

export type PortConnectionChainPart =
  | {
      type: 'terminal_block';
      label: string;
      marker: string;
      orientation: 'rear-to-front' | 'front-to-rear' | 'front-to-front' | 'rear' | 'front';
      entryPortId: string;
      exitPortId: string | null;
      continuationCable: Cable | null;
    }
  | {
      type: 'port';
      label: string;
      portId: string;
    };

export function connectPorts(
  project: ProjectRoot,
  input: ConnectPortsInput,
): { ok: true; project: ProjectRoot; message: string } | { ok: false; error: string } {
  const targetStatus = getConnectionTargetStatus(project, input);

  if (!targetStatus.ok) {
    return { ok: false, error: targetStatus.reason };
  }

  const nextProject = structuredClone(project);
  const portsById = new Map(nextProject.ports.map((port) => [port.id, port]));
  const cablesById = new Map(nextProject.cables.map((cable) => [cable.id, cable]));
  const fromPort = portsById.get(input.fromPortId);
  const toPort = portsById.get(input.toPortId);

  if (!fromPort || !toPort) {
    return { ok: false, error: 'Connection blocked: selected port no longer exists.' };
  }

  const affectedPortIds = new Set([fromPort.id, toPort.id]);
  const activeCables = nextProject.cables.filter(
    (cable) =>
      cable.status === 'connected' &&
      (cableReferencesPort(cable, fromPort.id) || cableReferencesPort(cable, toPort.id)),
  );

  for (const cable of activeCables) {
    for (const portId of getCablePortIds(cable)) {
      affectedPortIds.add(portId);
    }
  }

  for (const portId of affectedPortIds) {
    const port = portsById.get(portId);
    const cable = port?.plannedCableId ? cablesById.get(port.plannedCableId) : null;

    if (port && cable) {
      resetCableToPortSlot(cable, port, 'planned');
    }
  }

  for (const cable of activeCables) {
    const hasOwner = nextProject.ports.some(
      (port) => affectedPortIds.has(port.id) && port.plannedCableId === cable.id,
    );

    if (!hasOwner) {
      cable.status = 'retired';
      cable.sideAEndpoint = UNKNOWN_ENDPOINT;
      cable.sideBEndpoint = UNKNOWN_ENDPOINT;
      cable.labelTop = '';
      cable.labelMiddle = cable.number;
      cable.labelBottom = '';
    }
  }

  const slots = [fromPort, toPort]
    .map((port) => (port.plannedCableId ? (cablesById.get(port.plannedCableId) ?? null) : null))
    .filter((cable): cable is Cable => cable !== null);

  if (slots.length === 0) {
    return {
      ok: false,
      error: 'Connection blocked: at least one selected port needs a planned cable number.',
    };
  }

  const sortedSlots = [...slots].sort(compareCableNumbers);
  const winner = sortedSlots[0];
  const loser = sortedSlots.find((candidate) => candidate.id !== winner.id) ?? null;
  const loserOwner = loser
    ? (nextProject.ports.find((port) => port.plannedCableId === loser.id) ?? null)
    : null;

  if (loser && loserOwner) {
    resetCableToPortSlot(loser, loserOwner, 'retired');
  }

  winner.status = 'connected';
  winner.sideAEndpoint = createPortEndpoint(nextProject, fromPort);
  winner.sideBEndpoint = createPortEndpoint(nextProject, toPort);
  winner.labelTop = fromPort.label;
  winner.labelMiddle = winner.number;
  winner.labelBottom = toPort.label;

  return {
    ok: true,
    project: nextProject,
    message: `${winner.number} connected ${fromPort.label} to ${toPort.label}`,
  };
}

export function disconnectPort(
  project: ProjectRoot,
  input: DisconnectPortInput,
): { ok: true; project: ProjectRoot; message: string } | { ok: false; error: string } {
  const originPort = project.ports.find((port) => port.id === input.portId);

  if (!originPort) {
    return { ok: false, error: 'Disconnect blocked: selected port no longer exists.' };
  }

  const activeCables = project.cables.filter(
    (cable) => cable.status === 'connected' && cableReferencesPort(cable, originPort.id),
  );

  if (activeCables.length === 0) {
    return { ok: false, error: 'No active connection to clear.' };
  }

  const nextProject = structuredClone(project);
  const portsById = new Map(nextProject.ports.map((port) => [port.id, port]));
  const cablesById = new Map(nextProject.cables.map((cable) => [cable.id, cable]));
  const affectedPortIds = new Set<string>();

  for (const cable of activeCables) {
    const nextCable = cablesById.get(cable.id);

    if (!nextCable) {
      continue;
    }

    for (const portId of getCablePortIds(nextCable)) {
      affectedPortIds.add(portId);
    }

    const ownerPort = nextProject.ports.find((port) => port.plannedCableId === nextCable.id) ?? null;

    if (ownerPort) {
      resetCableToPortSlot(nextCable, ownerPort, 'planned');
    } else {
      resetCableToUnknownSlot(nextCable, 'planned');
    }
  }

  for (const portId of affectedPortIds) {
    const port = portsById.get(portId);
    const cable = port?.plannedCableId ? cablesById.get(port.plannedCableId) : null;

    if (port && cable) {
      resetCableToPortSlot(cable, port, 'planned');
    }
  }

  return {
    ok: true,
    project: nextProject,
    message: `Connection cleared for ${originPort.label}`,
  };
}

export function getConnectionTargetStatus(
  project: ProjectRoot,
  input: ConnectPortsInput,
  lookup?: ConnectionTargetLookup,
): { ok: true } | { ok: false; reason: string } {
  if (input.fromPortId === input.toPortId) {
    return { ok: false, reason: 'Cannot connect a port to itself.' };
  }

  const effectiveLookup = lookup ?? createConnectionTargetLookup(project);
  const fromPort = effectiveLookup.portsById.get(input.fromPortId);
  const toPort = effectiveLookup.portsById.get(input.toPortId);

  if (!fromPort || !toPort) {
    return { ok: false, reason: 'Port is missing.' };
  }

  const connectorStatus = arePortConnectorsCompatible(
    project,
    fromPort,
    toPort,
    effectiveLookup.connectorCompatibility,
  );

  if (!connectorStatus.ok) {
    return connectorStatus;
  }

  const segmentStatus = getSegmentCompatibility(project, fromPort, toPort, effectiveLookup);

  if (!segmentStatus.ok) {
    return segmentStatus;
  }

  const hasCableSlot = Boolean(
    (fromPort.plannedCableId && effectiveLookup.cablesById.has(fromPort.plannedCableId)) ||
      (toPort.plannedCableId && effectiveLookup.cablesById.has(toPort.plannedCableId)),
  );

  if (!hasCableSlot) {
    return { ok: false, reason: 'No planned cable number is available for this pair.' };
  }

  return { ok: true };
}

export function getSegmentCompatibility(
  project: ProjectRoot,
  fromPort: Port,
  toPort: Port,
  lookup?: Pick<ConnectionTargetLookup, 'devicesById'>,
): { ok: true } | { ok: false; reason: string } {
  const fromIsTb = isTerminalBlockPort(project, fromPort, lookup);
  const toIsTb = isTerminalBlockPort(project, toPort, lookup);

  if (!fromIsTb && !toIsTb) {
    return areStandardDirectionsCompatible(fromPort, toPort)
      ? { ok: true }
      : { ok: false, reason: 'Standard device directions are not compatible.' };
  }

  if (fromIsTb && toIsTb) {
    if (fromPort.direction === 'front' && toPort.direction === 'front') {
      return { ok: true };
    }

    return { ok: false, reason: 'TB-to-TB connections are only allowed between front ports.' };
  }

  const tbPort = fromIsTb ? fromPort : toPort;

  if (tbPort.direction === 'rear' || tbPort.direction === 'front') {
    return { ok: true };
  }

  return { ok: false, reason: 'Invalid terminal block port direction.' };
}

export function describePortConnection(project: ProjectRoot, portId: string): PortConnectionSummary {
  const connectedCable = project.cables.find(
    (cable) => cable.status === 'connected' && cableReferencesPort(cable, portId),
  );
  const port = project.ports.find((candidate) => candidate.id === portId) ?? null;
  const slotCable = port?.plannedCableId
    ? (project.cables.find((candidate) => candidate.id === port.plannedCableId) ?? null)
    : null;

  const chainParts = connectedCable ? buildChainParts(project, portId) : [];

  return {
    cable: connectedCable ?? slotCable,
    isConnected: Boolean(connectedCable),
    chainLabel: chainParts
      .map((part) => (part.type === 'terminal_block' ? part.marker : part.label))
      .join(' '),
    chainParts,
  };
}

export function cableReferencesPort(cable: Cable, portId: string): boolean {
  return (
    endpointReferencesPort(cable.sideAEndpoint, portId) || endpointReferencesPort(cable.sideBEndpoint, portId)
  );
}

export function endpointReferencesPort(endpoint: Endpoint, portId: string): boolean {
  return (endpoint.type === 'device_port' || endpoint.type === 'tb_port') && endpoint.id === portId;
}

export function getCablePortIds(cable: Cable): string[] {
  return [cable.sideAEndpoint, cable.sideBEndpoint]
    .map((endpoint) => (endpoint.type === 'device_port' || endpoint.type === 'tb_port' ? endpoint.id : null))
    .filter((id): id is string => Boolean(id));
}

export function createPortEndpoint(project: ProjectRoot, port: Port): Endpoint {
  return {
    type: isTerminalBlockPort(project, port) ? 'tb_port' : 'device_port',
    id: port.id,
    label: port.label,
  };
}

export function isTerminalBlockPort(
  project: ProjectRoot,
  port: Port,
  lookup?: Pick<ConnectionTargetLookup, 'devicesById'>,
): boolean {
  return (
    (lookup?.devicesById.get(port.deviceId) ?? project.devices.find((device) => device.id === port.deviceId))
      ?.kind === 'terminal_block'
  );
}

export function createConnectionTargetLookup(project: ProjectRoot): ConnectionTargetLookup {
  return {
    portsById: new Map(project.ports.map((port) => [port.id, port])),
    devicesById: new Map(project.devices.map((device) => [device.id, device])),
    cablesById: new Map(project.cables.map((cable) => [cable.id, cable])),
    connectorCompatibility: createConnectorCompatibilityLookup(project.settings),
  };
}

export function areStandardDirectionsCompatible(left: Port, right: Port): boolean {
  const directions = new Set([left.direction, right.direction]);

  if (directions.has('rear') || directions.has('front')) {
    return true;
  }

  if (directions.has('bidirectional')) {
    return true;
  }

  if (directions.has('input') && directions.has('output')) {
    return true;
  }

  return false;
}

export function getTbInlineLabel(project: ProjectRoot, port: Port): string {
  const device = project.devices.find((candidate) => candidate.id === port.deviceId);
  const prefix = device?.labelPrefix || device?.name || 'TB';

  return `${prefix}-${String(port.index).padStart(2, '0')}`;
}

function resetCableToPortSlot(cable: Cable, port: Port, status: Cable['status']) {
  const endpoint: Endpoint = {
    type: port.direction === 'rear' || port.direction === 'front' ? 'tb_port' : 'device_port',
    id: port.id,
    label: port.label,
  };

  cable.status = status;
  cable.labelMiddle = cable.number;

  if (port.direction === 'input') {
    cable.sideAEndpoint = UNKNOWN_ENDPOINT;
    cable.sideBEndpoint = endpoint;
    cable.labelTop = '';
    cable.labelBottom = port.label;
    return;
  }

  // Planned cable slots for bidirectional ports use side A by convention until a real connection is made.
  cable.sideAEndpoint = endpoint;
  cable.sideBEndpoint = UNKNOWN_ENDPOINT;
  cable.labelTop = port.label;
  cable.labelMiddle = cable.number;
  cable.labelBottom = '';
}

function resetCableToUnknownSlot(cable: Cable, status: Cable['status']) {
  cable.status = status;
  cable.sideAEndpoint = UNKNOWN_ENDPOINT;
  cable.sideBEndpoint = UNKNOWN_ENDPOINT;
  cable.labelTop = '';
  cable.labelMiddle = cable.number;
  cable.labelBottom = '';
}

function compareCableNumbers(left: Cable, right: Cable): number {
  if (left.prefix === right.prefix) {
    return left.index - right.index;
  }

  return left.number.localeCompare(right.number, undefined, { numeric: true });
}

function buildChainParts(project: ProjectRoot, originPortId: string): PortConnectionChainPart[] {
  const path = findDisplayPath(project, originPortId);

  if (path.length <= 1) {
    return [];
  }

  const parts: PortConnectionChainPart[] = [];
  let previousTbKey: string | null = null;

  for (let index = 1; index < path.length; index += 1) {
    const portId = path[index];
    const port = project.ports.find((candidate) => candidate.id === portId);

    if (!port) {
      continue;
    }

    if (isTerminalBlockPort(project, port)) {
      const tbKey = `${port.deviceId}:${port.index}`;

      if (tbKey !== previousTbKey) {
        const nextPort = path[index + 1]
          ? (project.ports.find((candidate) => candidate.id === path[index + 1]) ?? null)
          : null;
        const followingPortId = path[index + 2] ?? null;
        const orientation = getTbMarkerOrientation(project, port, nextPort);
        const label = getTbInlineLabel(project, port);
        const exitPort = isMatchingTbSibling(project, port, nextPort) ? nextPort : null;

        parts.push({
          type: 'terminal_block',
          label,
          marker: formatTbMarker(label, orientation),
          orientation,
          entryPortId: port.id,
          exitPortId: exitPort?.id ?? null,
          continuationCable:
            exitPort && followingPortId
              ? findConnectedCableBetween(project, exitPort.id, followingPortId)
              : null,
        });
      }

      previousTbKey = tbKey;
      continue;
    }

    previousTbKey = null;
    parts.push({ type: 'port', label: port.label, portId: port.id });
  }

  return parts;
}

function getTbMarkerOrientation(
  project: ProjectRoot,
  port: Port,
  nextPort: Port | null,
): Extract<PortConnectionChainPart, { type: 'terminal_block' }>['orientation'] {
  if (isMatchingTbSibling(project, port, nextPort)) {
    if (port.direction === 'rear' && nextPort.direction === 'front') {
      return 'rear-to-front';
    }

    if (port.direction === 'front' && nextPort.direction === 'rear') {
      return 'front-to-rear';
    }

    if (port.direction === 'front' && nextPort.direction === 'front') {
      return 'front-to-front';
    }
  }

  if (port.direction === 'rear') {
    return 'rear';
  }

  return 'front';
}

function formatTbMarker(
  label: string,
  orientation: Extract<PortConnectionChainPart, { type: 'terminal_block' }>['orientation'],
): string {
  if (orientation === 'front-to-rear' || orientation === 'front') {
    return `< ${label} |`;
  }

  if (orientation === 'front-to-front') {
    return `< ${label} >`;
  }

  return `| ${label} >`;
}

function isMatchingTbSibling(project: ProjectRoot, port: Port, nextPort: Port | null): nextPort is Port {
  return Boolean(
    nextPort &&
      isTerminalBlockPort(project, nextPort) &&
      nextPort.deviceId === port.deviceId &&
      nextPort.index === port.index,
  );
}

function findConnectedCableBetween(
  project: ProjectRoot,
  leftPortId: string,
  rightPortId: string,
): Cable | null {
  return (
    project.cables.find(
      (cable) =>
        cable.status === 'connected' &&
        cableReferencesPort(cable, leftPortId) &&
        cableReferencesPort(cable, rightPortId),
    ) ?? null
  );
}

function findDisplayPath(project: ProjectRoot, originPortId: string): string[] {
  const neighbors = buildConnectionNeighbors(project);
  const queue: string[][] = [[originPortId]];
  const visited = new Set([originPortId]);
  let firstNonOriginPath: string[] = [originPortId];

  while (queue.length > 0) {
    const path = queue.shift() ?? [];
    const current = path[path.length - 1];

    if (current !== originPortId && firstNonOriginPath.length === 1) {
      firstNonOriginPath = path;
    }

    const currentPort = project.ports.find((port) => port.id === current);

    if (current !== originPortId && currentPort && isTerminalBlockPort(project, currentPort)) {
      firstNonOriginPath = path;
    }

    if (current !== originPortId && currentPort && !isTerminalBlockPort(project, currentPort)) {
      return path;
    }

    for (const next of neighbors.get(current) ?? []) {
      if (!visited.has(next) && path.length < 12) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }

  return firstNonOriginPath;
}

function buildConnectionNeighbors(project: ProjectRoot): Map<string, Set<string>> {
  const neighbors = new Map<string, Set<string>>();

  function addEdge(left: string, right: string) {
    if (!neighbors.has(left)) {
      neighbors.set(left, new Set());
    }
    if (!neighbors.has(right)) {
      neighbors.set(right, new Set());
    }
    neighbors.get(left)?.add(right);
    neighbors.get(right)?.add(left);
  }

  for (const cable of project.cables) {
    if (cable.status !== 'connected') {
      continue;
    }

    const [left, right] = getCablePortIds(cable);

    if (left && right) {
      addEdge(left, right);
    }
  }

  const terminalBlocks = project.devices.filter((device) => device.kind === 'terminal_block');

  for (const terminalBlock of terminalBlocks) {
    const rearPorts = project.ports.filter(
      (port) => port.deviceId === terminalBlock.id && port.direction === 'rear',
    );
    const frontPorts = project.ports.filter(
      (port) => port.deviceId === terminalBlock.id && port.direction === 'front',
    );

    for (const rearPort of rearPorts) {
      const frontPort = frontPorts.find((candidate) => candidate.index === rearPort.index);

      if (frontPort) {
        addEdge(rearPort.id, frontPort.id);
      }
    }
  }

  return neighbors;
}
