import { STUDIOWIRE_CURRENT_VERSION, type StudioWireSchemaVersion } from './version';

export const STUDIOWIRE_SCHEMA_VERSION = STUDIOWIRE_CURRENT_VERSION;

export type SchemaVersion = StudioWireSchemaVersion;

export type ProjectStatus = 'draft' | 'approved' | 'as_built';
export type RackNumberingDirection = 'bottom_to_top' | 'top_to_bottom';
export type DeviceKind = 'device' | 'terminal_block';
export type DeviceMountType = 'rack' | 'non_rack' | 'virtual';
export type PortDirection = 'input' | 'output' | 'bidirectional' | 'rear' | 'front';
export type CableStatus = 'planned' | 'connected' | 'retired';
export type ObjectStatus = 'planned' | 'connected' | 'retired';
export type NumberingRangeStatus = 'allocated' | 'reserved_gap' | 'retired';
export type EndpointType = 'device_port' | 'tb_port' | 'external' | 'unknown';
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ProjectRoot {
  schemaVersion: SchemaVersion;
  project: ProjectInfo;
  settings: Settings;
  locations: Location[];
  racks: Rack[];
  devices: Device[];
  portGroups: PortGroup[];
  ports: Port[];
  cables: Cable[];
  numberingLedgers: NumberingLedger[];
  validationIssues: ValidationIssue[];
  changeLog: ChangeLogEntry[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  customer: string;
  revision: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Settings {
  categories: Category[];
  connectorTypes: ConnectorType[];
  categoryConnectorAssignments: CategoryConnectorAssignment[];
  connectorCompatibilityGroups: ConnectorCompatibilityGroup[];
  connectorCompatibilityGroupMembers: ConnectorCompatibilityGroupMember[];
  cablePrefixes: CablePrefix[];
  rackDefaults: RackDefaults;
  labelRules: LabelRules;
}

export interface Category {
  id: string;
  name: string;
  defaultCablePrefix: string;
}

export interface ConnectorType {
  id: string;
  name: string;
}

export interface CategoryConnectorAssignment {
  id: string;
  categoryId: string;
  connectorTypeId: string;
}

export interface ConnectorCompatibilityGroup {
  id: string;
  categoryId: string;
  name: string;
}

export interface ConnectorCompatibilityGroupMember {
  id: string;
  groupId: string;
  connectorTypeId: string;
}

export interface CablePrefix {
  id: string;
  prefix: string;
  name: string;
}

export interface RackDefaults {
  heightRu: number;
  numberingDirection: RackNumberingDirection;
}

export interface LabelRules {
  cableNumberFormat: string;
  cableNumberPadding: number;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface Rack {
  id: string;
  locationId: string;
  name: string;
  heightRu: number;
  numberingDirection: RackNumberingDirection;
}

export interface Device {
  id: string;
  name: string;
  kind: DeviceKind;
  code?: string;
  manufacturer?: string;
  model?: string;
  categoryId: string;
  locationId: string | null;
  role?: string;
  labelPrefix: string;
  mountType: DeviceMountType;
  rackId: string | null;
  rackSizeRu: number | null;
  rackBottomRu: number | null;
  status: ObjectStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortGroup {
  id: string;
  deviceId: string;
  name: string;
  direction: PortDirection;
  categoryId: string;
  connectorTypeId: string;
  count: number;
  portLabelPattern: string;
  cablePrefix: string;
  firstCableNumber: number | null;
  lastCableNumber: number | null;
  numberingRangeId: string | null;
  createPlannedCables: boolean;
  locked: boolean;
}

export interface Port {
  id: string;
  deviceId: string;
  portGroupId: string;
  index: number;
  name: string;
  label: string;
  direction: PortDirection;
  categoryId: string;
  connectorTypeId: string;
  plannedCableId: string | null;
  notes: string;
}

export interface Cable {
  id: string;
  number: string;
  prefix: string;
  index: number;
  status: CableStatus;
  sideAEndpoint: Endpoint;
  sideBEndpoint: Endpoint;
  labelTop: string;
  labelMiddle: string;
  labelBottom: string;
  notes: string;
}

export interface NumberingLedger {
  prefix: string;
  nextSuggested: number;
  ranges: NumberingRange[];
}

export interface NumberingRange {
  id: string;
  prefix: string;
  from: number;
  to: number;
  status: NumberingRangeStatus;
  ownerType: string;
  ownerId: string;
  reason: string;
  createdAt: string;
}

export interface Endpoint {
  type: EndpointType;
  id: string | null;
  label: string;
}

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  objectType: string;
  objectId: string;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  message: string;
  author: string;
}
