export const STUDIOWIRE_CURRENT_VERSION = '0.2.8.24' as const;

export const SUPPORTED_SCHEMA_VERSIONS = [STUDIOWIRE_CURRENT_VERSION] as const;

export type StudioWireSchemaVersion = (typeof SUPPORTED_SCHEMA_VERSIONS)[number];
