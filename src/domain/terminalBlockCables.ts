import { allocateCableRange, formatCableNumber, getLedgerForPrefix } from './cableNumbers';
import { makeId } from './id';
import type {
  Cable,
  CableStatus,
  Category,
  ConnectorType,
  Endpoint,
  EndpointType,
  Port,
  ProjectRoot,
  TerminalBlock,
  TerminalBlockFace,
  TerminalBlockPlannedCableMode,
  TerminalBlockPort,
  TerminalBlockPortGroup,
} from './types';

const UNKNOWN_ENDPOINT: Endpoint = {
  type: 'unknown',
  id: null,
  label: 'Unknown',
};

export interface EndpointDisplayMetadata {
  endpointType: EndpointType;
  objectType: 'device' | 'terminalBlock' | 'external' | 'unknown';
  objectId: string | null;
  objectName: string;
  portLabel: string;
  face: TerminalBlockFace | null;
  category: Category | null;
  connectorType: ConnectorType | null;
}

export interface TerminalBlockPlannedCableResult {
  ok: true;
  project: ProjectRoot;
  ports: TerminalBlockPort[];
  cables: Cable[];
  updatedPortGroup: TerminalBlockPortGroup;
}

export interface TerminalBlockPlannedCableFailure {
  ok: false;
  project: ProjectRoot;
  errors: string[];
}

export function buildTerminalBlockPortLabel(
  terminalBlock: Pick<TerminalBlock, 'labelPrefix' | 'name'>,
  positionIndex: number,
  face: TerminalBlockFace,
): string {
  const prefix = terminalBlock.labelPrefix || terminalBlock.name;

  return `${prefix}-${String(positionIndex).padStart(2, '0')} ${face}`;
}

export function generateTerminalBlockPorts(
  terminalBlock: TerminalBlock,
  portGroup: TerminalBlockPortGroup,
): TerminalBlockPort[] {
  const ports: TerminalBlockPort[] = [];

  for (let offset = 0; offset < portGroup.positionCount; offset += 1) {
    const positionIndex = portGroup.startPosition + offset;

    for (const face of ['rear', 'front'] satisfies TerminalBlockFace[]) {
      ports.push({
        id: makeId('tb-port', `${portGroup.id}-${face}-${positionIndex}`),
        terminalBlockId: terminalBlock.id,
        portGroupId: portGroup.id,
        positionIndex,
        face,
        label: buildTerminalBlockPortLabel(terminalBlock, positionIndex, face),
        categoryId: portGroup.categoryId,
        connectorTypeId: portGroup.connectorTypeId,
      });
    }
  }

  return ports;
}

export function createPlannedCableForTerminalBlockPort(
  port: TerminalBlockPort,
  prefix: string,
  index: number,
  status: CableStatus = 'planned',
): Cable {
  const cableNumber = formatCableNumber(prefix, index);
  const tbEndpoint: Endpoint = {
    type: 'tb_port',
    id: port.id,
    label: port.label,
  };

  return {
    id: makeId('cable', cableNumber),
    number: cableNumber,
    prefix,
    index,
    status,
    sourceEndpoint: tbEndpoint,
    destinationEndpoint: UNKNOWN_ENDPOINT,
    labelTop: port.label,
    labelMiddle: cableNumber,
    labelBottom: '',
    notes: '',
  };
}

export function createPlannedCablesForTerminalBlockPorts(
  ports: TerminalBlockPort[],
  prefix: string,
  firstCableNumber: number,
  status: CableStatus = 'planned',
): Cable[] {
  return ports.map((port, offset) =>
    createPlannedCableForTerminalBlockPort(port, prefix, firstCableNumber + offset, status),
  );
}

export function createTerminalBlockPortGroupCabling(
  project: ProjectRoot,
  terminalBlock: TerminalBlock,
  portGroup: TerminalBlockPortGroup,
  firstCableNumber?: number,
): TerminalBlockPlannedCableResult | TerminalBlockPlannedCableFailure {
  const ports = generateTerminalBlockPorts(terminalBlock, portGroup);
  const faces = getFacesForPlannedCableMode(portGroup.plannedCableMode);

  if (faces.length === 0) {
    return {
      ok: true,
      project,
      ports,
      cables: [],
      updatedPortGroup: {
        ...portGroup,
        firstCableNumber: null,
        lastCableNumber: null,
      },
    };
  }

  const workingProject = structuredClone(project);
  let nextFirstCableNumber =
    firstCableNumber ?? getLedgerForPrefix(workingProject, portGroup.cablePrefix).nextSuggested;
  const cables: Cable[] = [];
  let firstAllocated: number | null = null;
  let lastAllocated: number | null = null;

  for (const face of faces) {
    const facePorts = ports
      .filter((port) => port.face === face)
      .sort((left, right) => left.positionIndex - right.positionIndex);
    const allocation = allocateCableRange(workingProject, {
      prefix: portGroup.cablePrefix,
      firstCableNumber: nextFirstCableNumber,
      count: facePorts.length,
      ownerType: 'terminalBlockPortGroup',
      ownerId: portGroup.id,
      reason: `Planned ${face} cables for ${terminalBlock.name} ${portGroup.name}`,
    });

    if (allocation.preview.errors.length > 0 || !allocation.allocatedRange) {
      return {
        ok: false,
        project,
        errors: allocation.preview.errors.map((error) => error.message),
      };
    }

    workingProject.numberingLedgers = allocation.project.numberingLedgers;
    cables.push(...createPlannedCablesForTerminalBlockPorts(facePorts, portGroup.cablePrefix, nextFirstCableNumber));
    firstAllocated = firstAllocated ?? nextFirstCableNumber;
    lastAllocated = nextFirstCableNumber + facePorts.length - 1;
    nextFirstCableNumber = lastAllocated + 1;
  }

  const updatedPortGroup: TerminalBlockPortGroup = {
    ...portGroup,
    firstCableNumber: firstAllocated,
    lastCableNumber: lastAllocated,
  };

  return {
    ok: true,
    project: {
      ...workingProject,
      terminalBlockPortGroups: mergeById(workingProject.terminalBlockPortGroups, [updatedPortGroup]),
      terminalBlockPorts: mergeById(workingProject.terminalBlockPorts, ports),
      cables: [...workingProject.cables, ...cables],
    },
    ports,
    cables,
    updatedPortGroup,
  };
}

export function resolveEndpointDisplay(project: ProjectRoot, endpoint: Endpoint): EndpointDisplayMetadata {
  if (endpoint.type === 'device_port' && endpoint.id) {
    const port = project.ports.find((candidate) => candidate.id === endpoint.id) ?? null;
    const device = port ? project.devices.find((candidate) => candidate.id === port.deviceId) ?? null : null;

    return {
      endpointType: endpoint.type,
      objectType: 'device',
      objectId: device?.id ?? null,
      objectName: device?.name ?? 'Missing device',
      portLabel: port?.label ?? endpoint.label,
      face: null,
      category: getCategory(project, port?.categoryId),
      connectorType: getConnectorType(project, port?.connectorTypeId),
    };
  }

  if (endpoint.type === 'tb_port' && endpoint.id) {
    const port = project.terminalBlockPorts.find((candidate) => candidate.id === endpoint.id) ?? null;
    const terminalBlock = port
      ? project.terminalBlocks.find((candidate) => candidate.id === port.terminalBlockId) ?? null
      : null;

    return {
      endpointType: endpoint.type,
      objectType: 'terminalBlock',
      objectId: terminalBlock?.id ?? null,
      objectName: terminalBlock?.name ?? 'Missing terminal block',
      portLabel: port?.label ?? endpoint.label,
      face: port?.face ?? null,
      category: getCategory(project, port?.categoryId),
      connectorType: getConnectorType(project, port?.connectorTypeId),
    };
  }

  return {
    endpointType: endpoint.type,
    objectType: endpoint.type === 'external' ? 'external' : 'unknown',
    objectId: endpoint.id,
    objectName: endpoint.label || (endpoint.type === 'external' ? 'External' : 'Unknown'),
    portLabel: endpoint.label,
    face: null,
    category: null,
    connectorType: null,
  };
}

export function findActiveCablesForEndpoint(project: ProjectRoot, endpoint: Endpoint): Cable[] {
  return findCablesForEndpoint(project, endpoint).filter((cable) => cable.status !== 'retired');
}

export function findRetiredCablesForEndpoint(project: ProjectRoot, endpoint: Endpoint): Cable[] {
  return findCablesForEndpoint(project, endpoint).filter((cable) => cable.status === 'retired');
}

export function findCablesForEndpoint(project: ProjectRoot, endpoint: Endpoint): Cable[] {
  if (!endpoint.id) {
    return [];
  }

  const endpointId = endpoint.id;

  return project.cables.filter(
    (cable) =>
      endpointMatches(cable.sourceEndpoint, endpoint.type, endpointId) ||
      endpointMatches(cable.destinationEndpoint, endpoint.type, endpointId),
  );
}

function getFacesForPlannedCableMode(mode: TerminalBlockPlannedCableMode): TerminalBlockFace[] {
  switch (mode) {
    case 'rear':
      return ['rear'];
    case 'front':
      return ['front'];
    case 'both':
      return ['rear', 'front'];
    case 'none':
      return [];
  }
}

function endpointMatches(endpoint: Endpoint, type: EndpointType, id: string): boolean {
  return endpoint.type === type && endpoint.id === id;
}

function getCategory(project: ProjectRoot, categoryId: string | undefined): Category | null {
  return project.settings.categories.find((category) => category.id === categoryId) ?? null;
}

function getConnectorType(project: ProjectRoot, connectorTypeId: string | undefined): ConnectorType | null {
  return project.settings.connectorTypes.find((connectorType) => connectorType.id === connectorTypeId) ?? null;
}

function mergeById<T extends { id: string }>(existing: T[], next: T[]): T[] {
  const ids = new Set(next.map((item) => item.id));

  return [...existing.filter((item) => !ids.has(item.id)), ...next];
}
