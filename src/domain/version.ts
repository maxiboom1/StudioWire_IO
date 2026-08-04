export const STUDIOWIRE_CURRENT_VERSION = '0.2.9.04' as const;

export const SUPPORTED_SCHEMA_VERSIONS = [
  STUDIOWIRE_CURRENT_VERSION,
  '0.2.9.03',
  '0.2.9.02',
  '0.2.9.01',
  '0.2.9.00',
  '0.2.8.25',
] as const;

export type StudioWireSchemaVersion = (typeof SUPPORTED_SCHEMA_VERSIONS)[number];
