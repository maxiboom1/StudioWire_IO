export const STUDIOWIRE_CURRENT_VERSION = '0.2.7.2' as const;

export const SUPPORTED_SCHEMA_VERSIONS = [
  STUDIOWIRE_CURRENT_VERSION,
  '0.2.7.1',
  '0.2.7.0',
  '0.2.6.0',
  '0.2.5.1',
  '0.2.4.1',
  '0.1.0',
] as const;

export type StudioWireSchemaVersion = (typeof SUPPORTED_SCHEMA_VERSIONS)[number];
