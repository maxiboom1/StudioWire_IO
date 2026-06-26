import { getConnectorGroupsForCategory, getConnectorsForCategory } from '../../domain/connectorCompatibility';
import type { Category, ConnectorCompatibilityGroup, ConnectorType, ProjectRoot } from '../../domain/types';

export function findCategory(project: ProjectRoot, categoryId: string): Category | null {
  return project.settings.categories.find((category) => category.id === categoryId) ?? null;
}

export function getCategoryConnectors(project: ProjectRoot, categoryId: string): ConnectorType[] {
  return categoryId ? getConnectorsForCategory(project.settings, categoryId) : [];
}

export function getUnassignedConnectors(project: ProjectRoot, categoryId: string): ConnectorType[] {
  const assigned = new Set(
    project.settings.categoryConnectorAssignments
      .filter((assignment) => assignment.categoryId === categoryId)
      .map((assignment) => assignment.connectorTypeId),
  );

  return project.settings.connectorTypes
    .filter((connectorType) => !assigned.has(connectorType.id))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getGroupsForCategory(
  project: ProjectRoot,
  categoryId: string,
): ConnectorCompatibilityGroup[] {
  return categoryId ? getConnectorGroupsForCategory(project.settings, categoryId) : [];
}

export function getGroupConnectors(project: ProjectRoot, groupId: string): ConnectorType[] {
  const connectorTypesById = new Map(
    project.settings.connectorTypes.map((connectorType) => [connectorType.id, connectorType]),
  );

  return project.settings.connectorCompatibilityGroupMembers
    .filter((member) => member.groupId === groupId)
    .map((member) => connectorTypesById.get(member.connectorTypeId) ?? null)
    .filter((connectorType): connectorType is ConnectorType => connectorType !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getAvailableGroupConnectors(
  project: ProjectRoot,
  categoryId: string,
  groupId: string,
): ConnectorType[] {
  const members = new Set(
    project.settings.connectorCompatibilityGroupMembers
      .filter((member) => member.groupId === groupId)
      .map((member) => member.connectorTypeId),
  );

  return getConnectorsForCategory(project.settings, categoryId).filter(
    (connectorType) => !members.has(connectorType.id),
  );
}
