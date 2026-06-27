import { validateRackPlacement } from '../../domain/rackPlacement';
import type { ProjectRoot, Rack } from '../../domain/types';

export interface RackPointerGeometry {
  top: number;
  height: number;
}

export interface RackDropPreview {
  deviceId: string;
  rackId: string;
  bottomRu: number;
  topRu: number;
  ok: boolean;
  message: string;
}

export function getTargetBottomRuFromPointer(
  geometry: RackPointerGeometry,
  clientY: number,
  displayRus: number[],
): number | null {
  if (displayRus.length === 0) {
    return null;
  }

  const rowHeight = geometry.height / displayRus.length;

  if (rowHeight <= 0) {
    return null;
  }

  const rowIndex = Math.min(
    displayRus.length - 1,
    Math.max(0, Math.floor((clientY - geometry.top) / rowHeight)),
  );

  return displayRus[rowIndex] ?? null;
}

export function buildRackDropPreview(
  project: ProjectRoot,
  rack: Rack,
  deviceId: string,
  bottomRu: number,
): RackDropPreview {
  const result = validateRackPlacement(project, {
    deviceId,
    targetRackId: rack.id,
    targetBottomRu: bottomRu,
  });

  return result.ok
    ? {
        deviceId,
        rackId: rack.id,
        bottomRu: result.targetBottomRu,
        topRu: result.targetTopRu,
        ok: true,
        message: `Move to ${rack.name} RU ${result.targetBottomRu}-${result.targetTopRu}`,
      }
    : {
        deviceId,
        rackId: rack.id,
        bottomRu,
        topRu: bottomRu,
        ok: false,
        message: result.message,
      };
}
