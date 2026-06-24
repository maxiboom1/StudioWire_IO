import { parseCableNumber } from '../cableNumbers';
import { arePortConnectorsCompatible } from '../connectorCompatibility';
import {
  areStandardDirectionsCompatible,
  endpointReferencesPort,
  getCablePortIds,
  getSegmentCompatibility,
  isTerminalBlockPort,
} from '../connections';
import type { Cable, Port, ProjectRoot, ValidationIssue } from '../types';
import { countBy, type ValidationIssueBuilder } from './shared';

export function validateCables(
  project: ProjectRoot,
  ports: Map<string, Port>,
  issue: ValidationIssueBuilder,
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
  issue: ValidationIssueBuilder,
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
  issue: ValidationIssueBuilder,
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
  issue: ValidationIssueBuilder,
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
