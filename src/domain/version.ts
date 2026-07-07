export const STUDIOWIRE_CURRENT_VERSION = '0.2.8.20' as const;

export const SUPPORTED_SCHEMA_VERSIONS = [STUDIOWIRE_CURRENT_VERSION] as const;

export type StudioWireSchemaVersion = (typeof SUPPORTED_SCHEMA_VERSIONS)[number];
