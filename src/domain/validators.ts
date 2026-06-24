import { parseCableNumber } from './cableNumbers';
import { arePortConnectorsCompatible, createCategoryAssignmentKey } from './connectorCompatibility';
import {
  areStandardDirectionsCompatible,
  endpointReferencesPort,
  getCablePortIds,
  getSegmentCompatibility,
  isTerminalBlockPort,
} from './connections';
import { makeId } from './id';
import type { Cable, Device, Port, ProjectRoot, ValidationIssue, ValidationSeverity } from './types';

export function validateProject(project: ProjectRoot): ValidationIssue[] {
  const builder = createIssueBuilder();
  const issues: ValidationIssue[] = [];
  const categories = new Set(project.settings.categories.map((category) => category.id));
  const connectorTypes = new Set(project.settings.connectorTypes.map((connectorType) => connectorType.id));
  const categoryConnectorAssignments = new Set(
    project.settings.categoryConnectorAssignments.map((assignment) =>
      createCategoryAssignmentKey(assignment.categoryId, assignment.connectorTypeId),
    ),
  );
  const cablePrefixes = new Set(project.settings.cablePrefixes.map((prefix) => prefix.prefix));
  const locations = new Set(project.locations.map((location) => location.id));
  const racks = new Map(project.racks.map((rack) => [rack.id, rack]));
  const devices = new Map(project.devices.map((device) => [device.id, device]));
  const portGroups = new Map(project.portGroups.map((portGroup) => [portGroup.id, portGroup]));
  const ports = new Map(project.ports.map((port) => [port.id, port]));

  issues.push(...validateDuplicateIds(project, builder));
  issues.push(...validateSettings(project, builder));
  issues.push(...validateCables(project, ports, builder));
  issues.push(
    ...validateReferences(
      project,
      categories,
      connectorTypes,
      categoryConnectorAssignments,
      cablePrefixes,
      builder,
    ),
  );
  issues.push(...validateLocationsAndRacks(project, locations, builder));
  issues.push(...validateDevices(project, locations, racks, builder));
  issues.push(...validateRackOverlaps(project, builder));
  issues.push(...validatePortsAndGroups(project, devices, portGroups, builder));
  issues.push(...validateLedgerRanges(project, cablePrefixes, builder));
  issues.push(...validateReservedGapReuse(project, builder));

  return issues;
}

function validateSettings(
  project: ProjectRoot,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
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

function validateDuplicateIds(
  project: ProjectRoot,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
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

function validateCables(
  project: ProjectRoot,
  ports: Map<string, Port>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cableNumberCounts = countBy(project.cables, (cable) => cable.number);
  const cableById = new Map(project.cables.map((cable) => [cable.id, cable]));

  for (const cable of project.cables) {
    if ((cableNumberCounts.get(cable.number) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'duplicate-cable-number',
          `Cable number ${cable.number} is used more than once.`,
          'cable',
          cable.id,
        ),
      );
    }

    if (cable.status === 'planned' && (cableNumberCounts.get(cable.number) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'planned-cable-duplicate',
          `Planned cable number ${cable.number} is duplicated.`,
          'cable',
          cable.id,
        ),
      );
    }

    if (cable.status === 'planned' && cable.labelMiddle !== cable.number) {
      issues.push(
        issue(
          'error',
          'planned-cable-label-middle-mismatch',
          `Planned cable ${cable.number} labelMiddle must equal the cable number.`,
          'cable',
          cable.id,
        ),
      );
    }

    try {
      const parsed = parseCableNumber(cable.number);

      if (parsed.index !== cable.index || parsed.prefix !== cable.prefix) {
        issues.push(
          issue(
            'error',
            'cable-index-mismatch',
            `Cable ${cable.number} does not match prefix/index fields.`,
            'cable',
            cable.id,
          ),
        );
      }
    } catch {
      issues.push(
        issue(
          'error',
          'cable-number-format-invalid',
          `Invalid cable number: ${cable.number}.`,
          'cable',
          cable.id,
        ),
      );
    }

    for (const endpoint of [cable.sideAEndpoint, cable.sideBEndpoint]) {
      if (
        (endpoint.type === 'device_port' || endpoint.type === 'tb_port') &&
        endpoint.id &&
        !ports.has(endpoint.id)
      ) {
        issues.push(
          issue(
            'error',
            'cable-linked-to-missing-port',
            `Cable ${cable.number} references missing port ${endpoint.id}.`,
            'cable',
            cable.id,
          ),
        );
      }

      if (
        cable.status === 'planned' &&
        (endpoint.type === 'device_port' || endpoint.type === 'tb_port') &&
        endpoint.id
      ) {
        const endpointPort = ports.get(endpoint.id);

        if (endpointPort && endpointPort.plannedCableId !== cable.id) {
          issues.push(
            issue(
              'error',
              'planned-cable-port-backlink-mismatch',
              `Planned cable ${cable.number} references port ${endpointPort.label}, but the port does not link back to that cable.`,
              'cable',
              cable.id,
            ),
          );
        }

        if (
          endpointPort &&
          endpoint === cable.sideAEndpoint &&
          endpointPort.direction !== 'input' &&
          endpointPort.direction !== 'rear' &&
          cable.labelTop !== endpoint.label
        ) {
          issues.push(
            issue(
              'error',
              'planned-cable-label-top-mismatch',
              `Planned cable ${cable.number} labelTop must equal the source label.`,
              'cable',
              cable.id,
            ),
          );
        }

        if (
          endpointPort &&
          endpoint === cable.sideBEndpoint &&
          endpointPort.direction === 'input' &&
          cable.labelBottom !== endpoint.label
        ) {
          issues.push(
            issue(
              'error',
              'planned-cable-label-bottom-mismatch',
              `Input planned cable ${cable.number} labelBottom must equal the destination label.`,
              'cable',
              cable.id,
            ),
          );
        }
      }
    }
  }

  const cableIds = new Set(project.cables.map((cable) => cable.id));

  for (const port of project.ports) {
    if (port.plannedCableId && !cableIds.has(port.plannedCableId)) {
      issues.push(
        issue(
          'error',
          'cable-linked-to-missing-port',
          `Port ${port.label} links to missing planned cable ${port.plannedCableId}.`,
          'port',
          port.id,
        ),
      );
    }

    if (port.plannedCableId) {
      const cable = cableById.get(port.plannedCableId);

      if (cable) {
        issues.push(...validatePortPlannedCableLink(port, cable, issue));
      }
    }
  }

  issues.push(...validateConnectedCables(project, ports, issue));

  return issues;
}

function validatePortPlannedCableLink(
  port: Port,
  cable: Cable,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const hasPortEndpoint =
    endpointReferencesPort(cable.sideAEndpoint, port.id) ||
    endpointReferencesPort(cable.sideBEndpoint, port.id);

  if (!hasPortEndpoint) {
    issues.push(
      issue(
        'error',
        'planned-cable-missing-port-endpoint',
        `Planned cable ${cable.number} does not reference port ${port.label}.`,
        'port',
        port.id,
      ),
    );
  }

  if (cable.labelMiddle !== cable.number) {
    issues.push(
      issue(
        'error',
        'planned-cable-label-middle-mismatch',
        `Planned cable ${cable.number} labelMiddle must equal the cable number.`,
        'cable',
        cable.id,
      ),
    );
  }

  if (cable.status !== 'planned') {
    return issues;
  }

  if (port.direction === 'input') {
    if (!endpointReferencesPort(cable.sideBEndpoint, port.id)) {
      issues.push(
        issue(
          'error',
          'planned-input-cable-destination-mismatch',
          `Input port ${port.label} must be the planned cable destination.`,
          'port',
          port.id,
        ),
      );
    }

    if (cable.labelBottom !== cable.sideBEndpoint.label) {
      issues.push(
        issue(
          'error',
          'planned-cable-label-bottom-mismatch',
          `Input planned cable ${cable.number} labelBottom must equal the destination label.`,
          'cable',
          cable.id,
        ),
      );
    }
  } else {
    const code =
      port.direction === 'output'
        ? 'planned-output-cable-source-mismatch'
        : port.direction === 'front'
          ? 'terminal-block-front-cable-source-mismatch'
          : 'planned-bidirectional-cable-source-mismatch';

    if (!endpointReferencesPort(cable.sideAEndpoint, port.id)) {
      issues.push(
        issue(
          'error',
          code,
          `${port.direction} port ${port.label} must be the planned cable source.`,
          'port',
          port.id,
        ),
      );
    }

    if (cable.labelTop !== cable.sideAEndpoint.label) {
      issues.push(
        issue(
          'error',
          'planned-cable-label-top-mismatch',
          `Planned cable ${cable.number} labelTop must equal the source label.`,
          'cable',
          cable.id,
        ),
      );
    }
  }

  return issues;
}

function validateConnectedCables(
  project: ProjectRoot,
  ports: Map<string, Port>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const activeConnectionCounts = new Map<string, number>();
  const devices = new Map(project.devices.map((device) => [device.id, device]));

  for (const cable of project.cables) {
    if (cable.status !== 'connected') {
      continue;
    }

    const portIds = getCablePortIds(cable);

    if (portIds.length !== 2 || portIds[0] === portIds[1]) {
      issues.push(
        issue(
          'error',
          'connected-cable-endpoints-required',
          `Connected cable ${cable.number} must reference two different project ports.`,
          'cable',
          cable.id,
        ),
      );
      continue;
    }

    for (const portId of portIds) {
      activeConnectionCounts.set(portId, (activeConnectionCounts.get(portId) ?? 0) + 1);
    }

    const [left, right] = portIds.map((portId) => ports.get(portId));

    if (!left || !right) {
      continue;
    }

    const retiredEndpoint = [left, right].find((port) => devices.get(port.deviceId)?.status === 'retired');

    if (retiredEndpoint) {
      issues.push(
        issue(
          'error',
          'connected-cable-retired-endpoint',
          `Connected cable ${cable.number} references retired endpoint ${retiredEndpoint.label}.`,
          'cable',
          cable.id,
        ),
      );
    }

    if (left.categoryId !== right.categoryId) {
      issues.push(
        issue(
          'error',
          'connection-category-mismatch',
          `Connected cable ${cable.number} links ports with different categories.`,
          'cable',
          cable.id,
        ),
      );
    }

    const connectorCompatibility = arePortConnectorsCompatible(project, left, right);

    if (!connectorCompatibility.ok && left.categoryId === right.categoryId) {
      issues.push(
        issue(
          'error',
          'connection-connector-group-mismatch',
          `Connected cable ${cable.number} links incompatible connector groups: ${connectorCompatibility.reason}`,
          'cable',
          cable.id,
        ),
      );
    }

    const segment = getSegmentCompatibility(project, left, right);

    if (!segment.ok) {
      issues.push(
        issue(
          'error',
          'connection-segment-invalid',
          `Connected cable ${cable.number} is invalid: ${segment.reason}`,
          'cable',
          cable.id,
        ),
      );
    }
  }

  for (const [portId, count] of activeConnectionCounts) {
    if (count > 1) {
      const port = ports.get(portId);

      issues.push(
        issue(
          'error',
          'multiple-active-connections',
          `Port ${port?.label ?? portId} has ${count} active connected cables.`,
          'port',
          portId,
        ),
      );
    }
  }

  issues.push(...validateConnectionChains(project, ports, issue));

  return issues;
}

function validateConnectionChains(
  project: ProjectRoot,
  ports: Map<string, Port>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const neighbors = buildConnectionNeighborMap(project);
  const visited = new Set<string>();

  for (const portId of neighbors.keys()) {
    if (visited.has(portId)) {
      continue;
    }

    const component: string[] = [];
    const queue = [portId];
    visited.add(portId);

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      component.push(current);

      for (const next of neighbors.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    const standardPorts = component
      .map((id) => ports.get(id))
      .filter((port): port is Port => {
        if (!port) {
          return false;
        }

        return !isTerminalBlockPort(project, port);
      });

    const [leftPort, rightPort] = standardPorts;

    if (
      leftPort &&
      rightPort &&
      standardPorts.length === 2 &&
      !areStandardDirectionsCompatible(leftPort, rightPort)
    ) {
      issues.push(
        issue(
          'error',
          'connection-chain-direction-invalid',
          `Connection chain links incompatible device ports ${leftPort.label} and ${rightPort.label}.`,
          'port',
          leftPort.id,
        ),
      );
    }
  }

  return issues;
}

function buildConnectionNeighborMap(project: ProjectRoot): Map<string, Set<string>> {
  const neighbors = new Map<string, Set<string>>();

  function addEdge(left: string, right: string) {
    if (!neighbors.has(left)) {
      neighbors.set(left, new Set());
    }
    if (!neighbors.has(right)) {
      neighbors.set(right, new Set());
    }
    neighbors.get(left)?.add(right);
    neighbors.get(right)?.add(left);
  }

  for (const cable of project.cables) {
    if (cable.status !== 'connected') {
      continue;
    }

    const [left, right] = getCablePortIds(cable);

    if (left && right) {
      addEdge(left, right);
    }
  }

  for (const device of project.devices) {
    if (device.kind !== 'terminal_block') {
      continue;
    }

    const rearPorts = project.ports.filter(
      (port) => port.deviceId === device.id && port.direction === 'rear',
    );
    const frontPorts = project.ports.filter(
      (port) => port.deviceId === device.id && port.direction === 'front',
    );

    for (const rearPort of rearPorts) {
      const frontPort = frontPorts.find((candidate) => candidate.index === rearPort.index);

      if (frontPort) {
        addEdge(rearPort.id, frontPort.id);
      }
    }
  }

  return neighbors;
}

function validateReferences(
  project: ProjectRoot,
  categories: Set<string>,
  connectorTypes: Set<string>,
  categoryConnectorAssignments: Set<string>,
  cablePrefixes: Set<string>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const device of project.devices) {
    if (!categories.has(device.categoryId)) {
      issues.push(
        issue(
          'error',
          'unknown-category',
          `Device ${device.name} uses unknown category.`,
          'device',
          device.id,
        ),
      );
    }
  }

  for (const portGroup of project.portGroups) {
    if (!categories.has(portGroup.categoryId)) {
      issues.push(
        issue(
          'error',
          'unknown-category',
          `Port group ${portGroup.name} uses unknown category.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (!connectorTypes.has(portGroup.connectorTypeId)) {
      issues.push(
        issue(
          'error',
          'unknown-connector-type',
          `Port group ${portGroup.name} uses unknown connector type.`,
          'portGroup',
          portGroup.id,
        ),
      );
    } else if (
      !categoryConnectorAssignments.has(
        createCategoryAssignmentKey(portGroup.categoryId, portGroup.connectorTypeId),
      )
    ) {
      issues.push(
        issue(
          'error',
          'port-group-connector-not-assigned-to-category',
          `Port group ${portGroup.name} uses a connector that is not assigned to its category.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (!cablePrefixes.has(portGroup.cablePrefix)) {
      issues.push(
        issue(
          'error',
          'unknown-cable-prefix',
          `Port group ${portGroup.name} uses unknown cable prefix ${portGroup.cablePrefix}.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }
  }

  for (const port of project.ports) {
    if (!categories.has(port.categoryId)) {
      issues.push(
        issue('error', 'unknown-category', `Port ${port.label} uses unknown category.`, 'port', port.id),
      );
    }

    if (!connectorTypes.has(port.connectorTypeId)) {
      issues.push(
        issue(
          'error',
          'unknown-connector-type',
          `Port ${port.label} uses unknown connector type.`,
          'port',
          port.id,
        ),
      );
    } else if (
      !categoryConnectorAssignments.has(createCategoryAssignmentKey(port.categoryId, port.connectorTypeId))
    ) {
      issues.push(
        issue(
          'error',
          'port-connector-not-assigned-to-category',
          `Port ${port.label} uses a connector that is not assigned to its category.`,
          'port',
          port.id,
        ),
      );
    }
  }

  for (const cable of project.cables) {
    if (!cablePrefixes.has(cable.prefix)) {
      issues.push(
        issue(
          'error',
          'unknown-cable-prefix',
          `Cable ${cable.number} uses unknown cable prefix ${cable.prefix}.`,
          'cable',
          cable.id,
        ),
      );
    }
  }

  for (const ledger of project.numberingLedgers) {
    if (!cablePrefixes.has(ledger.prefix)) {
      issues.push(
        issue(
          'error',
          'unknown-cable-prefix',
          `Numbering ledger uses unknown cable prefix ${ledger.prefix}.`,
          'numberingLedger',
          ledger.prefix,
        ),
      );
    }
  }

  return issues;
}

function validateLocationsAndRacks(
  project: ProjectRoot,
  locations: Set<string>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const locationNameCounts = countBy(project.locations, (location) => location.name.trim().toLowerCase());

  for (const location of project.locations) {
    if ((locationNameCounts.get(location.name.trim().toLowerCase()) ?? 0) > 1) {
      issues.push(
        issue(
          'warning',
          'duplicate-location-name',
          `Location name "${location.name}" is used more than once.`,
          'location',
          location.id,
        ),
      );
    }
  }

  for (const rack of project.racks) {
    if (!rack.name.trim()) {
      issues.push(issue('error', 'rack-name-required', 'Rack name is required.', 'rack', rack.id));
    }

    if (!locations.has(rack.locationId)) {
      issues.push(
        issue('error', 'rack-without-location', 'Rack must reference an existing location.', 'rack', rack.id),
      );
    }

    if (!isPositiveInteger(rack.heightRu)) {
      issues.push(issue('error', 'rack-height-positive', 'Rack height must be positive.', 'rack', rack.id));
    }
  }

  return issues;
}

function validateDevices(
  project: ProjectRoot,
  locations: Set<string>,
  racks: Map<string, ProjectRoot['racks'][number]>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const device of project.devices) {
    if (!device.name.trim()) {
      issues.push(issue('error', 'device-name-required', 'Device name is required.', 'device', device.id));
    }

    if (device.kind !== 'terminal_block' && !device.code?.trim()) {
      issues.push(issue('error', 'device-code-required', 'Device code is required.', 'device', device.id));
    }

    if (device.kind === 'terminal_block') {
      if (device.mountType !== 'rack') {
        issues.push(
          issue(
            'error',
            'terminal-block-rack-mounted',
            'Terminal block must be rack-mounted.',
            'device',
            device.id,
          ),
        );
      }

      if (device.rackSizeRu !== 1) {
        issues.push(
          issue(
            'error',
            'terminal-block-size-fixed',
            'Terminal block rack size must be 1 RU.',
            'device',
            device.id,
          ),
        );
      }
    }

    if (device.mountType !== 'virtual' && (!device.locationId || !locations.has(device.locationId))) {
      issues.push(
        issue(
          'error',
          'device-without-location',
          'Device must reference an existing location unless it is virtual.',
          'device',
          device.id,
        ),
      );
    }

    if (device.mountType !== 'rack') {
      continue;
    }

    const rack = device.rackId ? racks.get(device.rackId) : null;

    if (device.rackId && !rack) {
      issues.push(
        issue(
          'error',
          'device-references-missing-rack',
          `${device.name} references missing rack ${device.rackId}.`,
          'device',
          device.id,
        ),
      );
      continue;
    }

    if (!rack) {
      issues.push(
        issue(
          'error',
          'rack-mounted-device-without-rack',
          'Rack-mounted device requires a rack.',
          'device',
          device.id,
        ),
      );
      continue;
    }

    if (device.locationId && rack.locationId !== device.locationId) {
      issues.push(
        issue(
          'error',
          'rack-location-device-location-mismatch',
          `${device.name} is assigned to a rack in a different location.`,
          'device',
          device.id,
        ),
      );
    }

    if (!isPositiveInteger(device.rackBottomRu)) {
      issues.push(
        issue(
          'error',
          'rack-mounted-device-invalid-bottom-ru',
          'Rack-mounted device requires a positive bottom RU.',
          'device',
          device.id,
        ),
      );
      continue;
    }

    if (!isPositiveInteger(device.rackSizeRu)) {
      issues.push(
        issue(
          'error',
          'rack-mounted-device-invalid-size-ru',
          'Rack-mounted device requires a positive rack size.',
          'device',
          device.id,
        ),
      );
      continue;
    }

    if ((device.rackBottomRu ?? 0) + (device.rackSizeRu ?? 0) - 1 > rack.heightRu) {
      issues.push(
        issue(
          'error',
          'rack-mounted-device-exceeds-rack-height',
          `${device.name} exceeds rack height for ${rack.name}.`,
          'device',
          device.id,
        ),
      );
    }
  }

  return issues;
}

function validateRackOverlaps(
  project: ProjectRoot,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const rack of project.racks) {
    const rackDevices = project.devices.filter(
      (device) => device.rackId === rack.id && device.mountType === 'rack',
    );

    for (let leftIndex = 0; leftIndex < rackDevices.length; leftIndex += 1) {
      const left = rackDevices[leftIndex];

      if (!isRackPositionValid(left)) {
        continue;
      }

      const leftFrom = left.rackBottomRu;
      const leftTo = left.rackBottomRu + left.rackSizeRu - 1;

      for (let rightIndex = leftIndex + 1; rightIndex < rackDevices.length; rightIndex += 1) {
        const right = rackDevices[rightIndex];

        if (!isRackPositionValid(right)) {
          continue;
        }

        const rightFrom = right.rackBottomRu;
        const rightTo = right.rackBottomRu + right.rackSizeRu - 1;

        if (leftFrom <= rightTo && rightFrom <= leftTo) {
          issues.push(
            issue(
              'error',
              'rack-ru-overlap',
              `${left.name} overlaps ${right.name} in ${rack.name}.`,
              'rack',
              rack.id,
            ),
          );
        }
      }
    }
  }

  return issues;
}

function validatePortsAndGroups(
  project: ProjectRoot,
  devices: Map<string, Device>,
  portGroups: Map<string, ProjectRoot['portGroups'][number]>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rangesById = new Map(
    project.numberingLedgers.flatMap((ledger) => ledger.ranges.map((range) => [range.id, range] as const)),
  );
  const cablesById = new Map(project.cables.map((cable) => [cable.id, cable]));

  for (const portGroup of project.portGroups) {
    const generatedPorts = project.ports.filter((port) => port.portGroupId === portGroup.id);
    const parentDevice = devices.get(portGroup.deviceId);

    if (
      parentDevice?.kind !== 'terminal_block' &&
      (portGroup.direction === 'rear' || portGroup.direction === 'front')
    ) {
      issues.push(
        issue(
          'error',
          'device-invalid-port-direction',
          `Device group ${portGroup.name} must use input, output, or bidirectional direction.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (portGroup.count !== generatedPorts.length) {
      issues.push(
        issue(
          'error',
          'port-group-count-mismatch',
          `Port group ${portGroup.name} expects ${portGroup.count} port(s) but has ${generatedPorts.length}.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (portGroup.count <= 0) {
      issues.push(
        issue(
          'error',
          'port-group-count-positive',
          `Port group ${portGroup.name} count must be positive.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (portGroup.numberingRangeId && !rangesById.has(portGroup.numberingRangeId)) {
      issues.push(
        issue(
          'error',
          'port-group-numbering-range-missing',
          `Port group ${portGroup.name} references missing numbering range ${portGroup.numberingRangeId}.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    const numberingRange = portGroup.numberingRangeId ? rangesById.get(portGroup.numberingRangeId) : null;

    if (numberingRange && numberingRange.status === 'reserved_gap') {
      issues.push(
        issue(
          'error',
          'port-group-numbering-range-reserved-gap',
          `Port group ${portGroup.name} references a reserved gap instead of an allocated or retired range.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    issues.push(
      ...validatePortGroupPlannedCableMode(
        portGroup,
        generatedPorts,
        project.cables,
        cablesById,
        numberingRange,
        issue,
      ),
    );
  }

  for (const device of project.devices.filter((item) => item.kind === 'terminal_block')) {
    issues.push(...validateTerminalBlockPortGroups(device, project, issue));
  }

  for (const port of project.ports) {
    if (!devices.has(port.deviceId)) {
      issues.push(
        issue(
          'error',
          'port-without-parent-device',
          `Port ${port.label} has no parent device.`,
          'port',
          port.id,
        ),
      );
    }

    if (!portGroups.has(port.portGroupId)) {
      issues.push(
        issue(
          'error',
          'port-without-parent-port-group',
          `Port ${port.label} has no parent port group.`,
          'port',
          port.id,
        ),
      );
    }
  }

  return issues;
}

function validatePortGroupPlannedCableMode(
  portGroup: ProjectRoot['portGroups'][number],
  generatedPorts: Port[],
  cables: Cable[],
  cablesById: Map<string, Cable>,
  numberingRange: ProjectRoot['numberingLedgers'][number]['ranges'][number] | null | undefined,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const groupPortIds = new Set(generatedPorts.map((port) => port.id));

  if (!portGroup.createPlannedCables) {
    if (
      portGroup.firstCableNumber !== null ||
      portGroup.lastCableNumber !== null ||
      portGroup.numberingRangeId !== null
    ) {
      issues.push(
        issue(
          'error',
          'port-group-no-planned-cables-has-allocation',
          `Port group ${portGroup.name} does not create planned cables, so cable allocation fields must be null.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    for (const port of generatedPorts) {
      if (port.plannedCableId !== null) {
        issues.push(
          issue(
            'error',
            'port-group-no-planned-cables-port-linked',
            `Port ${port.label} belongs to a no-planned-cables group but has a planned cable link.`,
            'port',
            port.id,
          ),
        );
      }
    }

    for (const cable of cables) {
      if (
        cable.status === 'planned' &&
        (endpointIdInSet(cable.sideAEndpoint, groupPortIds) ||
          endpointIdInSet(cable.sideBEndpoint, groupPortIds))
      ) {
        issues.push(
          issue(
            'error',
            'port-group-no-planned-cables-cable-reference',
            `Planned cable ${cable.number} references a port in no-planned-cables group ${portGroup.name}.`,
            'cable',
            cable.id,
          ),
        );
      }
    }

    return issues;
  }

  if (portGroup.firstCableNumber === null) {
    issues.push(
      issue(
        'error',
        'port-group-planned-cables-first-required',
        `Port group ${portGroup.name} creates planned cables and requires firstCableNumber.`,
        'portGroup',
        portGroup.id,
      ),
    );
  }

  if (portGroup.lastCableNumber === null) {
    issues.push(
      issue(
        'error',
        'port-group-planned-cables-last-required',
        `Port group ${portGroup.name} creates planned cables and requires lastCableNumber.`,
        'portGroup',
        portGroup.id,
      ),
    );
  }

  if (portGroup.numberingRangeId === null) {
    issues.push(
      issue(
        'error',
        'port-group-planned-cables-range-required',
        `Port group ${portGroup.name} creates planned cables and requires numberingRangeId.`,
        'portGroup',
        portGroup.id,
      ),
    );
  }

  const linkedPlannedCables = generatedPorts
    .map((port) => (port.plannedCableId ? (cablesById.get(port.plannedCableId) ?? null) : null))
    .filter((cable): cable is Cable => cable !== null);

  if (linkedPlannedCables.length !== portGroup.count) {
    issues.push(
      issue(
        'error',
        'port-group-planned-cable-count-mismatch',
        `Port group ${portGroup.name} expects ${portGroup.count} linked planned cable(s) but has ${linkedPlannedCables.length}.`,
        'portGroup',
        portGroup.id,
      ),
    );
  }

  for (const port of generatedPorts) {
    if (!port.plannedCableId) {
      issues.push(
        issue(
          'error',
          'port-group-port-missing-planned-cable',
          `Port ${port.label} is in a planned-cables group but has no planned cable link.`,
          'port',
          port.id,
        ),
      );
    }
  }

  if (numberingRange && (numberingRange.status === 'allocated' || numberingRange.status === 'retired')) {
    for (const cable of linkedPlannedCables) {
      if (
        cable.prefix !== numberingRange.prefix ||
        cable.index < numberingRange.from ||
        cable.index > numberingRange.to
      ) {
        issues.push(
          issue(
            'error',
            'port-group-planned-cable-outside-range',
            `Planned cable ${cable.number} is not covered by ${portGroup.name}'s ledger range.`,
            'cable',
            cable.id,
          ),
        );
      }
    }
  }

  return issues;
}

function validateTerminalBlockPortGroups(
  device: Device,
  project: ProjectRoot,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const groups = project.portGroups.filter((portGroup) => portGroup.deviceId === device.id);
  const rearGroups = groups.filter((portGroup) => portGroup.direction === 'rear');
  const frontGroups = groups.filter((portGroup) => portGroup.direction === 'front');
  const invalidGroups = groups.filter(
    (portGroup) => portGroup.direction !== 'rear' && portGroup.direction !== 'front',
  );

  if (rearGroups.length !== 1 || frontGroups.length !== 1) {
    issues.push(
      issue(
        'error',
        'terminal-block-face-groups-required',
        `${device.name} must have exactly one REAR group and one FRONT group.`,
        'device',
        device.id,
      ),
    );
  }

  for (const portGroup of invalidGroups) {
    issues.push(
      issue(
        'error',
        'terminal-block-invalid-port-direction',
        `Terminal block group ${portGroup.name} must use rear or front direction.`,
        'portGroup',
        portGroup.id,
      ),
    );
  }

  const rearGroup = rearGroups[0];
  const frontGroup = frontGroups[0];

  if (rearGroup && rearGroup.createPlannedCables) {
    issues.push(
      issue(
        'error',
        'terminal-block-rear-planned-cables',
        `Terminal block rear group ${rearGroup.name} must not create planned cables.`,
        'portGroup',
        rearGroup.id,
      ),
    );
  }

  if (rearGroup && frontGroup) {
    if (
      rearGroup.count !== frontGroup.count ||
      rearGroup.categoryId !== frontGroup.categoryId ||
      rearGroup.connectorTypeId !== frontGroup.connectorTypeId
    ) {
      issues.push(
        issue(
          'error',
          'terminal-block-face-mismatch',
          `${device.name} rear and front groups must have matching count, category, and connector type.`,
          'device',
          device.id,
        ),
      );
    }
  }

  for (const port of project.ports.filter((candidate) => candidate.deviceId === device.id)) {
    if (port.direction !== 'rear' && port.direction !== 'front') {
      issues.push(
        issue(
          'error',
          'terminal-block-invalid-port-direction',
          `Terminal block port ${port.label} must use rear or front direction.`,
          'port',
          port.id,
        ),
      );
    }

    if (port.direction === 'rear' && port.plannedCableId) {
      issues.push(
        issue(
          'error',
          'terminal-block-rear-planned-cables',
          `Terminal block rear port ${port.label} must not link to a planned cable.`,
          'port',
          port.id,
        ),
      );
    }

    if (port.direction === 'front' && port.plannedCableId) {
      const cable = project.cables.find((candidate) => candidate.id === port.plannedCableId);

      if (cable && cable.status === 'planned' && !endpointReferencesPort(cable.sideAEndpoint, port.id)) {
        issues.push(
          issue(
            'error',
            'terminal-block-front-cable-source-mismatch',
            `Terminal block front port ${port.label} must be the planned cable source.`,
            'port',
            port.id,
          ),
        );
      }
    }
  }

  return issues;
}

function validateLedgerRanges(
  project: ProjectRoot,
  cablePrefixes: Set<string>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const checkedPlannedCableIds = new Set<string>();

  for (const ledger of project.numberingLedgers) {
    if (!cablePrefixes.has(ledger.prefix)) {
      continue;
    }

    if (!isPositiveInteger(ledger.nextSuggested)) {
      issues.push(
        issue(
          'error',
          'ledger-next-suggested-positive',
          `Ledger ${ledger.prefix} nextSuggested must be a positive integer.`,
          'numberingLedger',
          ledger.prefix,
        ),
      );
    }

    const maxRangeTo = ledger.ranges.reduce((max, range) => Math.max(max, Number(range.to) || 0), 0);

    if (maxRangeTo > 0 && ledger.nextSuggested <= maxRangeTo) {
      issues.push(
        issue(
          'error',
          'ledger-next-suggested-after-ranges',
          `Ledger ${ledger.prefix} nextSuggested must be greater than all range end values.`,
          'numberingLedger',
          ledger.prefix,
        ),
      );
    }

    for (const range of ledger.ranges) {
      if (!isPositiveInteger(range.from) || !isPositiveInteger(range.to)) {
        issues.push(
          issue(
            'error',
            'numbering-range-positive',
            `Numbering range ${range.id} from/to values must be positive integers.`,
            'numberingRange',
            range.id,
          ),
        );
      }

      if (Number.isFinite(range.from) && Number.isFinite(range.to) && range.to < range.from) {
        issues.push(
          issue(
            'error',
            'numbering-range-to-before-from',
            `Numbering range ${range.id} must end at or after its start.`,
            'numberingRange',
            range.id,
          ),
        );
      }

      if (range.prefix !== ledger.prefix) {
        issues.push(
          issue(
            'error',
            'numbering-range-prefix-mismatch',
            `Numbering range ${range.id} prefix must match parent ledger ${ledger.prefix}.`,
            'numberingRange',
            range.id,
          ),
        );
      }

      if (range.status === 'allocated' && (!range.ownerType || !range.ownerId)) {
        issues.push(
          issue(
            'error',
            'allocated-range-without-owner',
            `Allocated range ${range.prefix}-${range.from}-${range.to} has no owner.`,
            'numberingRange',
            range.id,
          ),
        );
      }
    }

    for (const cable of project.cables.filter(
      (item) => item.status === 'planned' && item.prefix === ledger.prefix,
    )) {
      const owningRange = ledger.ranges.find(
        (range) =>
          (range.status === 'allocated' || range.status === 'retired') &&
          cable.index >= range.from &&
          cable.index <= range.to,
      );
      checkedPlannedCableIds.add(cable.id);

      if (!owningRange) {
        issues.push(
          issue(
            'error',
            'planned-cable-without-ledger-range',
            `Planned cable ${cable.number} is not covered by an allocated or retired ledger range.`,
            'cable',
            cable.id,
          ),
        );
      }
    }

    for (let leftIndex = 0; leftIndex < ledger.ranges.length; leftIndex += 1) {
      const left = ledger.ranges[leftIndex];

      for (let rightIndex = leftIndex + 1; rightIndex < ledger.ranges.length; rightIndex += 1) {
        const right = ledger.ranges[rightIndex];

        if (rangesOverlap(left.from, left.to, right.from, right.to)) {
          issues.push(
            issue(
              'error',
              'overlapping-numbering-ledger-ranges',
              `Numbering ranges overlap for prefix ${ledger.prefix}.`,
              'numberingLedger',
              ledger.prefix,
            ),
          );
        }
      }
    }
  }

  for (const cable of project.cables.filter((item) => item.status === 'planned')) {
    if (!checkedPlannedCableIds.has(cable.id)) {
      issues.push(
        issue(
          'error',
          'planned-cable-without-ledger-range',
          `Planned cable ${cable.number} is not covered by an allocated or retired ledger range.`,
          'cable',
          cable.id,
        ),
      );
    }
  }

  return issues;
}

function validateReservedGapReuse(
  project: ProjectRoot,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const ledger of project.numberingLedgers) {
    const reservedGaps = ledger.ranges.filter((range) => range.status === 'reserved_gap');

    for (const cable of project.cables.filter((item) => item.prefix === ledger.prefix)) {
      if (reservedGaps.some((range) => cable.index >= range.from && cable.index <= range.to)) {
        issues.push(
          issue(
            'error',
            'reserved-gap-reused',
            `Cable ${cable.number} reuses a reserved gap.`,
            'cable',
            cable.id,
          ),
        );
      }
    }

    for (const allocated of ledger.ranges.filter((range) => range.status === 'allocated')) {
      const reservedGap = reservedGaps.find((range) =>
        rangesOverlap(allocated.from, allocated.to, range.from, range.to),
      );

      if (reservedGap) {
        issues.push(
          issue(
            'error',
            'reserved-gap-reused',
            `Allocated range ${allocated.id} overlaps reserved gap ${reservedGap.id}.`,
            'numberingRange',
            allocated.id,
          ),
        );
      }
    }
  }

  return issues;
}

function createIssueBuilder() {
  let counter = 0;

  return (
    severity: ValidationSeverity,
    code: string,
    message: string,
    objectType: string,
    objectId: string,
  ): ValidationIssue => {
    counter += 1;

    return {
      id: makeId('validation', `${String(counter).padStart(4, '0')}-${code}-${objectType}-${objectId}`),
      severity,
      code,
      message,
      objectType,
      objectId,
    };
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function isRackPositionValid(
  device: Device,
): device is Device & { rackBottomRu: number; rackSizeRu: number } {
  return isPositiveInteger(device.rackBottomRu) && isPositiveInteger(device.rackSizeRu);
}

function endpointIdInSet(endpoint: Cable['sideAEndpoint'], ids: Set<string>): boolean {
  return (
    (endpoint.type === 'device_port' || endpoint.type === 'tb_port') &&
    endpoint.id !== null &&
    ids.has(endpoint.id)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function rangesOverlap(leftFrom: number, leftTo: number, rightFrom: number, rightTo: number): boolean {
  return leftFrom <= rightTo && rightFrom <= leftTo;
}
