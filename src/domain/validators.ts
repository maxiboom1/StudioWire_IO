import { parseCableNumber } from './cableNumbers';
import { makeId } from './id';
import type { Cable, Device, Port, ProjectRoot, ValidationIssue, ValidationSeverity } from './types';

export function validateProject(project: ProjectRoot): ValidationIssue[] {
  const builder = createIssueBuilder();
  const issues: ValidationIssue[] = [];
  const categories = new Set(project.settings.categories.map((category) => category.id));
  const connectorTypes = new Set(project.settings.connectorTypes.map((connectorType) => connectorType.id));
  const cablePrefixes = new Set(project.settings.cablePrefixes.map((prefix) => prefix.prefix));
  const locations = new Set(project.locations.map((location) => location.id));
  const racks = new Map(project.racks.map((rack) => [rack.id, rack]));
  const devices = new Map(project.devices.map((device) => [device.id, device]));
  const portGroups = new Map(project.portGroups.map((portGroup) => [portGroup.id, portGroup]));
  const ports = new Map(project.ports.map((port) => [port.id, port]));

  issues.push(...validateDuplicateIds(project, builder));
  issues.push(...validateSettings(project, builder));
  issues.push(...validateCables(project, ports, builder));
  issues.push(...validateReferences(project, categories, connectorTypes, cablePrefixes, builder));
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
  const categoryNameCounts = countBy(project.settings.categories, (category) => category.name.trim().toLowerCase());
  const connectorNameCounts = countBy(
    project.settings.connectorTypes,
    (connectorType) => connectorType.name.trim().toLowerCase(),
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
      issues.push(issue('error', 'empty-category-name', 'Category name is required.', 'category', category.id));
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
        issue('error', 'empty-connector-type-name', 'Connector type name is required.', 'connectorType', connectorType.id),
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
        issue('error', 'cable-number-format-invalid', `Invalid cable number: ${cable.number}.`, 'cable', cable.id),
      );
    }

    for (const endpoint of [cable.sourceEndpoint, cable.destinationEndpoint]) {
      if (endpoint.type === 'device_port' && endpoint.id && !ports.has(endpoint.id)) {
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
  }

  return issues;
}

function validateReferences(
  project: ProjectRoot,
  categories: Set<string>,
  connectorTypes: Set<string>,
  cablePrefixes: Set<string>,
  issue: ReturnType<typeof createIssueBuilder>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const device of project.devices) {
    if (!categories.has(device.categoryId)) {
      issues.push(
        issue('error', 'unknown-category', `Device ${device.name} uses unknown category.`, 'device', device.id),
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
      issues.push(issue('error', 'unknown-category', `Port ${port.label} uses unknown category.`, 'port', port.id));
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
      issues.push(issue('error', 'rack-without-location', 'Rack must reference an existing location.', 'rack', rack.id));
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

    if (!device.code.trim()) {
      issues.push(issue('error', 'device-code-required', 'Device code is required.', 'device', device.id));
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

    if (!rack) {
      issues.push(
        issue('error', 'rack-mounted-device-without-rack', 'Rack-mounted device requires a rack.', 'device', device.id),
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
    const rackDevices = project.devices.filter((device) => device.rackId === rack.id && device.mountType === 'rack');

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
  const rangeIds = new Set(project.numberingLedgers.flatMap((ledger) => ledger.ranges.map((range) => range.id)));

  for (const portGroup of project.portGroups) {
    const generatedPorts = project.ports.filter((port) => port.portGroupId === portGroup.id);

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

    if (portGroup.numberingRangeId && !rangeIds.has(portGroup.numberingRangeId)) {
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
  }

  for (const port of project.ports) {
    if (!devices.has(port.deviceId)) {
      issues.push(
        issue('error', 'port-without-parent-device', `Port ${port.label} has no parent device.`, 'port', port.id),
      );
    }

    if (!portGroups.has(port.portGroupId)) {
      issues.push(
        issue('error', 'port-without-parent-port-group', `Port ${port.label} has no parent port group.`, 'port', port.id),
      );
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

    for (const range of ledger.ranges) {
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

    for (const cable of project.cables.filter((item) => item.status === 'planned' && item.prefix === ledger.prefix)) {
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
      const reservedGap = reservedGaps.find((range) => rangesOverlap(allocated.from, allocated.to, range.from, range.to));

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

function isRackPositionValid(device: Device): device is Device & { rackBottomRu: number; rackSizeRu: number } {
  return isPositiveInteger(device.rackBottomRu) && isPositiveInteger(device.rackSizeRu);
}

function isPositiveInteger(value: number | null): value is number {
  return Number.isSafeInteger(value) && value !== null && value > 0;
}

function rangesOverlap(leftFrom: number, leftTo: number, rightFrom: number, rightTo: number): boolean {
  return leftFrom <= rightTo && rightFrom <= leftTo;
}
