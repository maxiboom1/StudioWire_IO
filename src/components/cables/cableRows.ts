import type { Cable, Endpoint, ProjectRoot } from '../../domain/types';

export const EMPTY_CABLE_CELL = 'N/C';

export interface CableTableRow {
  id: string;
  cableNumber: string;
  sideALabel: string;
  sideBLabel: string;
  locationA: string;
  locationB: string;
  connectorA: string;
  connectorB: string;
  status: Cable['status'];
}

interface ResolvedEndpoint {
  label: string;
  location: string;
  connector: string;
}

export function buildCableTableRows(project: ProjectRoot): CableTableRow[] {
  return project.cables.map((cable) => {
    const sideA = resolveEndpoint(project, cable.sideAEndpoint);
    const sideB = resolveEndpoint(project, cable.sideBEndpoint);

    return {
      id: cable.id,
      cableNumber: cable.number,
      sideALabel: sideA.label,
      sideBLabel: sideB.label,
      locationA: sideA.location,
      locationB: sideB.location,
      connectorA: sideA.connector,
      connectorB: sideB.connector,
      status: cable.status,
    };
  });
}

function resolveEndpoint(project: ProjectRoot, endpoint: Endpoint): ResolvedEndpoint {
  if ((endpoint.type !== 'device_port' && endpoint.type !== 'tb_port') || !endpoint.id) {
    return emptyEndpoint();
  }

  const port = project.ports.find((candidate) => candidate.id === endpoint.id);

  if (!port) {
    return emptyEndpoint();
  }

  const device = project.devices.find((candidate) => candidate.id === port.deviceId);
  const locationId =
    device?.locationId ??
    (device?.rackId ? project.racks.find((rack) => rack.id === device.rackId)?.locationId ?? null : null);
  const location = locationId ? project.locations.find((candidate) => candidate.id === locationId) : null;
  const connector = project.settings.connectorTypes.find(
    (connectorType) => connectorType.id === port.connectorTypeId,
  );

  return {
    label: endpoint.label || port.label || EMPTY_CABLE_CELL,
    location: location?.name ?? EMPTY_CABLE_CELL,
    connector: connector?.name ?? EMPTY_CABLE_CELL,
  };
}

function emptyEndpoint(): ResolvedEndpoint {
  return {
    label: EMPTY_CABLE_CELL,
    location: EMPTY_CABLE_CELL,
    connector: EMPTY_CABLE_CELL,
  };
}
