import type { Device, Location, ProjectInfo, ProjectRoot, Rack, ValidationIssue } from '../../domain/types';

export type SelectedObjectType = 'project' | 'settings' | 'location' | 'rack' | 'device';

export interface SelectionState {
  selectedObjectType: SelectedObjectType | null;
  selectedObjectId: string | null;
}

export type ResolvedSelection =
  | { type: 'project'; value: ProjectInfo }
  | { type: 'settings'; value: ProjectRoot['settings'] }
  | { type: 'location'; value: Location }
  | { type: 'rack'; value: Rack }
  | { type: 'device'; value: Device };

export function resolveSelection(project: ProjectRoot, selection: SelectionState): ResolvedSelection | null {
  if (!selection.selectedObjectType) {
    return null;
  }

  switch (selection.selectedObjectType) {
    case 'project':
      return { type: 'project' as const, value: project.project };
    case 'settings':
      return { type: 'settings' as const, value: project.settings };
    case 'location': {
      const value = project.locations.find((location) => location.id === selection.selectedObjectId);

      return value ? { type: 'location' as const, value } : null;
    }
    case 'rack': {
      const value = project.racks.find((rack) => rack.id === selection.selectedObjectId);

      return value ? { type: 'rack' as const, value } : null;
    }
    case 'device': {
      const value = project.devices.find((device) => device.id === selection.selectedObjectId);

      return value ? { type: 'device' as const, value } : null;
    }
  }
}

export function resolveIssueSelection(
  project: ProjectRoot,
  issue: ValidationIssue,
): { selectedObjectType: SelectedObjectType; selectedObjectId: string } | null {
  if (issue.objectType === 'project') {
    return { selectedObjectType: 'project', selectedObjectId: project.project.id };
  }

  if (issue.objectType === 'location' && project.locations.some((location) => location.id === issue.objectId)) {
    return { selectedObjectType: 'location', selectedObjectId: issue.objectId };
  }

  if (issue.objectType === 'rack' && project.racks.some((rack) => rack.id === issue.objectId)) {
    return { selectedObjectType: 'rack', selectedObjectId: issue.objectId };
  }

  if (issue.objectType === 'device' && project.devices.some((device) => device.id === issue.objectId)) {
    return { selectedObjectType: 'device', selectedObjectId: issue.objectId };
  }

  if (issue.objectType === 'portGroup') {
    const portGroup = project.portGroups.find((candidate) => candidate.id === issue.objectId);

    return portGroup ? { selectedObjectType: 'device', selectedObjectId: portGroup.deviceId } : null;
  }

  if (issue.objectType === 'port') {
    const port = project.ports.find((candidate) => candidate.id === issue.objectId);

    return port ? { selectedObjectType: 'device', selectedObjectId: port.deviceId } : null;
  }

  if (issue.objectType === 'cable') {
    const cable = project.cables.find((candidate) => candidate.id === issue.objectId);
    const endpointPortId =
      cable?.sourceEndpoint.type === 'device_port'
        ? cable.sourceEndpoint.id
        : cable?.destinationEndpoint.type === 'device_port'
          ? cable.destinationEndpoint.id
          : null;
    const port = endpointPortId ? project.ports.find((candidate) => candidate.id === endpointPortId) : null;

    return port ? { selectedObjectType: 'device', selectedObjectId: port.deviceId } : null;
  }

  return null;
}

export function getInspectorRows(
  project: ProjectRoot,
  selected: ResolvedSelection,
): Array<[string, string]> {
  switch (selected.type) {
    case 'project':
      return [
        ['Type', 'Project'],
        ['ID', selected.value.id],
        ['Name', selected.value.name],
        ['Customer', selected.value.customer || 'Not set'],
        ['Revision', selected.value.revision],
        ['Status', selected.value.status],
        ['Created', formatDate(selected.value.createdAt)],
        ['Updated', formatDate(selected.value.updatedAt)],
      ];
    case 'settings':
      return [
        ['Type', 'Settings'],
        ['Categories', String(selected.value.categories.length)],
        ['Connector types', String(selected.value.connectorTypes.length)],
        ['Cable prefixes', String(selected.value.cablePrefixes.length)],
        ['Default rack height', `${selected.value.rackDefaults.heightRu} RU`],
      ];
    case 'location':
      return [
        ['Type', 'Location'],
        ['ID', selected.value.id],
        ['Name', selected.value.name],
        ['Location type', selected.value.type || 'Not set'],
        ['Description', selected.value.description || 'Not set'],
      ];
    case 'rack': {
      const location = project.locations.find((candidate) => candidate.id === selected.value.locationId);

      return [
        ['Type', 'Rack'],
        ['ID', selected.value.id],
        ['Name', selected.value.name],
        ['Location', location?.name ?? selected.value.locationId],
        ['Height', `${selected.value.heightRu} RU`],
        ['Numbering direction', selected.value.numberingDirection],
      ];
    }
    case 'device': {
      const location = project.locations.find((candidate) => candidate.id === selected.value.locationId);
      const rack = selected.value.rackId
        ? project.racks.find((candidate) => candidate.id === selected.value.rackId)
        : null;

      return [
        ['Type', 'Device'],
        ['ID', selected.value.id],
        ['Name', selected.value.name],
        ['Code', selected.value.code || 'Not set'],
        ['Manufacturer', selected.value.manufacturer || 'Not set'],
        ['Model', selected.value.model || 'Not set'],
        ['Location', (location?.name ?? selected.value.locationId) || 'Unassigned'],
        ['Rack', rack?.name ?? 'Not rack-mounted'],
        ['Mount type', selected.value.mountType],
        ['Status', selected.value.status],
      ];
    }
  }
}

export function isSelected(selection: SelectionState, type: SelectedObjectType, id: string) {
  return selection.selectedObjectType === type && selection.selectedObjectId === id;
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
