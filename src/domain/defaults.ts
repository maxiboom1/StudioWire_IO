import type {
  CablePrefix,
  CategoryConnectorAssignment,
  Category,
  ConnectorCompatibilityGroup,
  ConnectorCompatibilityGroupMember,
  ConnectorType,
  LabelRules,
  RackDefaults,
  Settings,
} from './types';

export const DEFAULT_CABLE_NUMBER_PADDING = 4;
export const DEFAULT_CABLE_NUMBER_FORMAT = 'PREFIX-0001';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'category-video', name: 'Video', defaultCablePrefix: 'V' },
  { id: 'category-audio', name: 'Audio', defaultCablePrefix: 'A' },
  { id: 'category-network', name: 'Network', defaultCablePrefix: 'N' },
  { id: 'category-reference', name: 'Reference', defaultCablePrefix: 'R' },
  { id: 'category-rf', name: 'RF', defaultCablePrefix: 'RF' },
  { id: 'category-control', name: 'Control', defaultCablePrefix: 'C' },
];

export const DEFAULT_CONNECTOR_TYPES: ConnectorType[] = [
  { id: 'connector-bnc', name: 'BNC' },
  { id: 'connector-micro-bnc', name: 'Micro BNC' },
  { id: 'connector-minidin', name: 'MiniDIN' },
  { id: 'connector-sdi-din', name: 'SDI DIN' },
  { id: 'connector-hdmi', name: 'HDMI' },
  { id: 'connector-xlr', name: 'XLR' },
  { id: 'connector-pl', name: 'PL' },
  { id: 'connector-rca', name: 'RCA' },
  { id: 'connector-rj45', name: 'RJ45' },
  { id: 'connector-db25', name: 'DB25' },
  { id: 'connector-madi-bnc', name: 'MADI BNC' },
  { id: 'connector-madi-fiber', name: 'MADI Fiber' },
  { id: 'connector-sfp', name: 'SFP' },
  { id: 'connector-fiber', name: 'Fiber' },
  { id: 'connector-gpio', name: 'GPIO' },
  { id: 'connector-other', name: 'Other' },
];

export const DEFAULT_CATEGORY_CONNECTOR_ASSIGNMENTS: CategoryConnectorAssignment[] = [
  { id: 'assignment-video-bnc', categoryId: 'category-video', connectorTypeId: 'connector-bnc' },
  { id: 'assignment-video-micro-bnc', categoryId: 'category-video', connectorTypeId: 'connector-micro-bnc' },
  { id: 'assignment-video-minidin', categoryId: 'category-video', connectorTypeId: 'connector-minidin' },
  { id: 'assignment-video-sdi-din', categoryId: 'category-video', connectorTypeId: 'connector-sdi-din' },
  { id: 'assignment-video-hdmi', categoryId: 'category-video', connectorTypeId: 'connector-hdmi' },
  { id: 'assignment-audio-bnc', categoryId: 'category-audio', connectorTypeId: 'connector-bnc' },
  { id: 'assignment-audio-xlr', categoryId: 'category-audio', connectorTypeId: 'connector-xlr' },
  { id: 'assignment-audio-pl', categoryId: 'category-audio', connectorTypeId: 'connector-pl' },
  { id: 'assignment-audio-rca', categoryId: 'category-audio', connectorTypeId: 'connector-rca' },
  { id: 'assignment-audio-rj45', categoryId: 'category-audio', connectorTypeId: 'connector-rj45' },
  { id: 'assignment-audio-db25', categoryId: 'category-audio', connectorTypeId: 'connector-db25' },
  { id: 'assignment-audio-madi-bnc', categoryId: 'category-audio', connectorTypeId: 'connector-madi-bnc' },
  { id: 'assignment-audio-madi-fiber', categoryId: 'category-audio', connectorTypeId: 'connector-madi-fiber' },
  { id: 'assignment-network-rj45', categoryId: 'category-network', connectorTypeId: 'connector-rj45' },
  { id: 'assignment-network-sfp', categoryId: 'category-network', connectorTypeId: 'connector-sfp' },
  { id: 'assignment-network-fiber', categoryId: 'category-network', connectorTypeId: 'connector-fiber' },
  { id: 'assignment-reference-bnc', categoryId: 'category-reference', connectorTypeId: 'connector-bnc' },
  { id: 'assignment-rf-bnc', categoryId: 'category-rf', connectorTypeId: 'connector-bnc' },
  { id: 'assignment-control-gpio', categoryId: 'category-control', connectorTypeId: 'connector-gpio' },
  { id: 'assignment-control-rj45', categoryId: 'category-control', connectorTypeId: 'connector-rj45' },
];

export const DEFAULT_CONNECTOR_COMPATIBILITY_GROUPS: ConnectorCompatibilityGroup[] = [
  { id: 'group-video-sdi-coax', categoryId: 'category-video', name: 'Video connector group' },
  { id: 'group-audio-analog', categoryId: 'category-audio', name: 'Audio connector group' },
];

export const DEFAULT_CONNECTOR_COMPATIBILITY_GROUP_MEMBERS: ConnectorCompatibilityGroupMember[] = [
  { id: 'member-video-sdi-bnc', groupId: 'group-video-sdi-coax', connectorTypeId: 'connector-bnc' },
  { id: 'member-video-sdi-micro-bnc', groupId: 'group-video-sdi-coax', connectorTypeId: 'connector-micro-bnc' },
  { id: 'member-video-sdi-minidin', groupId: 'group-video-sdi-coax', connectorTypeId: 'connector-minidin' },
  { id: 'member-video-sdi-din', groupId: 'group-video-sdi-coax', connectorTypeId: 'connector-sdi-din' },
  { id: 'member-audio-xlr', groupId: 'group-audio-analog', connectorTypeId: 'connector-xlr' },
  { id: 'member-audio-pl', groupId: 'group-audio-analog', connectorTypeId: 'connector-pl' },
  { id: 'member-audio-rca', groupId: 'group-audio-analog', connectorTypeId: 'connector-rca' },
];

export const DEFAULT_CABLE_PREFIXES: CablePrefix[] = [
  { id: 'prefix-video', prefix: 'V', name: 'Video' },
  { id: 'prefix-audio', prefix: 'A', name: 'Audio' },
  { id: 'prefix-network', prefix: 'N', name: 'Network' },
  { id: 'prefix-reference', prefix: 'R', name: 'Reference' },
  { id: 'prefix-rf', prefix: 'RF', name: 'RF' },
  { id: 'prefix-control', prefix: 'C', name: 'Control' },
];

export const DEFAULT_RACK_DEFAULTS: RackDefaults = {
  heightRu: 42,
  numberingDirection: 'bottom_to_top',
};

export const DEFAULT_LABEL_RULES: LabelRules = {
  cableNumberFormat: DEFAULT_CABLE_NUMBER_FORMAT,
  cableNumberPadding: DEFAULT_CABLE_NUMBER_PADDING,
};

export const DEFAULT_SETTINGS: Settings = {
  categories: DEFAULT_CATEGORIES,
  connectorTypes: DEFAULT_CONNECTOR_TYPES,
  categoryConnectorAssignments: DEFAULT_CATEGORY_CONNECTOR_ASSIGNMENTS,
  connectorCompatibilityGroups: DEFAULT_CONNECTOR_COMPATIBILITY_GROUPS,
  connectorCompatibilityGroupMembers: DEFAULT_CONNECTOR_COMPATIBILITY_GROUP_MEMBERS,
  cablePrefixes: DEFAULT_CABLE_PREFIXES,
  rackDefaults: DEFAULT_RACK_DEFAULTS,
  labelRules: DEFAULT_LABEL_RULES,
};

export function createDefaultSettings(): Settings {
  return structuredClone(DEFAULT_SETTINGS);
}
