import {
  DEFAULT_CATEGORY_CONNECTOR_ASSIGNMENTS,
  DEFAULT_CONNECTOR_COMPATIBILITY_GROUP_MEMBERS,
  DEFAULT_CONNECTOR_COMPATIBILITY_GROUPS,
  DEFAULT_CONNECTOR_TYPES,
  getDefaultConnectorIconKey,
} from './defaults';
import type {
  CategoryConnectorAssignment,
  ConnectorCompatibilityGroup,
  ConnectorCompatibilityGroupMember,
  ConnectorType,
  Port,
  ProjectRoot,
  Settings,
} from './types';

export interface ConnectorCompatibilityLookup {
  connectorTypesById: ReadonlyMap<string, ConnectorType>;
  categoryAssignmentsByKey: ReadonlyMap<string, CategoryConnectorAssignment>;
  groupsById: ReadonlyMap<string, ConnectorCompatibilityGroup>;
  groupMembersByGroupId: ReadonlyMap<string, ReadonlySet<string>>;
}

export function createConnectorCompatibilityLookup(settings: Settings): ConnectorCompatibilityLookup {
  const groupMembersByGroupId = new Map<string, Set<string>>();

  for (const member of settings.connectorCompatibilityGroupMembers) {
    const connectorIds = groupMembersByGroupId.get(member.groupId) ?? new Set<string>();
    connectorIds.add(member.connectorTypeId);
    groupMembersByGroupId.set(member.groupId, connectorIds);
  }

  return {
    connectorTypesById: new Map(
      settings.connectorTypes.map((connectorType) => [connectorType.id, connectorType]),
    ),
    categoryAssignmentsByKey: new Map(
      settings.categoryConnectorAssignments.map((assignment) => [
        createCategoryAssignmentKey(assignment.categoryId, assignment.connectorTypeId),
        assignment,
      ]),
    ),
    groupsById: new Map(settings.connectorCompatibilityGroups.map((group) => [group.id, group])),
    groupMembersByGroupId,
  };
}

export function getConnectorsForCategory(settings: Settings, categoryId: string): ConnectorType[] {
  const connectorTypesById = new Map(
    settings.connectorTypes.map((connectorType) => [connectorType.id, connectorType]),
  );

  return settings.categoryConnectorAssignments
    .filter((assignment) => assignment.categoryId === categoryId)
    .map((assignment) => connectorTypesById.get(assignment.connectorTypeId) ?? null)
    .filter((connectorType): connectorType is ConnectorType => connectorType !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
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

export function isConnectorAssignedToCategory(
  settings: Settings,
  categoryId: string,
  connectorTypeId: string,
): boolean {
  return settings.categoryConnectorAssignments.some(
    (assignment) => assignment.categoryId === categoryId && assignment.connectorTypeId === connectorTypeId,
  );
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

  if (
    !lookup.categoryAssignmentsByKey.has(createCategoryAssignmentKey(left.categoryId, left.connectorTypeId))
  ) {
    return { ok: false, reason: 'Origin connector is not assigned to the port category.' };
  }

  if (
    !lookup.categoryAssignmentsByKey.has(createCategoryAssignmentKey(right.categoryId, right.connectorTypeId))
  ) {
    return { ok: false, reason: 'Target connector is not assigned to the port category.' };
  }

  if (left.connectorTypeId === right.connectorTypeId) {
    return { ok: true };
  }

  for (const group of lookup.groupsById.values()) {
    if (group.categoryId !== left.categoryId) {
      continue;
    }

    const members = lookup.groupMembersByGroupId.get(group.id);

    if (members?.has(left.connectorTypeId) && members.has(right.connectorTypeId)) {
      return { ok: true };
    }
  }

  return { ok: false, reason: 'Connector compatibility group does not include both connector types.' };
}

export function normalizeConnectorCompatibility(project: ProjectRoot): ProjectRoot {
  const settings = project.settings as LegacySettings;
  const connectorTypesHaveSafePrimitiveShape = settings.connectorTypes.every(
    (connectorType) => typeof connectorType.id === 'string' && typeof connectorType.name === 'string',
  );

  if (!connectorTypesHaveSafePrimitiveShape) {
    return project;
  }

  const hasCurrentConnectorShape =
    Array.isArray(settings.categoryConnectorAssignments) &&
    Array.isArray(settings.connectorCompatibilityGroups) &&
    Array.isArray(settings.connectorCompatibilityGroupMembers) &&
    settings.connectorTypes.every(
      (connectorType) =>
        typeof connectorType.id === 'string' &&
        typeof connectorType.name === 'string' &&
        !('categoryId' in connectorType) &&
        !('compatibilityGroupId' in connectorType),
    );

  if (hasCurrentConnectorShape) {
    return project;
  }

  const normalizedSettings = createNormalizedSettings(settings, project);
  const legacyToGlobalConnectorId = createLegacyConnectorIdMap(settings, normalizedSettings);

  function resolveConnectorId(legacyConnectorTypeId: string): string {
    return legacyToGlobalConnectorId.get(legacyConnectorTypeId) ?? 'connector-other';
  }

  return {
    ...project,
    settings: normalizedSettings,
    portGroups: project.portGroups.map((portGroup) => ({
      ...portGroup,
      connectorTypeId: resolveConnectorId(portGroup.connectorTypeId),
    })),
    ports: project.ports.map((port) => ({
      ...port,
      connectorTypeId: resolveConnectorId(port.connectorTypeId),
    })),
  };
}

export function createCategoryAssignmentKey(categoryId: string, connectorTypeId: string): string {
  return `${categoryId}:${connectorTypeId}`;
}

function createNormalizedSettings(settings: LegacySettings, project: ProjectRoot): Settings {
  const connectorTypes = normalizeConnectorTypes(settings);
  const legacyToGlobalConnectorId = createLegacyConnectorIdMap(settings, {
    ...settings,
    connectorTypes,
  } as Settings);
  const connectorTypeIds = new Set(connectorTypes.map((connectorType) => connectorType.id));
  const categories = settings.categories;
  const categoryIds = new Set(categories.map((category) => category.id));
  const categoryConnectorAssignments = new Map<string, CategoryConnectorAssignment>();

  for (const assignment of DEFAULT_CATEGORY_CONNECTOR_ASSIGNMENTS) {
    if (categoryIds.has(assignment.categoryId) && connectorTypeIds.has(assignment.connectorTypeId)) {
      categoryConnectorAssignments.set(
        createCategoryAssignmentKey(assignment.categoryId, assignment.connectorTypeId),
        assignment,
      );
    }
  }

  for (const connectorType of settings.connectorTypes) {
    if (connectorType.categoryId) {
      const connectorTypeId = legacyToGlobalConnectorId.get(connectorType.id) ?? 'connector-other';
      categoryConnectorAssignments.set(
        createCategoryAssignmentKey(connectorType.categoryId, connectorTypeId),
        {
          id: makeUniqueAssignmentId(categoryConnectorAssignments, connectorType.categoryId, connectorTypeId),
          categoryId: connectorType.categoryId,
          connectorTypeId,
        },
      );
    }
  }

  for (const portGroup of project.portGroups) {
    const connectorTypeId =
      legacyToGlobalConnectorId.get(portGroup.connectorTypeId) ?? portGroup.connectorTypeId;
    categoryConnectorAssignments.set(createCategoryAssignmentKey(portGroup.categoryId, connectorTypeId), {
      id: makeUniqueAssignmentId(categoryConnectorAssignments, portGroup.categoryId, connectorTypeId),
      categoryId: portGroup.categoryId,
      connectorTypeId,
    });
  }

  for (const port of project.ports) {
    const connectorTypeId = legacyToGlobalConnectorId.get(port.connectorTypeId) ?? port.connectorTypeId;
    categoryConnectorAssignments.set(createCategoryAssignmentKey(port.categoryId, connectorTypeId), {
      id: makeUniqueAssignmentId(categoryConnectorAssignments, port.categoryId, connectorTypeId),
      categoryId: port.categoryId,
      connectorTypeId,
    });
  }

  const { groups, members } = normalizeConnectorGroups(
    settings,
    legacyToGlobalConnectorId,
    categoryConnectorAssignments,
  );

  return {
    ...settings,
    connectorTypes,
    categoryConnectorAssignments: Array.from(categoryConnectorAssignments.values()),
    connectorCompatibilityGroups: groups,
    connectorCompatibilityGroupMembers: members,
  };
}

function normalizeConnectorTypes(settings: LegacySettings): ConnectorType[] {
  const connectorTypesByName = new Map<string, ConnectorType>();

  for (const connectorType of DEFAULT_CONNECTOR_TYPES) {
    connectorTypesByName.set(connectorType.name.trim().toLowerCase(), connectorType);
  }

  for (const connectorType of settings.connectorTypes) {
    const name = connectorType.name.trim() || 'Other';
    const key = name.toLowerCase();

    if (!connectorTypesByName.has(key)) {
      connectorTypesByName.set(key, {
        id: makeUniqueConnectorId(connectorTypesByName, name),
        name,
        iconKey: getDefaultConnectorIconKey(name),
      });
    }
  }

  return Array.from(connectorTypesByName.values());
}

function createLegacyConnectorIdMap(
  settings: LegacySettings,
  normalizedSettings: Pick<Settings, 'connectorTypes'>,
): Map<string, string> {
  const byName = new Map(
    normalizedSettings.connectorTypes.map((connectorType) => [
      connectorType.name.trim().toLowerCase(),
      connectorType.id,
    ]),
  );
  const result = new Map<string, string>();

  for (const connectorType of settings.connectorTypes) {
    result.set(
      connectorType.id,
      byName.get((connectorType.name.trim() || 'Other').toLowerCase()) ?? 'connector-other',
    );
  }

  return result;
}

function normalizeConnectorGroups(
  settings: LegacySettings,
  legacyToGlobalConnectorId: ReadonlyMap<string, string>,
  categoryConnectorAssignments: ReadonlyMap<string, CategoryConnectorAssignment>,
): { groups: ConnectorCompatibilityGroup[]; members: ConnectorCompatibilityGroupMember[] } {
  const groups = new Map<string, ConnectorCompatibilityGroup>();
  const members = new Map<string, ConnectorCompatibilityGroupMember>();

  for (const group of settings.connectorCompatibilityGroups ?? DEFAULT_CONNECTOR_COMPATIBILITY_GROUPS) {
    groups.set(group.id, {
      id: group.id,
      categoryId: group.categoryId,
      name: group.name,
    });
  }

  for (const member of settings.connectorCompatibilityGroupMembers ?? []) {
    const connectorTypeId = legacyToGlobalConnectorId.get(member.connectorTypeId) ?? member.connectorTypeId;
    const group = groups.get(member.groupId);

    if (
      !group ||
      !categoryConnectorAssignments.has(createCategoryAssignmentKey(group.categoryId, connectorTypeId))
    ) {
      continue;
    }

    members.set(`${member.groupId}:${connectorTypeId}`, {
      id: member.id,
      groupId: member.groupId,
      connectorTypeId,
    });
  }

  for (const legacyConnector of settings.connectorTypes) {
    if (!legacyConnector.categoryId || !legacyConnector.compatibilityGroupId) {
      continue;
    }

    const group = groups.get(legacyConnector.compatibilityGroupId);
    const connectorTypeId = legacyToGlobalConnectorId.get(legacyConnector.id) ?? legacyConnector.id;

    if (
      !group ||
      !categoryConnectorAssignments.has(createCategoryAssignmentKey(group.categoryId, connectorTypeId))
    ) {
      continue;
    }

    members.set(`${group.id}:${connectorTypeId}`, {
      id: makeGroupMemberId(group.id, connectorTypeId),
      groupId: group.id,
      connectorTypeId,
    });
  }

  for (const member of DEFAULT_CONNECTOR_COMPATIBILITY_GROUP_MEMBERS) {
    const group = groups.get(member.groupId);

    if (
      !group ||
      !categoryConnectorAssignments.has(createCategoryAssignmentKey(group.categoryId, member.connectorTypeId))
    ) {
      continue;
    }

    members.set(`${member.groupId}:${member.connectorTypeId}`, member);
  }

  return {
    groups: Array.from(groups.values()),
    members: Array.from(members.values()),
  };
}

function makeUniqueConnectorId(
  connectorTypesByName: ReadonlyMap<string, ConnectorType>,
  name: string,
): string {
  const existingIds = new Set(
    Array.from(connectorTypesByName.values()).map((connectorType) => connectorType.id),
  );
  const base = `connector-${slug(name)}`;

  return makeUniqueId(base, existingIds);
}

function makeUniqueAssignmentId(
  assignments: ReadonlyMap<string, CategoryConnectorAssignment>,
  categoryId: string,
  connectorTypeId: string,
): string {
  const existingIds = new Set(Array.from(assignments.values()).map((assignment) => assignment.id));

  return makeUniqueId(
    `assignment-${categoryId.replace(/^category-/, '')}-${connectorTypeId.replace(/^connector-/, '')}`,
    existingIds,
  );
}

function makeGroupMemberId(groupId: string, connectorTypeId: string): string {
  return `member-${groupId.replace(/^group-/, '')}-${connectorTypeId.replace(/^connector-/, '')}`;
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

type LegacySettings = Settings & {
  categoryConnectorAssignments?: CategoryConnectorAssignment[];
  connectorCompatibilityGroups?: ConnectorCompatibilityGroup[];
  connectorCompatibilityGroupMembers?: ConnectorCompatibilityGroupMember[];
  connectorTypes: Array<ConnectorType & { categoryId?: string; compatibilityGroupId?: string }>;
};
