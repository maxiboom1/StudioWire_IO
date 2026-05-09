import type { Device, ProjectRoot, Rack } from './types';

export interface RackPlacementRequest {
  deviceId: string;
  targetRackId: string;
  targetBottomRu: number;
}

export interface RackPlacementSuccess {
  ok: true;
  device: Device;
  targetRack: Rack;
  targetBottomRu: number;
  targetTopRu: number;
}

export interface RackPlacementFailure {
  ok: false;
  message: string;
}

export type RackPlacementResult = RackPlacementSuccess | RackPlacementFailure;

export function validateRackPlacement(
  project: ProjectRoot,
  request: RackPlacementRequest,
): RackPlacementResult {
  const device = project.devices.find((candidate) => candidate.id === request.deviceId);

  if (!device) {
    return { ok: false, message: 'Device no longer exists.' };
  }

  const targetRack = project.racks.find((candidate) => candidate.id === request.targetRackId);

  if (!targetRack) {
    return { ok: false, message: 'Target rack no longer exists.' };
  }

  const targetLocation = project.locations.find((location) => location.id === targetRack.locationId);

  if (!targetLocation) {
    return { ok: false, message: 'Target rack has no valid location.' };
  }

  const rackSizeRu = device.rackSizeRu;

  if (!Number.isSafeInteger(rackSizeRu) || rackSizeRu === null || rackSizeRu <= 0) {
    return { ok: false, message: 'Set rack size before assigning to a rack.' };
  }

  if (!Number.isSafeInteger(request.targetBottomRu) || request.targetBottomRu < 1) {
    return { ok: false, message: 'Target bottom RU must be at least 1.' };
  }

  const targetTopRu = request.targetBottomRu + rackSizeRu - 1;

  if (targetTopRu > targetRack.heightRu) {
    return {
      ok: false,
      message: `${device.name} would exceed ${targetRack.name} at RU ${request.targetBottomRu}-${targetTopRu}.`,
    };
  }

  const targetRus = createRuSet(request.targetBottomRu, targetTopRu);
  const overlappingDevice = project.devices.find((candidate) => {
    if (candidate.id === device.id || candidate.rackId !== targetRack.id) {
      return false;
    }

    if (
      !Number.isSafeInteger(candidate.rackSizeRu) ||
      candidate.rackSizeRu === null ||
      candidate.rackSizeRu <= 0 ||
      !Number.isSafeInteger(candidate.rackBottomRu) ||
      candidate.rackBottomRu === null ||
      candidate.rackBottomRu <= 0
    ) {
      return false;
    }

    const candidateTopRu = candidate.rackBottomRu + candidate.rackSizeRu - 1;

    return createRuSet(candidate.rackBottomRu, candidateTopRu).some((ru) => targetRus.includes(ru));
  });

  if (overlappingDevice) {
    return {
      ok: false,
      message: `Target RU range overlaps ${overlappingDevice.name}.`,
    };
  }

  return {
    ok: true,
    device,
    targetRack,
    targetBottomRu: request.targetBottomRu,
    targetTopRu,
  };
}

function createRuSet(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}
