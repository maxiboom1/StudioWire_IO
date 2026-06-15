import {
  DEFAULT_CONNECTOR_COMPATIBILITY_GROUPS,
  DEFAULT_CONNECTOR_TYPES,
} from './defaults';
import type {
  ConnectorCompatibilityGroup,
  ConnectorType,
  Port,
  ProjectRoot,
  Settings,
} from './types';

export interface ConnectorCompatibilityLookup {
  connectorTypesById: ReadonlyMap<string, ConnectorType>;
  groupsById: ReadonlyMap<string, ConnectorCompatibilityGroup>;
}

export function createConnectorCompatibilityLookup(settings: Settings): ConnectorCompatibilityLookup {
  return {
    connectorTypesById: new Map(settings.connectorTypes.map((connectorType) => [connectorType.id, connectorType])),
    groupsById: new Map(settings.connectorCompatibilityGroups.map((group) => [group.id, group])),
  };
}

export function getConnectorsForCategory(settings: Settings, categoryId: string): ConnectorType[] {
  return settings.connectorTypes.filter((connectorType) => connectorType.categoryId === categoryId);
}

export function getConnectorGroupsForCategory(
  settings: Settings,
  categoryId: string,
): ConnectorCompatibilityGroup[] {
  return settings.connectorCompatibilityGroups.filter((group) => group.categoryId === categoryId);
}

export function getDefaultConnectorForCategory(settings: Settings, categoryId: string): ConnectorType | null {
  return getConnectorsForCategory(settings, categoryId)[0] ?? null;
}

export function arePortConnectorsCompatible(
  project: ProjectRoot,
  left: Port,
  right: Port,
  lookup = createConnectorCompatibilityLookup(project.settings),
): { ok: true } | { ok: false; reason: string } {
  if (left.categoryId !== right.categoryId) {
    return { ok: false, reason: 'Category does not match.' };
  }

  const leftConnector = lookup.connectorTypesById.get(left.connectorTypeId);
  const rightConnector = lookup.connectorTypesById.get(right.connectorTypeId);

  if (!leftConnector || !rightConnector) {
    return { ok: false, reason: 'Connector type is missing.' };
  }

  if (leftConnector.categoryId !== left.categoryId || rightConnector.categoryId !== right.categoryId) {
    return { ok: false, reason: 'Connector category does not match the port category.' };
  }

  if (leftConnector.compatibilityGroupId !== rightConnector.compatibilityGroupId) {
    return { ok: false, reason: 'Connector compatibility group does not match.' };
  }

  const group = lookup.groupsById.get(leftConnector.compatibilityGroupId);

  if (!group || group.categoryId !== left.categoryId) {
    return { ok: false, reason: 'Connector compatibility group is missing.' };
  }

  return { ok: true };
}

export function normalizeConnectorCompatibility(project: ProjectRoot): ProjectRoot {
  const settings = project.settings as Settings & {
    connectorCompatibilityGroups?: ConnectorCompatibilityGroup[];
    connectorTypes: Array<ConnectorType | LegacyConnectorType>;
  };
  const hasCurrentConnectorShape =
    Array.isArray(settings.connectorCompatibilityGroups) &&
    settings.connectorTypes.every(
      (connectorType) =>
        typeof connectorType.categoryId === 'string' &&
        typeof connectorType.compatibilityGroupId === 'string',
    );

  if (hasCurrentConnectorShape) {
    return project;
  }

  const legacyConnectorNames = new Map(
    settings.connectorTypes.map((connectorType) => [connectorType.id, connectorType.name]),
  );
  const nextSettings = createNormalizedSettings(project.settings, project);
  const connectorIdByCategoryAndLegacyId = new Map<string, string>();

  function resolveConnectorId(categoryId: string, legacyConnectorTypeId: string): string {
    const key = `${categoryId}:${legacyConnectorTypeId}`;
    const cached = connectorIdByCategoryAndLegacyId.get(key);

    if (cached) {
      return cached;
    }

    const legacyName = legacyConnectorNames.get(legacyConnectorTypeId) ?? 'Other';
    const connector = findOrCreateConnector(nextSettings, categoryId, legacyName);
    connectorIdByCategoryAndLegacyId.set(key, connector.id);

    return connector.id;
  }

  return {
    ...project,
    settings: nextSettings,
    portGroups: project.portGroups.map((portGroup) => ({
      ...portGroup,
      connectorTypeId: resolveConnectorId(portGroup.categoryId, portGroup.connectorTypeId),
    })),
    ports: project.ports.map((port) => ({
      ...port,
      connectorTypeId: resolveConnectorId(port.categoryId, port.connectorTypeId),
    })),
  };
}

function createNormalizedSettings(settings: Settings, project: ProjectRoot): Settings {
  const categoryIds = new Set(settings.categories.map((category) => category.id));
  const groups = DEFAULT_CONNECTOR_COMPATIBILITY_GROUPS.filter((group) => categoryIds.has(group.categoryId));
  const connectors = DEFAULT_CONNECTOR_TYPES.filter((connectorType) => categoryIds.has(connectorType.categoryId));
  const nextSettings: Settings = {
    ...settings,
    connectorCompatibilityGroups: [...groups],
    connectorTypes: [...connectors],
  };

  for (const category of settings.categories) {
    ensureOtherGroup(nextSettings, category.id);
    ensureOtherConnector(nextSettings, category.id);
  }

  for (const portGroup of project.portGroups) {
    const legacyConnector = (settings.connectorTypes as LegacyConnectorType[]).find(
      (connectorType) => connectorType.id === portGroup.connectorTypeId,
    );

    if (legacyConnector) {
      findOrCreateConnector(nextSettings, portGroup.categoryId, legacyConnector.name);
    }
  }

  for (const port of project.ports) {
    const legacyConnector = (settings.connectorTypes as LegacyConnectorType[]).find(
      (connectorType) => connectorType.id === port.connectorTypeId,
    );

    if (legacyConnector) {
      findOrCreateConnector(nextSettings, port.categoryId, legacyConnector.name);
    }
  }

  return nextSettings;
}

function findOrCreateConnector(settings: Settings, categoryId: string, name: string): ConnectorType {
  const normalizedName = name.trim() || 'Other';
  const existing = settings.connectorTypes.find(
    (connectorType) =>
      connectorType.categoryId === categoryId &&
      connectorType.name.trim().toLowerCase() === normalizedName.toLowerCase(),
  );

  if (existing) {
    return existing;
  }

  const group = findDefaultGroupForConnector(settings, categoryId, normalizedName) ?? ensureOtherGroup(settings, categoryId);
  const connector: ConnectorType = {
    id: makeUniqueConnectorId(settings, categoryId, normalizedName),
    name: normalizedName,
    categoryId,
    compatibilityGroupId: group.id,
  };

  settings.connectorTypes.push(connector);

  return connector;
}

function findDefaultGroupForConnector(
  settings: Settings,
  categoryId: string,
  connectorName: string,
): ConnectorCompatibilityGroup | null {
  const defaultConnector = DEFAULT_CONNECTOR_TYPES.find(
    (connectorType) =>
      connectorType.categoryId === categoryId &&
      connectorType.name.trim().toLowerCase() === connectorName.trim().toLowerCase(),
  );

  if (!defaultConnector) {
    return null;
  }

  return settings.connectorCompatibilityGroups.find((group) => group.id === defaultConnector.compatibilityGroupId) ?? null;
}

function ensureOtherConnector(settings: Settings, categoryId: string): ConnectorType {
  return findOrCreateConnector(settings, categoryId, 'Other');
}

function ensureOtherGroup(settings: Settings, categoryId: string): ConnectorCompatibilityGroup {
  const existing =
    settings.connectorCompatibilityGroups.find(
      (group) => group.categoryId === categoryId && group.name.trim().toLowerCase() === 'other',
    ) ?? null;

  if (existing) {
    return existing;
  }

  const group: ConnectorCompatibilityGroup = {
    id: makeUniqueGroupId(settings, categoryId, 'Other'),
    categoryId,
    name: 'Other',
  };

  settings.connectorCompatibilityGroups.push(group);

  return group;
}

function makeUniqueConnectorId(settings: Settings, categoryId: string, name: string): string {
  const base = `connector-${slug(categoryId.replace(/^category-/, ''))}-${slug(name)}`;
  const used = new Set(settings.connectorTypes.map((connectorType) => connectorType.id));

  return makeUniqueId(base, used);
}

function makeUniqueGroupId(settings: Settings, categoryId: string, name: string): string {
  const base = `group-${slug(categoryId.replace(/^category-/, ''))}-${slug(name)}`;
  const used = new Set(settings.connectorCompatibilityGroups.map((group) => group.id));

  return makeUniqueId(base, used);
}

function makeUniqueId(base: string, used: ReadonlySet<string>): string {
  if (!used.has(base)) {
    return base;
  }

  for (let index = 2; ; index += 1) {
    const candidate = `${base}-${index}`;

    if (!used.has(candidate)) {
      return candidate;
    }
  }
}

function slug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'item'
  );
}

interface LegacyConnectorType {
  id: string;
  name: string;
  categoryId?: string;
  compatibilityGroupId?: string;
}
