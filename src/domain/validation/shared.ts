import { createCategoryAssignmentKey } from '../connectorCompatibility';
import { makeId } from '../id';
import type { Cable, Device, Port, ProjectRoot, ValidationIssue, ValidationSeverity } from '../types';

export type ValidationIssueBuilder = ReturnType<typeof createIssueBuilder>;

export interface ValidationContext {
  categories: Set<string>;
  connectorTypes: Set<string>;
  categoryConnectorAssignments: Set<string>;
  cablePrefixes: Set<string>;
  locations: Set<string>;
  subLocations: Map<string, ProjectRoot['subLocations'][number]>;
  racks: Map<string, ProjectRoot['racks'][number]>;
  devices: Map<string, Device>;
  portGroups: Map<string, ProjectRoot['portGroups'][number]>;
  ports: Map<string, Port>;
}

export function buildValidationContext(project: ProjectRoot): ValidationContext {
  return {
    categories: new Set(project.settings.categories.map((category) => category.id)),
    connectorTypes: new Set(project.settings.connectorTypes.map((connectorType) => connectorType.id)),
    categoryConnectorAssignments: new Set(
      project.settings.categoryConnectorAssignments.map((assignment) =>
        createCategoryAssignmentKey(assignment.categoryId, assignment.connectorTypeId),
      ),
    ),
    cablePrefixes: new Set(project.settings.cablePrefixes.map((prefix) => prefix.prefix)),
    locations: new Set(project.locations.map((location) => location.id)),
    subLocations: new Map(project.subLocations.map((subLocation) => [subLocation.id, subLocation])),
    racks: new Map(project.racks.map((rack) => [rack.id, rack])),
    devices: new Map(project.devices.map((device) => [device.id, device])),
    portGroups: new Map(project.portGroups.map((portGroup) => [portGroup.id, portGroup])),
    ports: new Map(project.ports.map((port) => [port.id, port])),
  };
}

export function createIssueBuilder() {
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

export function countBy<T>(items: T[], getKey: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function isRackPositionValid(
  device: Device,
): device is Device & { rackBottomRu: number; rackSizeRu: number } {
  return isPositiveInteger(device.rackBottomRu) && isPositiveInteger(device.rackSizeRu);
}

export function endpointIdInSet(endpoint: Cable['sideAEndpoint'], ids: Set<string>): boolean {
  return (
    (endpoint.type === 'device_port' || endpoint.type === 'tb_port') &&
    endpoint.id !== null &&
    ids.has(endpoint.id)
  );
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function rangesOverlap(leftFrom: number, leftTo: number, rightFrom: number, rightTo: number): boolean {
  return leftFrom <= rightTo && rightFrom <= leftTo;
}
