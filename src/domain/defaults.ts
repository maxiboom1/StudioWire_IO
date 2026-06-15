import type {
  CablePrefix,
  Category,
  ConnectorCompatibilityGroup,
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

export const DEFAULT_CONNECTOR_COMPATIBILITY_GROUPS: ConnectorCompatibilityGroup[] = [
  { id: 'group-video-sdi-coax', categoryId: 'category-video', name: 'SDI coax' },
  { id: 'group-video-hdmi', categoryId: 'category-video', name: 'HDMI' },
  { id: 'group-video-other', categoryId: 'category-video', name: 'Other' },
  { id: 'group-audio-analog-xlr', categoryId: 'category-audio', name: 'Analog XLR' },
  { id: 'group-audio-db25', categoryId: 'category-audio', name: 'DB25' },
  { id: 'group-audio-madi-coax', categoryId: 'category-audio', name: 'MADI coax' },
  { id: 'group-audio-madi-fiber', categoryId: 'category-audio', name: 'MADI fiber' },
  { id: 'group-audio-other', categoryId: 'category-audio', name: 'Other' },
  { id: 'group-network-rj45-copper', categoryId: 'category-network', name: 'RJ45 copper' },
  { id: 'group-network-sfp-cage', categoryId: 'category-network', name: 'SFP cage' },
  { id: 'group-network-fiber', categoryId: 'category-network', name: 'Fiber' },
  { id: 'group-network-other', categoryId: 'category-network', name: 'Other' },
  { id: 'group-reference-coax', categoryId: 'category-reference', name: 'Reference coax' },
  { id: 'group-reference-other', categoryId: 'category-reference', name: 'Other' },
  { id: 'group-rf-coax', categoryId: 'category-rf', name: 'RF coax' },
  { id: 'group-rf-other', categoryId: 'category-rf', name: 'Other' },
  { id: 'group-control-gpio', categoryId: 'category-control', name: 'GPIO' },
  { id: 'group-control-other', categoryId: 'category-control', name: 'Other' },
];

export const DEFAULT_CONNECTOR_TYPES: ConnectorType[] = [
  { id: 'connector-bnc', name: 'BNC', categoryId: 'category-video', compatibilityGroupId: 'group-video-sdi-coax' },
  { id: 'connector-sdi-din', name: 'SDI DIN', categoryId: 'category-video', compatibilityGroupId: 'group-video-sdi-coax' },
  { id: 'connector-hdmi', name: 'HDMI', categoryId: 'category-video', compatibilityGroupId: 'group-video-hdmi' },
  { id: 'connector-video-other', name: 'Other', categoryId: 'category-video', compatibilityGroupId: 'group-video-other' },
  { id: 'connector-xlr', name: 'XLR', categoryId: 'category-audio', compatibilityGroupId: 'group-audio-analog-xlr' },
  { id: 'connector-db25', name: 'DB25', categoryId: 'category-audio', compatibilityGroupId: 'group-audio-db25' },
  { id: 'connector-madi-bnc', name: 'MADI BNC', categoryId: 'category-audio', compatibilityGroupId: 'group-audio-madi-coax' },
  { id: 'connector-madi-fiber', name: 'MADI Fiber', categoryId: 'category-audio', compatibilityGroupId: 'group-audio-madi-fiber' },
  { id: 'connector-audio-other', name: 'Other', categoryId: 'category-audio', compatibilityGroupId: 'group-audio-other' },
  { id: 'connector-rj45', name: 'RJ45', categoryId: 'category-network', compatibilityGroupId: 'group-network-rj45-copper' },
  { id: 'connector-sfp', name: 'SFP', categoryId: 'category-network', compatibilityGroupId: 'group-network-sfp-cage' },
  { id: 'connector-fiber', name: 'Fiber', categoryId: 'category-network', compatibilityGroupId: 'group-network-fiber' },
  { id: 'connector-network-other', name: 'Other', categoryId: 'category-network', compatibilityGroupId: 'group-network-other' },
  { id: 'connector-reference-bnc', name: 'BNC', categoryId: 'category-reference', compatibilityGroupId: 'group-reference-coax' },
  { id: 'connector-reference-other', name: 'Other', categoryId: 'category-reference', compatibilityGroupId: 'group-reference-other' },
  { id: 'connector-rf-bnc', name: 'BNC', categoryId: 'category-rf', compatibilityGroupId: 'group-rf-coax' },
  { id: 'connector-rf-other', name: 'Other', categoryId: 'category-rf', compatibilityGroupId: 'group-rf-other' },
  { id: 'connector-gpio', name: 'GPIO', categoryId: 'category-control', compatibilityGroupId: 'group-control-gpio' },
  { id: 'connector-control-other', name: 'Other', categoryId: 'category-control', compatibilityGroupId: 'group-control-other' },
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
  connectorCompatibilityGroups: DEFAULT_CONNECTOR_COMPATIBILITY_GROUPS,
  connectorTypes: DEFAULT_CONNECTOR_TYPES,
  cablePrefixes: DEFAULT_CABLE_PREFIXES,
  rackDefaults: DEFAULT_RACK_DEFAULTS,
  labelRules: DEFAULT_LABEL_RULES,
};

export function createDefaultSettings(): Settings {
  return structuredClone(DEFAULT_SETTINGS);
}
