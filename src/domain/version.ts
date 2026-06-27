export const STUDIOWIRE_CURRENT_VERSION = '0.2.8.7' as const;

export const SUPPORTED_SCHEMA_VERSIONS = [
  STUDIOWIRE_CURRENT_VERSION,
  '0.2.8.6',
  '0.2.8.5',
  '0.2.8.4',
  '0.2.8.3',
  '0.2.8.2',
  '0.2.8.1',
  '0.2.8.0',
  '0.2.7.3',
  '0.2.7.2',
  '0.2.7.1',
  '0.2.7.0',
  '0.2.6.0',
  '0.2.5.1',
  '0.2.4.1',
  '0.1.0',
] as const;

export type StudioWireSchemaVersion = (typeof SUPPORTED_SCHEMA_VERSIONS)[number];
