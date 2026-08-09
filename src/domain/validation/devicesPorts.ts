import { DEVICE_PORT_LABEL_MODE_VALUES } from '../types';
import type { Cable, Device, Port, ProjectRoot, ValidationIssue } from '../types';
import { endpointIdInSet, type ValidationIssueBuilder } from './shared';

export function validatePortsAndGroups(
  project: ProjectRoot,
  devices: Map<string, Device>,
  portGroups: Map<string, ProjectRoot['portGroups'][number]>,
  issue: ValidationIssueBuilder,
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

    if (portGroup.colorOverride !== null && !/^#[0-9A-Fa-f]{6}$/.test(portGroup.colorOverride)) {
      issues.push(
        issue(
          'error',
          'port-group-color-override-invalid',
          `Port group ${portGroup.name} color override must use #RRGGBB format.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (portGroup.devicePortLabelPattern !== null && !portGroup.devicePortLabelPattern.trim()) {
      issues.push(
        issue(
          'error',
          'port-group-device-label-pattern-invalid',
          `Port group ${portGroup.name} Device Port Label Pattern must not be blank.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }

    if (!DEVICE_PORT_LABEL_MODE_VALUES.includes(portGroup.devicePortLabelMode)) {
      issues.push(
        issue(
          'error',
          'port-group-device-label-mode-invalid',
          `Port group ${portGroup.name} has an invalid device-port label mode.`,
          'portGroup',
          portGroup.id,
        ),
      );
    } else if (
      portGroup.devicePortLabelMode === 'pattern' &&
      generatedPorts.some((port) => port.devicePortLabelOverride !== null)
    ) {
      issues.push(
        issue(
          'error',
          'port-group-device-label-pattern-overrides',
          `Port group ${portGroup.name} uses Pattern mode but retains manual device-port labels.`,
          'portGroup',
          portGroup.id,
        ),
      );
    } else if (
      portGroup.devicePortLabelMode === 'manual' &&
      generatedPorts.some(
        (port) => port.devicePortLabelOverride === null || !port.devicePortLabelOverride.trim(),
      )
    ) {
      issues.push(
        issue(
          'error',
          'port-group-device-label-manual-incomplete',
          `Port group ${portGroup.name} Manual mode requires a non-empty device label for every port.`,
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
          `Port group ${portGroup.name} references a reserved gap instead of an allocated range.`,
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
  issue: ValidationIssueBuilder,
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

  if (numberingRange && numberingRange.status === 'allocated') {
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
  issue: ValidationIssueBuilder,
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

  for (const portGroup of [...rearGroups, ...frontGroups]) {
    if (
      portGroup.createPlannedCables ||
      portGroup.firstCableNumber !== null ||
      portGroup.lastCableNumber !== null ||
      portGroup.numberingRangeId !== null
    ) {
      issues.push(
        issue(
          'error',
          'terminal-block-planned-cables',
          `Terminal block group ${portGroup.name} must not allocate planned cable numbers.`,
          'portGroup',
          portGroup.id,
        ),
      );
    }
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

    if (port.plannedCableId) {
      issues.push(
        issue(
          'error',
          'terminal-block-planned-cables',
          `Terminal block port ${port.label} must not link to a planned cable.`,
          'port',
          port.id,
        ),
      );
    }
  }

  return issues;
}
