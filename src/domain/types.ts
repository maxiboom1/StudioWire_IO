import { STUDIOWIRE_CURRENT_VERSION, type StudioWireSchemaVersion } from './version';

export const STUDIOWIRE_SCHEMA_VERSION = STUDIOWIRE_CURRENT_VERSION;

export type SchemaVersion = StudioWireSchemaVersion;

export const PROJECT_STATUS_VALUES = ['draft', 'approved', 'as_built'] as const;
export const RACK_NUMBERING_DIRECTION_VALUES = ['bottom_to_top', 'top_to_bottom'] as const;
export const DEVICE_KIND_VALUES = ['device', 'terminal_block'] as const;
export const DEVICE_MOUNT_TYPE_VALUES = ['rack', 'non_rack', 'virtual'] as const;
export const PORT_DIRECTION_VALUES = ['input', 'output', 'bidirectional', 'rear', 'front'] as const;
export const CABLE_STATUS_VALUES = ['planned', 'connected', 'retired'] as const;
export const OBJECT_STATUS_VALUES = ['planned', 'connected'] as const;
export const NUMBERING_RANGE_STATUS_VALUES = ['allocated', 'reserved_gap'] as const;
export const ENDPOINT_TYPE_VALUES = ['device_port', 'tb_port', 'external', 'unknown'] as const;
export const VALIDATION_SEVERITY_VALUES = ['error', 'warning', 'info'] as const;
export const VIEW_PAGE_SIZE_VALUES = ['a4', 'a3'] as const;
export const VIEW_ORIENTATION_VALUES = ['portrait', 'landscape'] as const;
export const VIEW_SOURCE_TYPE_VALUES = ['device', 'rack'] as const;
export const VIEW_LINE_COLOR_VALUES = [
  'black',
  'red',
  'blue',
  'green',
  'orange',
  'purple',
  'gray',
  'teal',
] as const;
export const VIEW_LINE_WIDTH_VALUES = ['hairline', 'thin', 'medium', 'wide'] as const;
export const VIEW_LINE_LABEL_ORIENTATION_VALUES = ['horizontal', 'vertical'] as const;
export const VIEW_ANNOTATION_KIND_VALUES = ['text', 'group', 'port_range'] as const;
export const VIEW_TEXT_SIZE_VALUES = ['small', 'medium', 'large'] as const;
export const CONNECTOR_ICON_KEY_VALUES = [
  'bnc',
  'xlr',
  'rj45',
  'fiber',
  'sfp',
  'hdmi',
  'db25',
  'generic',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];
export type RackNumberingDirection = (typeof RACK_NUMBERING_DIRECTION_VALUES)[number];
export type DeviceKind = (typeof DEVICE_KIND_VALUES)[number];
export type DeviceMountType = (typeof DEVICE_MOUNT_TYPE_VALUES)[number];
export type PortDirection = (typeof PORT_DIRECTION_VALUES)[number];
export type CableStatus = (typeof CABLE_STATUS_VALUES)[number];
export type ObjectStatus = (typeof OBJECT_STATUS_VALUES)[number];
export type NumberingRangeStatus = (typeof NUMBERING_RANGE_STATUS_VALUES)[number];
export type EndpointType = (typeof ENDPOINT_TYPE_VALUES)[number];
export type ValidationSeverity = (typeof VALIDATION_SEVERITY_VALUES)[number];
export type ViewPageSize = (typeof VIEW_PAGE_SIZE_VALUES)[number];
export type ViewOrientation = (typeof VIEW_ORIENTATION_VALUES)[number];
export type ViewSourceType = (typeof VIEW_SOURCE_TYPE_VALUES)[number];
export type ViewLineColor = (typeof VIEW_LINE_COLOR_VALUES)[number];
export type ViewLineWidth = (typeof VIEW_LINE_WIDTH_VALUES)[number];
export type ViewLineLabelOrientation = (typeof VIEW_LINE_LABEL_ORIENTATION_VALUES)[number];
export type ViewAnnotationKind = (typeof VIEW_ANNOTATION_KIND_VALUES)[number];
export type ViewTextSize = (typeof VIEW_TEXT_SIZE_VALUES)[number];
export type ConnectorIconKey = (typeof CONNECTOR_ICON_KEY_VALUES)[number];

export interface ProjectRoot {
  schemaVersion: SchemaVersion;
  project: ProjectInfo;
  settings: Settings;
  locations: Location[];
  subLocations: SubLocation[];
  racks: Rack[];
  views: ProjectView[];
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
  color: string;
}

export interface ConnectorType {
  id: string;
  name: string;
  iconKey: ConnectorIconKey;
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
  description: string;
}

export interface SubLocation {
  id: string;
  locationId: string;
  name: string;
  description: string;
}

export interface Rack {
  id: string;
  locationId: string;
  subLocationId: string | null;
  name: string;
  heightRu: number;
  numberingDirection: RackNumberingDirection;
}

export interface ProjectView {
  id: string;
  name: string;
  description: string;
  pageSize: ViewPageSize;
  orientation: ViewOrientation;
  placements: ViewPlacement[];
  lines: ViewLine[];
  annotations: ViewAnnotation[];
}

export interface ViewPlacement {
  id: string;
  sourceType: ViewSourceType;
  sourceId: string;
  xMm: number;
  yMm: number;
  scale: number;
  labelOverride: string | null;
}

export interface ViewLine {
  id: string;
  from: ViewLineEndpoint;
  to: ViewLineEndpoint;
  label: string;
  waypoints: ViewPoint[];
  color: ViewLineColor;
  width: ViewLineWidth;
  labelOrientation: ViewLineLabelOrientation;
  labelPosition: number;
}

export type ViewLineEndpoint =
  | { kind: 'port'; placementId: string; portId: string }
  | { kind: 'port_range'; placementId: string; annotationId: string };

export interface ViewPoint {
  xMm: number;
  yMm: number;
}

export type ViewAnnotation = ViewTextAnnotation | ViewGroupAnnotation | ViewPortRangeAnnotation;

export interface ViewTextAnnotation {
  id: string;
  kind: 'text';
  xMm: number;
  yMm: number;
  widthMm: number;
  text: string;
  size: ViewTextSize;
}

export interface ViewGroupAnnotation {
  id: string;
  kind: 'group';
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  label: string;
}

export interface ViewPortRangeAnnotation {
  id: string;
  kind: 'port_range';
  placementId: string;
  side: 'left' | 'right';
  startPortId: string;
  endPortId: string;
  label: string;
}

export interface Device {
  id: string;
  name: string;
  kind: DeviceKind;
  code?: string;
  manufacturer?: string;
  model?: string;
  categoryId: string;
  locationId: string;
  subLocationId: string | null;
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
  colorOverride: string | null;
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
