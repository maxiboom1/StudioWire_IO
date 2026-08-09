import { createDefaultSettings, DEFAULT_RACK_DEFAULTS } from './defaults';
import { makeId, makeIndexedId, makeUniqueId, nowIso } from './id';
import { DEFAULT_IO_PORT_LABEL_PATTERN, formatPortLabel } from './portLabels';
import { createLinkedPlannedCablesForPorts } from './plannedCables';
import { STUDIOWIRE_SCHEMA_VERSION } from './types';
import type {
  Cable,
  CableStatus,
  Device,
  DeviceMountType,
  Location,
  NumberingLedger,
  NumberingRange,
  ObjectStatus,
  Port,
  PortDirection,
  PortGroup,
  ProjectInfo,
  ProjectRoot,
  ProjectStatus,
  Rack,
  RackNumberingDirection,
  SubLocation,
} from './types';

export interface ProjectInfoInput {
  id?: string;
  name: string;
  customer?: string;
  revision?: string;
  status?: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export function createProjectInfo(input: ProjectInfoInput): ProjectInfo {
  const timestamp = nowIso();

  return {
    id: input.id ?? makeUniqueId('project', input.name),
    name: input.name,
    customer: input.customer ?? '',
    revision: input.revision ?? '0.1',
    status: input.status ?? 'draft',
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
    createdBy: input.createdBy ?? 'local',
    updatedBy: input.updatedBy ?? 'local',
  };
}

export function createEmptyProject(input: ProjectInfoInput): ProjectRoot {
  const project = createProjectInfo(input);

  return {
    schemaVersion: STUDIOWIRE_SCHEMA_VERSION,
    project,
    settings: createDefaultSettings(),
    locations: [],
    subLocations: [],
    racks: [],
    views: [],
    devices: [],
    portGroups: [],
    ports: [],
    cables: [],
    numberingLedgers: [],
    validationIssues: [],
    changeLog: [
      {
        id: makeId('change', `${project.id}-created`),
        timestamp: project.createdAt,
        message: 'Project created',
        author: project.createdBy,
      },
    ],
  };
}

export interface LocationInput {
  id?: string;
  name: string;
  description?: string;
}

export function createLocation(input: LocationInput): Location {
  return {
    id: input.id ?? makeUniqueId('location', input.name),
    name: input.name,
    description: input.description ?? '',
  };
}

export interface SubLocationInput {
  id?: string;
  locationId: string;
  name: string;
  description?: string;
}

export function createSubLocation(input: SubLocationInput): SubLocation {
  return {
    id: input.id ?? makeUniqueId('sub-location', `${input.locationId}-${input.name}`),
    locationId: input.locationId,
    name: input.name,
    description: input.description ?? '',
  };
}

export interface RackInput {
  id?: string;
  locationId: string;
  subLocationId?: string | null;
  name: string;
  heightRu?: number;
  numberingDirection?: RackNumberingDirection;
}

export function createRack(input: RackInput): Rack {
  return {
    id: input.id ?? makeUniqueId('rack', input.name),
    locationId: input.locationId,
    subLocationId: input.subLocationId ?? null,
    name: input.name,
    heightRu: input.heightRu ?? DEFAULT_RACK_DEFAULTS.heightRu,
    numberingDirection: input.numberingDirection ?? 'bottom_to_top',
  };
}

export interface DeviceInput {
  id?: string;
  name: string;
  code?: string;
  manufacturer?: string;
  model?: string;
  categoryId: string;
  locationId: string;
  subLocationId?: string | null;
  role?: string;
  labelPrefix?: string;
  mountType?: DeviceMountType;
  rackId?: string | null;
  rackSizeRu?: number | null;
  rackBottomRu?: number | null;
  status?: ObjectStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createDevice(input: DeviceInput): Device {
  const timestamp = nowIso();

  return {
    id: input.id ?? makeUniqueId('device', input.name),
    kind: 'device',
    name: input.name,
    code: input.code ?? '',
    manufacturer: input.manufacturer ?? '',
    model: input.model ?? '',
    categoryId: input.categoryId,
    locationId: input.locationId,
    subLocationId: input.subLocationId ?? null,
    role: input.role ?? '',
    labelPrefix: input.labelPrefix ?? input.code ?? '',
    mountType: input.mountType ?? 'non_rack',
    rackId: input.rackId ?? null,
    rackSizeRu: input.rackSizeRu ?? null,
    rackBottomRu: input.rackBottomRu ?? null,
    status: input.status ?? 'planned',
    notes: input.notes ?? '',
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
  };
}

export interface TerminalBlockInput {
  id?: string;
  name: string;
  categoryId: string;
  locationId: string;
  subLocationId?: string | null;
  labelPrefix?: string;
  rackId: string;
  rackBottomRu: number;
  status?: ObjectStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createTerminalBlock(input: TerminalBlockInput): Device {
  const timestamp = nowIso();

  return {
    id: input.id ?? makeUniqueId('terminal-block', input.name),
    name: input.name,
    kind: 'terminal_block',
    categoryId: input.categoryId,
    locationId: input.locationId,
    subLocationId: input.subLocationId ?? null,
    labelPrefix: input.labelPrefix ?? input.name,
    mountType: 'rack',
    rackId: input.rackId,
    rackSizeRu: 1,
    rackBottomRu: input.rackBottomRu,
    status: input.status ?? 'planned',
    notes: input.notes ?? '',
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
  };
}

export interface PortGroupInput {
  id?: string;
  deviceId: string;
  name: string;
  direction: PortDirection;
  categoryId: string;
  connectorTypeId: string;
  count: number;
  portLabelPattern?: string;
  devicePortLabelPattern?: string | null;
  devicePortLabelMode?: PortGroup['devicePortLabelMode'];
  cablePrefix: string;
  firstCableNumber?: number | null;
  lastCableNumber?: number | null;
  numberingRangeId?: string | null;
  createPlannedCables?: boolean;
  locked?: boolean;
  colorOverride?: string | null;
}

export function createPortGroup(input: PortGroupInput): PortGroup {
  const id = input.id ?? makeId('port-group', `${input.deviceId}-${input.name}`);

  return {
    id,
    deviceId: input.deviceId,
    name: input.name,
    direction: input.direction,
    categoryId: input.categoryId,
    connectorTypeId: input.connectorTypeId,
    count: input.count,
    portLabelPattern: input.portLabelPattern ?? DEFAULT_IO_PORT_LABEL_PATTERN,
    devicePortLabelPattern: input.devicePortLabelPattern ?? null,
    devicePortLabelMode: input.devicePortLabelMode ?? 'pattern',
    cablePrefix: input.cablePrefix,
    firstCableNumber: input.firstCableNumber ?? null,
    lastCableNumber: input.lastCableNumber ?? null,
    numberingRangeId: input.numberingRangeId ?? null,
    createPlannedCables: input.createPlannedCables ?? false,
    locked: input.locked ?? false,
    colorOverride: input.colorOverride ?? null,
  };
}

export function createPortsForGroup(portGroup: PortGroup, deviceLabelPrefix = ''): Port[] {
  return Array.from({ length: portGroup.count }, (_, offset) => {
    const index = offset + 1;

    return {
      id: makeIndexedId(`${portGroup.id}-port`, index),
      deviceId: portGroup.deviceId,
      portGroupId: portGroup.id,
      index,
      name: `${portGroup.name} ${index}`,
      label: formatPortLabel(
        portGroup.portLabelPattern,
        deviceLabelPrefix || portGroup.name,
        index,
        portGroup.name,
      ),
      devicePortLabelOverride: null,
      direction: portGroup.direction,
      categoryId: portGroup.categoryId,
      connectorTypeId: portGroup.connectorTypeId,
      plannedCableId: null,
      notes: '',
    };
  });
}

export interface PlannedCablesInput {
  portGroup: PortGroup;
  ports: Port[];
  status?: CableStatus;
}

export function createPlannedCablesForPorts(input: PlannedCablesInput): Cable[] {
  return createLinkedPlannedCablesForPortGroup(input).cables;
}

export function createLinkedPlannedCablesForPortGroup(input: PlannedCablesInput): {
  ports: Port[];
  cables: Cable[];
} {
  const { portGroup, ports } = input;

  if (!portGroup.createPlannedCables || portGroup.firstCableNumber === null) {
    return { ports, cables: [] };
  }

  return createLinkedPlannedCablesForPorts(
    ports,
    portGroup.cablePrefix,
    portGroup.firstCableNumber,
    input.status ?? 'planned',
  );
}

export interface NumberingLedgerInput {
  prefix: string;
  nextSuggested: number;
  ranges?: NumberingRange[];
}

export function createNumberingLedger(input: NumberingLedgerInput): NumberingLedger {
  return {
    prefix: input.prefix,
    nextSuggested: input.nextSuggested,
    ranges: input.ranges ?? [],
  };
}
