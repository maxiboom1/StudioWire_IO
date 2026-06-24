import type { Device, ProjectRoot, Rack } from './types';

export interface RackPlacementDiagnostic {
  code:
    | 'rack-mounted-device-without-rack'
    | 'device-references-missing-rack'
    | 'rack-mounted-device-invalid-size-ru'
    | 'rack-mounted-device-invalid-bottom-ru'
    | 'rack-mounted-device-below-ru-one'
    | 'rack-mounted-device-exceeds-rack-height'
    | 'rack-location-device-location-mismatch'
    | 'rack-ru-overlap';
  deviceId: string;
  deviceName: string;
  message: string;
  rackId: string | null;
  severity: 'error' | 'warning';
  bottomRu?: number;
  topRu?: number;
  relatedDeviceId?: string;
}

interface ValidPlacement {
  device: Device;
  rack: Rack;
  bottomRu: number;
  topRu: number;
}

export function analyzeRackPlacements(project: ProjectRoot): RackPlacementDiagnostic[] {
  const diagnostics: RackPlacementDiagnostic[] = [];
  const racks = new Map(project.racks.map((rack) => [rack.id, rack]));
  const validPlacements: ValidPlacement[] = [];

  for (const device of project.devices) {
    if (!isRackRelevant(device)) {
      continue;
    }

    const rack = device.rackId ? racks.get(device.rackId) : null;

    if (!device.rackId && device.mountType === 'rack') {
      diagnostics.push(
        createDiagnostic(
          device,
          null,
          'rack-mounted-device-without-rack',
          'Rack-mounted device requires a rack.',
        ),
      );
      continue;
    }

    if (device.rackId && !rack) {
      diagnostics.push(
        createDiagnostic(
          device,
          device.rackId,
          'device-references-missing-rack',
          `${device.name} references missing rack ${device.rackId}.`,
        ),
      );
      continue;
    }

    if (!rack || device.mountType !== 'rack') {
      continue;
    }

    if (device.locationId && device.locationId !== rack.locationId) {
      diagnostics.push(
        createDiagnostic(
          device,
          rack.id,
          'rack-location-device-location-mismatch',
          `${device.name} is assigned to ${rack.name}, but its location does not match the rack location.`,
        ),
      );
    }

    if (!isPositiveInteger(device.rackSizeRu)) {
      diagnostics.push(
        createDiagnostic(
          device,
          rack.id,
          'rack-mounted-device-invalid-size-ru',
          `${device.name} needs a positive rack size before it can be placed in ${rack.name}.`,
        ),
      );
      continue;
    }

    if (!Number.isSafeInteger(device.rackBottomRu)) {
      diagnostics.push(
        createDiagnostic(
          device,
          rack.id,
          'rack-mounted-device-invalid-bottom-ru',
          `${device.name} needs a valid bottom RU in ${rack.name}.`,
        ),
      );
      continue;
    }

    if ((device.rackBottomRu ?? 0) < 1) {
      diagnostics.push(
        createDiagnostic(
          device,
          rack.id,
          'rack-mounted-device-below-ru-one',
          `${device.name} is below RU 1 in ${rack.name}.`,
          { bottomRu: device.rackBottomRu ?? undefined },
        ),
      );
      continue;
    }

    const bottomRu = device.rackBottomRu as number;
    const rackSizeRu = device.rackSizeRu as number;
    const topRu = bottomRu + rackSizeRu - 1;

    if (topRu > rack.heightRu) {
      diagnostics.push(
        createDiagnostic(
          device,
          rack.id,
          'rack-mounted-device-exceeds-rack-height',
          `${device.name} spans RU ${bottomRu}-${topRu}, exceeding ${rack.name}'s ${rack.heightRu} RU height.`,
          { bottomRu, topRu },
        ),
      );
      continue;
    }

    validPlacements.push({
      device,
      rack,
      bottomRu,
      topRu,
    });
  }

  for (let leftIndex = 0; leftIndex < validPlacements.length; leftIndex += 1) {
    const left = validPlacements[leftIndex];

    for (let rightIndex = leftIndex + 1; rightIndex < validPlacements.length; rightIndex += 1) {
      const right = validPlacements[rightIndex];

      if (
        left.rack.id !== right.rack.id ||
        !rangesOverlap(left.bottomRu, left.topRu, right.bottomRu, right.topRu)
      ) {
        continue;
      }

      diagnostics.push(
        createDiagnostic(
          left.device,
          left.rack.id,
          'rack-ru-overlap',
          `${left.device.name} overlaps ${right.device.name} in ${left.rack.name}.`,
          {
            bottomRu: left.bottomRu,
            topRu: left.topRu,
            relatedDeviceId: right.device.id,
          },
        ),
      );
      diagnostics.push(
        createDiagnostic(
          right.device,
          right.rack.id,
          'rack-ru-overlap',
          `${right.device.name} overlaps ${left.device.name} in ${right.rack.name}.`,
          {
            bottomRu: right.bottomRu,
            topRu: right.topRu,
            relatedDeviceId: left.device.id,
          },
        ),
      );
    }
  }

  return diagnostics;
}

function createDiagnostic(
  device: Device,
  rackId: string | null,
  code: RackPlacementDiagnostic['code'],
  message: string,
  options: Pick<RackPlacementDiagnostic, 'bottomRu' | 'topRu' | 'relatedDeviceId'> = {},
): RackPlacementDiagnostic {
  return {
    code,
    deviceId: device.id,
    deviceName: device.name,
    message,
    rackId,
    severity: 'error',
    ...options,
  };
}

function isRackRelevant(device: Device): boolean {
  return device.mountType === 'rack' || Boolean(device.rackId);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function rangesOverlap(leftFrom: number, leftTo: number, rightFrom: number, rightTo: number): boolean {
  return leftFrom <= rightTo && rightFrom <= leftTo;
}
