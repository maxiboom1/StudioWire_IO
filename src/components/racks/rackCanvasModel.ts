import type { RackPlacementDiagnostic } from '../../domain/rackDiagnostics';
import type { Device, Location, Rack } from '../../domain/types';

export const MAX_VIEWED_RACKS = 4;
export const ADD_RACK_PLACEHOLDER = '__add_rack__';

const BLOCKING_PLACEMENT_CODES = new Set<RackPlacementDiagnostic['code']>([
  'device-references-missing-rack',
  'rack-mounted-device-without-rack',
  'rack-mounted-device-invalid-size-ru',
  'rack-mounted-device-invalid-bottom-ru',
  'rack-mounted-device-below-ru-one',
  'rack-mounted-device-exceeds-rack-height',
]);

export interface MountedDevice {
  device: Device;
  bottomRu: number;
  topRu: number;
  rowStart: number;
  rowEnd: number;
  diagnostics: RackPlacementDiagnostic[];
}

export interface RackCanvasModel {
  displayRus: number[];
  mountedDevices: MountedDevice[];
  diagnostics: RackPlacementDiagnostic[];
}

export interface PreviewRows {
  rowStart: number;
  rowEnd: number;
}

export function getDisplayRus(rack: Rack): number[] {
  const heightRu = Math.max(0, Math.floor(rack.heightRu));

  return rack.numberingDirection === 'top_to_bottom'
    ? Array.from({ length: heightRu }, (_, index) => index + 1)
    : Array.from({ length: heightRu }, (_, index) => heightRu - index);
}

export function buildRackCanvasModel(
  rack: Rack,
  devices: Device[],
  diagnostics: RackPlacementDiagnostic[],
): RackCanvasModel {
  const displayRus = getDisplayRus(rack);
  const mountedDevices: MountedDevice[] = [];

  for (const device of devices) {
    const mountedDevice = getMountedDeviceRows(rack, device, diagnostics, displayRus);

    if (mountedDevice) {
      mountedDevices.push(mountedDevice);
    }
  }

  return {
    displayRus,
    mountedDevices,
    diagnostics,
  };
}

export function getMountedDeviceRows(
  rack: Rack,
  device: Device,
  diagnostics: RackPlacementDiagnostic[],
  displayRus = getDisplayRus(rack),
): MountedDevice | null {
  const deviceDiagnostics = diagnostics.filter((diagnostic) => diagnostic.deviceId === device.id);
  const hasBlockingDiagnostic = deviceDiagnostics.some((diagnostic) =>
    BLOCKING_PLACEMENT_CODES.has(diagnostic.code),
  );

  if (hasBlockingDiagnostic) {
    return null;
  }

  if (!device.rackSizeRu || device.rackSizeRu <= 0 || !Number.isSafeInteger(device.rackSizeRu)) {
    return null;
  }

  if (!device.rackBottomRu || device.rackBottomRu <= 0 || !Number.isSafeInteger(device.rackBottomRu)) {
    return null;
  }

  const bottomRu = device.rackBottomRu;
  const topRu = device.rackBottomRu + device.rackSizeRu - 1;

  if (bottomRu < 1 || topRu > Math.max(0, Math.floor(rack.heightRu))) {
    return null;
  }

  const occupied = Array.from({ length: device.rackSizeRu }, (_, index) => bottomRu + index);
  const rowIndexes = occupied.map((ru) => displayRus.indexOf(ru) + 1).filter((rowIndex) => rowIndex > 0);

  if (rowIndexes.length === 0) {
    return null;
  }

  return {
    device,
    bottomRu,
    topRu,
    rowStart: Math.min(...rowIndexes),
    rowEnd: Math.max(...rowIndexes) + 1,
    diagnostics: deviceDiagnostics,
  };
}

export function getDiagnosticsForRack(
  diagnostics: RackPlacementDiagnostic[],
  rackId: string,
): RackPlacementDiagnostic[] {
  return diagnostics.filter((diagnostic) => diagnostic.rackId === rackId);
}

export function getPreviewRows(displayRus: number[], bottomRu: number, topRu: number): PreviewRows | null {
  const rowIndexes = Array.from({ length: Math.max(0, topRu - bottomRu + 1) }, (_, index) => bottomRu + index)
    .map((ru) => displayRus.indexOf(ru) + 1)
    .filter((rowIndex) => rowIndex > 0);

  if (rowIndexes.length === 0) {
    const fallbackIndex = displayRus.indexOf(bottomRu) + 1;

    return fallbackIndex > 0 ? { rowStart: fallbackIndex, rowEnd: fallbackIndex + 1 } : null;
  }

  return {
    rowStart: Math.min(...rowIndexes),
    rowEnd: Math.max(...rowIndexes) + 1,
  };
}

export function getRackOptionLabel(rack: Rack, locations: Location[]): string {
  const location = locations.find((candidate) => candidate.id === rack.locationId);

  return location ? `${location.name} / ${rack.name}` : rack.name;
}

export function getViewedRacks(viewedRackIds: string[], racks: Rack[]): Rack[] {
  return viewedRackIds
    .map((rackId) => racks.find((candidate) => candidate.id === rackId))
    .filter((candidate): candidate is Rack => Boolean(candidate));
}

export function getAddableRacks(racks: Rack[], viewedRackIds: string[]): Rack[] {
  return racks.filter((candidate) => !viewedRackIds.includes(candidate.id));
}
