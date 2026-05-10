import { allocateCableRange, formatCableNumber, getLedgerForPrefix } from './cableNumbers';
import { makeId, nowIso } from './id';
import type { Cable, Endpoint, Port, ProjectRoot, TerminalBlockPort } from './types';

export type CableEndpointSide = 'source' | 'destination';
export type EndpointOccupancy = 'empty' | 'planned_unresolved' | 'active_connected' | 'retired_history_only';

export interface EndpointDisplayInfo {
  endpoint: Endpoint;
  objectType: 'device' | 'terminalBlock' | 'external' | 'unknown';
  objectId: string | null;
  objectName: string;
  label: string;
  direction: Port['direction'] | null;
  face: TerminalBlockPort['face'] | null;
  categoryId: string | null;
  connectorTypeId: string | null;
}

export interface EndpointCandidate {
  endpoint: Endpoint;
  display: EndpointDisplayInfo;
  occupancy: EndpointOccupancy;
}

export interface ConnectCableEndpointInput {
  anchorEndpoint: Endpoint;
  targetEndpoint: Endpoint;
  anchorCableId?: string;
  anchorSide?: CableEndpointSide;
  cablePrefix?: string;
}

export interface DisconnectCableEndpointInput {
  cableId: string;
  side: CableEndpointSide;
}

export type CrosspointResult =
  | { ok: true; project: ProjectRoot; message: string }
  | { ok: false; project: ProjectRoot; message: string };

const UNKNOWN_ENDPOINT: Endpoint = {
  type: 'unknown',
  id: null,
  label: 'Unknown',
};

export function resolveEndpointInfo(project: ProjectRoot, endpoint: Endpoint): EndpointDisplayInfo {
  if (endpoint.type === 'device_port' && endpoint.id) {
    const port = project.ports.find((candidate) => candidate.id === endpoint.id) ?? null;
    const device = port ? project.devices.find((candidate) => candidate.id === port.deviceId) ?? null : null;

    return {
      endpoint,
      objectType: 'device',
      objectId: device?.id ?? null,
      objectName: device?.name ?? 'Missing device',
      label: port?.label ?? endpoint.label,
      direction: port?.direction ?? null,
      face: null,
      categoryId: port?.categoryId ?? null,
      connectorTypeId: port?.connectorTypeId ?? null,
    };
  }

  if (endpoint.type === 'tb_port' && endpoint.id) {
    const port = project.terminalBlockPorts.find((candidate) => candidate.id === endpoint.id) ?? null;
    const terminalBlock = port
      ? project.terminalBlocks.find((candidate) => candidate.id === port.terminalBlockId) ?? null
      : null;

    return {
      endpoint,
      objectType: 'terminalBlock',
      objectId: terminalBlock?.id ?? null,
      objectName: terminalBlock?.name ?? 'Missing terminal block',
      label: port?.label ?? endpoint.label,
      direction: null,
      face: port?.face ?? null,
      categoryId: port?.categoryId ?? null,
      connectorTypeId: port?.connectorTypeId ?? null,
    };
  }

  return {
    endpoint,
    objectType: endpoint.type === 'external' ? 'external' : 'unknown',
    objectId: endpoint.id,
    objectName: endpoint.label || (endpoint.type === 'external' ? 'External' : 'Unknown'),
    label: endpoint.label,
    direction: null,
    face: null,
    categoryId: null,
    connectorTypeId: null,
  };
}

export function findActiveCablesAttachedToEndpoint(project: ProjectRoot, endpoint: Endpoint): Cable[] {
  return project.cables.filter((cable) => cable.status !== 'retired' && cableReferencesEndpoint(cable, endpoint));
}

export function findRetiredCablesAttachedToEndpoint(project: ProjectRoot, endpoint: Endpoint): Cable[] {
  return project.cables.filter((cable) => cable.status === 'retired' && cableReferencesEndpoint(cable, endpoint));
}

export function findPlannedUnresolvedCableStubAttachedToEndpoint(
  project: ProjectRoot,
  endpoint: Endpoint,
): Cable | null {
  return (
    findActiveCablesAttachedToEndpoint(project, endpoint).find(
      (cable) => cable.status === 'planned' && (isUnknownEndpoint(cable.sourceEndpoint) || isUnknownEndpoint(cable.destinationEndpoint)),
    ) ?? null
  );
}

export function classifyEndpointOccupancy(project: ProjectRoot, endpoint: Endpoint): EndpointOccupancy {
  const activeCables = findActiveCablesAttachedToEndpoint(project, endpoint);

  if (activeCables.some((cable) => !isCableUnresolved(cable))) {
    return 'active_connected';
  }

  if (activeCables.some(isCableUnresolved)) {
    return 'planned_unresolved';
  }

  return findRetiredCablesAttachedToEndpoint(project, endpoint).length > 0 ? 'retired_history_only' : 'empty';
}

export function checkEndpointCompatibility(
  project: ProjectRoot,
  anchorEndpoint: Endpoint,
  targetEndpoint: Endpoint,
): { ok: true } | { ok: false; reason: string } {
  if (!anchorEndpoint.id || !targetEndpoint.id || anchorEndpoint.type === 'unknown' || targetEndpoint.type === 'unknown') {
    return { ok: false, reason: 'Both endpoints must be real project endpoints.' };
  }

  if (endpointKey(anchorEndpoint) === endpointKey(targetEndpoint)) {
    return { ok: false, reason: 'Cannot connect an endpoint to itself.' };
  }

  const anchor = resolveEndpointInfo(project, anchorEndpoint);
  const target = resolveEndpointInfo(project, targetEndpoint);

  if (anchor.objectType === 'unknown' || target.objectType === 'unknown') {
    return { ok: false, reason: 'Unknown or missing endpoints cannot be connected.' };
  }

  if (anchor.endpoint.type === 'device_port' && target.endpoint.type === 'device_port') {
    if (anchor.direction === 'input' && target.direction === 'input') {
      return { ok: false, reason: 'Device input cannot connect directly to another device input.' };
    }

    if (anchor.direction === 'output' && target.direction === 'output') {
      return { ok: false, reason: 'Device output cannot connect directly to another device output.' };
    }
  }

  return { ok: true };
}

export function getCompatibleTargetEndpointCandidates(
  project: ProjectRoot,
  anchorEndpoint: Endpoint,
): EndpointCandidate[] {
  return getAllConnectableEndpoints(project)
    .filter((endpoint) => checkEndpointCompatibility(project, anchorEndpoint, endpoint).ok)
    .map((endpoint) => ({
      endpoint,
      display: resolveEndpointInfo(project, endpoint),
      occupancy: classifyEndpointOccupancy(project, endpoint),
    }))
    .filter((candidate) => candidate.occupancy !== 'active_connected');
}

export function connectCableEndpoint(project: ProjectRoot, input: ConnectCableEndpointInput): CrosspointResult {
  const compatibility = checkEndpointCompatibility(project, input.anchorEndpoint, input.targetEndpoint);

  if (!compatibility.ok) {
    return { ok: false, project, message: compatibility.reason };
  }

  if (classifyEndpointOccupancy(project, input.targetEndpoint) === 'active_connected') {
    return {
      ok: false,
      project,
      message: 'Target endpoint already has an active connected cable.',
    };
  }

  const anchorCable = input.anchorCableId
    ? project.cables.find((cable) => cable.id === input.anchorCableId) ?? null
    : findPlannedUnresolvedCableStubAttachedToEndpoint(project, input.anchorEndpoint);

  return anchorCable
    ? connectExistingAnchorCable(project, input, anchorCable)
    : createNewCableBetweenEndpoints(project, input);
}

export function disconnectCableEndpoint(project: ProjectRoot, input: DisconnectCableEndpointInput): CrosspointResult {
  const cable = project.cables.find((candidate) => candidate.id === input.cableId) ?? null;

  if (!cable) {
    return { ok: false, project, message: 'Cable not found.' };
  }

  const endpoint = input.side === 'source' ? cable.sourceEndpoint : cable.destinationEndpoint;

  if (isUnknownEndpoint(endpoint)) {
    return { ok: false, project, message: 'Endpoint is already disconnected.' };
  }

  return {
    ok: true,
    project: {
      ...project,
      cables: project.cables.map((candidate) =>
        candidate.id === cable.id
          ? relabelCable({
              ...candidate,
              [input.side === 'source' ? 'sourceEndpoint' : 'destinationEndpoint']: UNKNOWN_ENDPOINT,
            })
          : candidate,
      ),
    },
    message: `${cable.number} endpoint disconnected.`,
  };
}

function connectExistingAnchorCable(
  project: ProjectRoot,
  input: ConnectCableEndpointInput,
  anchorCable: Cable,
): CrosspointResult {
  const anchorSide = input.anchorSide ?? getFirstUnknownSide(anchorCable);

  if (!anchorSide) {
    return { ok: false, project, message: 'Anchor cable has no unknown endpoint to connect.' };
  }

  const losingCable = findPlannedUnresolvedCableStubAttachedToEndpoint(project, input.targetEndpoint);
  const updatedAnchor = relabelCable({
    ...anchorCable,
    [anchorSide === 'source' ? 'sourceEndpoint' : 'destinationEndpoint']: input.targetEndpoint,
  });

  return {
    ok: true,
    project: {
      ...project,
      cables: project.cables.map((cable) => {
        if (cable.id === anchorCable.id) {
          return updatedAnchor;
        }

        if (losingCable && losingCable.id !== anchorCable.id && cable.id === losingCable.id) {
          return { ...cable, status: 'retired' };
        }

        return cable;
      }),
      ports: updateDevicePortBacklinks(project, updatedAnchor),
    },
    message:
      losingCable && losingCable.id !== anchorCable.id
        ? `${anchorCable.number} connected; ${losingCable.number} retired.`
        : `${anchorCable.number} connected.`,
  };
}

function createNewCableBetweenEndpoints(project: ProjectRoot, input: ConnectCableEndpointInput): CrosspointResult {
  const prefix = input.cablePrefix ?? getDefaultPrefixForEndpoint(project, input.anchorEndpoint);
  const workingProject = structuredClone(project);
  const ledger = getLedgerForPrefix(workingProject, prefix);
  const cableId = makeId('cable', `${prefix}-${ledger.nextSuggested}-${nowIso()}`);
  const allocation = allocateCableRange(workingProject, {
    prefix,
    firstCableNumber: ledger.nextSuggested,
    count: 1,
    ownerType: 'crosspoint',
    ownerId: cableId,
    reason: 'Manual endpoint crosspoint cable',
  });

  if (allocation.preview.errors.length > 0 || !allocation.allocatedRange) {
    return { ok: false, project, message: 'Cable allocation failed for the new crosspoint cable.' };
  }

  const [sourceEndpoint, destinationEndpoint] = normalizeEndpointOrder(project, input.anchorEndpoint, input.targetEndpoint);
  const cable = relabelCable({
    id: cableId,
    number: formatCableNumber(allocation.preview.prefix, allocation.preview.from),
    prefix: allocation.preview.prefix,
    index: allocation.preview.from,
    status: 'planned',
    sourceEndpoint,
    destinationEndpoint,
    labelTop: '',
    labelMiddle: '',
    labelBottom: '',
    notes: '',
  });
  const losingCable = findPlannedUnresolvedCableStubAttachedToEndpoint(project, input.targetEndpoint);
  const nextProject = {
    ...allocation.project,
    cables: [
      ...allocation.project.cables.map((candidate) =>
        losingCable && candidate.id === losingCable.id ? { ...candidate, status: 'retired' as const } : candidate,
      ),
      cable,
    ],
  };

  return {
    ok: true,
    project: {
      ...nextProject,
      ports: updateDevicePortBacklinks(nextProject, cable),
    },
    message: losingCable ? `${cable.number} created; ${losingCable.number} retired.` : `${cable.number} created.`,
  };
}

function updateDevicePortBacklinks(project: ProjectRoot, cable: Cable): Port[] {
  const endpointIds = [cable.sourceEndpoint, cable.destinationEndpoint]
    .filter((endpoint) => endpoint.type === 'device_port' && endpoint.id)
    .map((endpoint) => endpoint.id as string);

  if (endpointIds.length === 0) {
    return project.ports;
  }

  return project.ports.map((port) => (endpointIds.includes(port.id) ? { ...port, plannedCableId: cable.id } : port));
}

function relabelCable(cable: Cable): Cable {
  return {
    ...cable,
    labelTop: isUnknownEndpoint(cable.sourceEndpoint) ? '' : cable.sourceEndpoint.label,
    labelMiddle: cable.number,
    labelBottom: isUnknownEndpoint(cable.destinationEndpoint) ? '' : cable.destinationEndpoint.label,
  };
}

function normalizeEndpointOrder(project: ProjectRoot, left: Endpoint, right: Endpoint): [Endpoint, Endpoint] {
  const leftInfo = resolveEndpointInfo(project, left);
  const rightInfo = resolveEndpointInfo(project, right);

  if (leftInfo.direction === 'output' && rightInfo.direction !== 'output') {
    return [left, right];
  }

  if (rightInfo.direction === 'output' && leftInfo.direction !== 'output') {
    return [right, left];
  }

  return [left, right];
}

function getDefaultPrefixForEndpoint(project: ProjectRoot, endpoint: Endpoint): string {
  const info = resolveEndpointInfo(project, endpoint);
  const category = info.categoryId
    ? project.settings.categories.find((candidate) => candidate.id === info.categoryId)
    : null;

  return category?.defaultCablePrefix ?? project.settings.cablePrefixes[0]?.prefix ?? 'V';
}

function getAllConnectableEndpoints(project: ProjectRoot): Endpoint[] {
  return [
    ...project.ports.map((port) => ({ type: 'device_port' as const, id: port.id, label: port.label })),
    ...project.terminalBlockPorts.map((port) => ({ type: 'tb_port' as const, id: port.id, label: port.label })),
  ];
}

function cableReferencesEndpoint(cable: Cable, endpoint: Endpoint): boolean {
  return endpointMatches(cable.sourceEndpoint, endpoint) || endpointMatches(cable.destinationEndpoint, endpoint);
}

function endpointMatches(left: Endpoint, right: Endpoint): boolean {
  return left.type === right.type && left.id === right.id && Boolean(left.id);
}

function endpointKey(endpoint: Endpoint): string {
  return `${endpoint.type}:${endpoint.id ?? ''}`;
}

function isCableUnresolved(cable: Cable): boolean {
  return isUnknownEndpoint(cable.sourceEndpoint) || isUnknownEndpoint(cable.destinationEndpoint);
}

function isUnknownEndpoint(endpoint: Endpoint): boolean {
  return endpoint.type === 'unknown' || endpoint.id === null;
}

function getFirstUnknownSide(cable: Cable): CableEndpointSide | null {
  if (isUnknownEndpoint(cable.sourceEndpoint)) {
    return 'source';
  }

  if (isUnknownEndpoint(cable.destinationEndpoint)) {
    return 'destination';
  }

  return null;
}
