import { createCategoryAssignmentKey } from '../connectorCompatibility';
import { CONNECTOR_ICON_KEY_VALUES, type ProjectRoot, type ValidationIssue } from '../types';
import { countBy, type ValidationIssueBuilder } from './shared';

export function validateSettings(project: ProjectRoot, issue: ValidationIssueBuilder): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cablePrefixValues = new Set(project.settings.cablePrefixes.map((prefix) => prefix.prefix));
  const cablePrefixCounts = countBy(project.settings.cablePrefixes, (prefix) => prefix.prefix);
  const categoryNameCounts = countBy(project.settings.categories, (category) =>
    category.name.trim().toLowerCase(),
  );
  const categoryIds = new Set(project.settings.categories.map((category) => category.id));
  const connectorTypeIds = new Set(project.settings.connectorTypes.map((connectorType) => connectorType.id));
  const connectorGroupsById = new Map(
    project.settings.connectorCompatibilityGroups.map((group) => [group.id, group]),
  );
  const groupNameCounts = countBy(
    project.settings.connectorCompatibilityGroups,
    (group) => `${group.categoryId}:${group.name.trim().toLowerCase()}`,
  );
  const connectorNameCounts = countBy(project.settings.connectorTypes, (connectorType) =>
    connectorType.name.trim().toLowerCase(),
  );
  const assignmentCounts = countBy(project.settings.categoryConnectorAssignments, (assignment) =>
    createCategoryAssignmentKey(assignment.categoryId, assignment.connectorTypeId),
  );
  const groupMemberCounts = countBy(
    project.settings.connectorCompatibilityGroupMembers,
    (member) => `${member.groupId}:${member.connectorTypeId}`,
  );

  for (const prefix of project.settings.cablePrefixes) {
    if ((cablePrefixCounts.get(prefix.prefix) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'duplicate-cable-prefix-value',
          `Cable prefix value "${prefix.prefix}" is used more than once.`,
          'cablePrefix',
          prefix.id,
        ),
      );
    }

    if (!/^[A-Z]+$/.test(prefix.prefix)) {
      issues.push(
        issue(
          'error',
          'invalid-cable-prefix-format',
          `Cable prefix "${prefix.prefix}" must contain uppercase letters only.`,
          'cablePrefix',
          prefix.id,
        ),
      );
    }
  }

  for (const category of project.settings.categories) {
    if (!category.name.trim()) {
      issues.push(
        issue('error', 'empty-category-name', 'Category name is required.', 'category', category.id),
      );
    }

    if ((categoryNameCounts.get(category.name.trim().toLowerCase()) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'duplicate-category-name',
          `Category name "${category.name}" is used more than once.`,
          'category',
          category.id,
        ),
      );
    }

    if (!cablePrefixValues.has(category.defaultCablePrefix)) {
      issues.push(
        issue(
          'error',
          'category-default-prefix-missing',
          `Category ${category.name || category.id} references missing prefix ${category.defaultCablePrefix}.`,
          'category',
          category.id,
        ),
      );
    }

    if (!isHexColor(category.color)) {
      issues.push(
        issue(
          'error',
          'category-color-invalid',
          `Category ${category.name || category.id} color must use #RRGGBB format.`,
          'category',
          category.id,
        ),
      );
    }
  }

  for (const connectorType of project.settings.connectorTypes) {
    if (!connectorType.name.trim()) {
      issues.push(
        issue(
          'error',
          'empty-connector-type-name',
          'Connector type name is required.',
          'connectorType',
          connectorType.id,
        ),
      );
    }

    if ((connectorNameCounts.get(connectorType.name.trim().toLowerCase()) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'duplicate-connector-type-name',
          `Connector type name "${connectorType.name}" is used more than once.`,
          'connectorType',
          connectorType.id,
        ),
      );
    }

    if (!CONNECTOR_ICON_KEY_VALUES.includes(connectorType.iconKey)) {
      issues.push(
        issue(
          'error',
          'connector-icon-key-invalid',
          `Connector type ${connectorType.name || connectorType.id} uses an unknown icon key.`,
          'connectorType',
          connectorType.id,
        ),
      );
    }
  }

  for (const assignment of project.settings.categoryConnectorAssignments) {
    if (!categoryIds.has(assignment.categoryId)) {
      issues.push(
        issue(
          'error',
          'category-connector-assignment-category-missing',
          `Connector assignment ${assignment.id} references missing category ${assignment.categoryId}.`,
          'categoryConnectorAssignment',
          assignment.id,
        ),
      );
    }

    if (!connectorTypeIds.has(assignment.connectorTypeId)) {
      issues.push(
        issue(
          'error',
          'category-connector-assignment-connector-missing',
          `Connector assignment ${assignment.id} references missing connector ${assignment.connectorTypeId}.`,
          'categoryConnectorAssignment',
          assignment.id,
        ),
      );
    }

    if (
      (assignmentCounts.get(createCategoryAssignmentKey(assignment.categoryId, assignment.connectorTypeId)) ??
        0) > 1
    ) {
      issues.push(
        issue(
          'error',
          'duplicate-category-connector-assignment',
          `Connector ${assignment.connectorTypeId} is assigned more than once to category ${assignment.categoryId}.`,
          'categoryConnectorAssignment',
          assignment.id,
        ),
      );
    }
  }

  for (const group of project.settings.connectorCompatibilityGroups) {
    if (!group.name.trim()) {
      issues.push(
        issue(
          'error',
          'empty-connector-group-name',
          'Connector group name is required.',
          'connectorGroup',
          group.id,
        ),
      );
    }

    if (!categoryIds.has(group.categoryId)) {
      issues.push(
        issue(
          'error',
          'connector-group-category-missing',
          `Connector group ${group.name || group.id} references missing category ${group.categoryId}.`,
          'connectorGroup',
          group.id,
        ),
      );
    }

    if ((groupNameCounts.get(`${group.categoryId}:${group.name.trim().toLowerCase()}`) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'duplicate-connector-group-name',
          `Connector group name "${group.name}" is used more than once in one category.`,
          'connectorGroup',
          group.id,
        ),
      );
    }
  }

  for (const member of project.settings.connectorCompatibilityGroupMembers) {
    const group = connectorGroupsById.get(member.groupId);

    if (!group) {
      issues.push(
        issue(
          'error',
          'connector-group-member-group-missing',
          `Connector group member ${member.id} references missing group ${member.groupId}.`,
          'connectorGroupMember',
          member.id,
        ),
      );
    } else if (!assignmentCounts.has(createCategoryAssignmentKey(group.categoryId, member.connectorTypeId))) {
      issues.push(
        issue(
          'error',
          'connector-group-member-unassigned-connector',
          `Connector group member ${member.id} uses a connector that is not assigned to ${group.categoryId}.`,
          'connectorGroupMember',
          member.id,
        ),
      );
    }

    if (!connectorTypeIds.has(member.connectorTypeId)) {
      issues.push(
        issue(
          'error',
          'connector-group-member-connector-missing',
          `Connector group member ${member.id} references missing connector ${member.connectorTypeId}.`,
          'connectorGroupMember',
          member.id,
        ),
      );
    }

    if ((groupMemberCounts.get(`${member.groupId}:${member.connectorTypeId}`) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'duplicate-connector-group-member',
          `Connector ${member.connectorTypeId} is listed more than once in group ${member.groupId}.`,
          'connectorGroupMember',
          member.id,
        ),
      );
    }
  }

  return issues;
}

export function validateDuplicateIds(project: ProjectRoot, issue: ValidationIssueBuilder): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, { objectType: string; objectId: string }>();
  const ids: Array<{ objectType: string; objectId: string }> = [
    { objectType: 'project', objectId: project.project.id },
    ...project.settings.categories.map((item) => ({ objectType: 'category', objectId: item.id })),
    ...project.settings.connectorTypes.map((item) => ({ objectType: 'connectorType', objectId: item.id })),
    ...project.settings.categoryConnectorAssignments.map((item) => ({
      objectType: 'categoryConnectorAssignment',
      objectId: item.id,
    })),
    ...project.settings.connectorCompatibilityGroups.map((item) => ({
      objectType: 'connectorGroup',
      objectId: item.id,
    })),
    ...project.settings.connectorCompatibilityGroupMembers.map((item) => ({
      objectType: 'connectorGroupMember',
      objectId: item.id,
    })),
    ...project.settings.cablePrefixes.map((item) => ({ objectType: 'cablePrefix', objectId: item.id })),
    ...project.locations.map((item) => ({ objectType: 'location', objectId: item.id })),
    ...project.subLocations.map((item) => ({ objectType: 'subLocation', objectId: item.id })),
    ...project.racks.map((item) => ({ objectType: 'rack', objectId: item.id })),
    ...project.devices.map((item) => ({ objectType: 'device', objectId: item.id })),
    ...project.portGroups.map((item) => ({ objectType: 'portGroup', objectId: item.id })),
    ...project.ports.map((item) => ({ objectType: 'port', objectId: item.id })),
    ...project.cables.map((item) => ({ objectType: 'cable', objectId: item.id })),
    ...project.numberingLedgers.flatMap((ledger) =>
      ledger.ranges.map((range) => ({ objectType: 'numberingRange', objectId: range.id })),
    ),
    ...project.changeLog.map((item) => ({ objectType: 'changeLogEntry', objectId: item.id })),
  ];

  for (const item of ids) {
    if (!item.objectId) {
      continue;
    }

    const first = seen.get(item.objectId);

    if (first) {
      issues.push(
        issue(
          'error',
          'duplicate-object-id',
          `Duplicate object ID "${item.objectId}" is used by ${first.objectType} and ${item.objectType}.`,
          item.objectType,
          item.objectId,
        ),
      );
    } else {
      seen.set(item.objectId, item);
    }
  }

  return issues;
}

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}
