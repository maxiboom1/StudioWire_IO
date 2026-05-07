import type {
  CablePrefix,
  Category,
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
  { id: 'connector-xlr', name: 'XLR' },
  { id: 'connector-rj45', name: 'RJ45' },
  { id: 'connector-sfp', name: 'SFP' },
  { id: 'connector-fiber', name: 'Fiber' },
  { id: 'connector-hdmi', name: 'HDMI' },
  { id: 'connector-sdi-din', name: 'SDI DIN' },
  { id: 'connector-db25', name: 'DB25' },
  { id: 'connector-madi-bnc', name: 'MADI BNC' },
  { id: 'connector-madi-fiber', name: 'MADI Fiber' },
  { id: 'connector-gpio', name: 'GPIO' },
  { id: 'connector-other', name: 'Other' },
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
  cablePrefixes: DEFAULT_CABLE_PREFIXES,
  rackDefaults: DEFAULT_RACK_DEFAULTS,
  labelRules: DEFAULT_LABEL_RULES,
};

export function createDefaultSettings(): Settings {
  return structuredClone(DEFAULT_SETTINGS);
}
