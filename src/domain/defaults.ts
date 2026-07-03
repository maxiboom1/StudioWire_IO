import type {
  CablePrefix,
  CategoryConnectorAssignment,
  Category,
  ConnectorCompatibilityGroup,
  ConnectorCompatibilityGroupMember,
  ConnectorIconKey,
  ConnectorType,
  LabelRules,
  RackDefaults,
  Settings,
} from './types';

export const DEFAULT_CABLE_NUMBER_PADDING = 4;
export const DEFAULT_CABLE_NUMBER_FORMAT = 'PREFIX-0001';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'category-video', name: 'Video', defaultCablePrefix: 'V', color: '#2563EB' },
  { id: 'category-audio', name: 'Audio', defaultCablePrefix: 'A', color: '#DC2626' },
  { id: 'category-network', name: 'Network', defaultCablePrefix: 'N', color: '#059669' },
  { id: 'category-reference', name: 'Reference', defaultCablePrefix: 'R', color: '#7C3AED' },
  { id: 'category-rf', name: 'RF', defaultCablePrefix: 'RF', color: '#D97706' },
  { id: 'category-control', name: 'Control', defaultCablePrefix: 'C', color: '#475569' },
];

const DEFAULT_CATEGORY_COLOR_PALETTE = ['#2563EB', '#DC2626', '#059669', '#7C3AED', '#D97706', '#475569'];

export function getDefaultCategoryColor(index: number): string {
  return DEFAULT_CATEGORY_COLOR_PALETTE[Math.max(0, index) % DEFAULT_CATEGORY_COLOR_PALETTE.length];
}

export const DEFAULT_CONNECTOR_TYPES: ConnectorType[] = [
  { id: 'connector-bnc', name: 'BNC', iconKey: 'bnc' },
  { id: 'connector-micro-bnc', name: 'Micro BNC', iconKey: 'bnc' },
  { id: 'connector-minidin', name: 'MiniDIN', iconKey: 'generic' },
  { id: 'connector-sdi-din', name: 'SDI DIN', iconKey: 'bnc' },
  { id: 'connector-hdmi', name: 'HDMI', iconKey: 'hdmi' },
  { id: 'connector-xlr', name: 'XLR', iconKey: 'xlr' },
  { id: 'connector-pl', name: 'PL', iconKey: 'generic' },
  { id: 'connector-rca', name: 'RCA', iconKey: 'generic' },
  { id: 'connector-rj45', name: 'RJ45', iconKey: 'rj45' },
  { id: 'connector-db25', name: 'DB25', iconKey: 'db25' },
  { id: 'connector-madi-bnc', name: 'MADI BNC', iconKey: 'bnc' },
  { id: 'connector-madi-fiber', name: 'MADI Fiber', iconKey: 'fiber' },
  { id: 'connector-sfp', name: 'SFP', iconKey: 'sfp' },
  { id: 'connector-fiber', name: 'Fiber', iconKey: 'fiber' },
  { id: 'connector-gpio', name: 'GPIO', iconKey: 'generic' },
  { id: 'connector-other', name: 'Other', iconKey: 'generic' },
];

export function getDefaultConnectorIconKey(name: string): ConnectorIconKey {
  const normalizedName = name.trim().toLowerCase();

  if (normalizedName.includes('bnc') || normalizedName.includes('sdi din')) {
    return 'bnc';
  }

  if (normalizedName.includes('xlr')) {
    return 'xlr';
  }

  if (normalizedName.includes('rj45')) {
    return 'rj45';
  }

  if (normalizedName.includes('fiber')) {
    return 'fiber';
  }

  if (normalizedName.includes('sfp')) {
    return 'sfp';
  }

  if (normalizedName.includes('hdmi')) {
    return 'hdmi';
  }

  if (normalizedName.includes('db25')) {
    return 'db25';
  }

  return 'generic';
}

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
  {
    id: 'assignment-audio-madi-fiber',
    categoryId: 'category-audio',
    connectorTypeId: 'connector-madi-fiber',
  },
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
  {
    id: 'member-video-sdi-micro-bnc',
    groupId: 'group-video-sdi-coax',
    connectorTypeId: 'connector-micro-bnc',
  },
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
  heightRu: 28,
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
