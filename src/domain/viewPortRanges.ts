import { getOrderedDevicePortColumns } from './devicePortLayout';
import {
  DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_WIDTH_PX,
  VIEW_DEVICE_WIDTH_MM,
  getPlacementBounds,
  type ViewBounds,
} from './viewGeometry';
import type { Port, ProjectRoot, ProjectView, ViewPlacement, ViewPortRangeAnnotation } from './types';

export interface ResolvedViewPortRange {
  placement: ViewPlacement;
  ports: Port[];
  startIndex: number;
  endIndex: number;
  startPort: Port;
  endPort: Port;
}

export const VIEW_PORT_RANGE_OVERLAY_WIDTH_MM = 14 / 3;

export function resolveViewPortRange(
  project: ProjectRoot,
  view: ProjectView,
  range: ViewPortRangeAnnotation,
): ResolvedViewPortRange | null {
  const placement = view.placements.find((candidate) => candidate.id === range.placementId);
  if (!placement || placement.sourceType !== 'device') return null;
  const device = project.devices.find(
    (candidate) => candidate.id === placement.sourceId && candidate.kind === 'device',
  );
  if (!device) return null;
  const ports = getOrderedDevicePortColumns(project, device)[range.side];
  const first = ports.findIndex((port) => port.id === range.startPortId);
  const second = ports.findIndex((port) => port.id === range.endPortId);
  if (first < 0 || second < 0) return null;
  const startIndex = Math.min(first, second);
  const endIndex = Math.max(first, second);
  return {
    placement,
    ports,
    startIndex,
    endIndex,
    startPort: ports[startIndex],
    endPort: ports[endIndex],
  };
}

export function normalizeViewPortRange(
  project: ProjectRoot,
  view: ProjectView,
  range: ViewPortRangeAnnotation,
): ViewPortRangeAnnotation | null {
  const resolved = resolveViewPortRange(project, view, range);
  return resolved
    ? {
        ...range,
        startPortId: resolved.startPort.id,
        endPortId: resolved.endPort.id,
      }
    : null;
}

export function viewPortRangesOverlap(
  project: ProjectRoot,
  view: ProjectView,
  candidate: ViewPortRangeAnnotation,
  excludedId?: string,
): boolean {
  const target = resolveViewPortRange(project, view, candidate);
  if (!target) return false;
  return view.annotations.some((annotation) => {
    if (
      annotation.kind !== 'port_range' ||
      annotation.id === excludedId ||
      annotation.placementId !== candidate.placementId ||
      annotation.side !== candidate.side
    ) {
      return false;
    }
    const existing = resolveViewPortRange(project, view, annotation);
    return Boolean(
      existing && target.startIndex <= existing.endIndex && existing.startIndex <= target.endIndex,
    );
  });
}

export function getViewPortRangeBounds(
  project: ProjectRoot,
  view: ProjectView,
  range: ViewPortRangeAnnotation,
): ViewBounds | null {
  const resolved = resolveViewPortRange(project, view, range);
  if (!resolved) return null;
  const placementBounds = getPlacementBounds(project, resolved.placement);
  const mmPerSourcePx = VIEW_DEVICE_WIDTH_MM / DEVICE_DIAGRAM_SOURCE_WIDTH_PX;
  const rowHeightMm = DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX * mmPerSourcePx * resolved.placement.scale;
  const headerMm = DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX * mmPerSourcePx * resolved.placement.scale;
  const outsideMm = VIEW_PORT_RANGE_OVERLAY_WIDTH_MM * resolved.placement.scale;
  return {
    xMm:
      range.side === 'left' ? placementBounds.xMm - outsideMm : placementBounds.xMm + placementBounds.widthMm,
    yMm: placementBounds.yMm + headerMm + resolved.startIndex * rowHeightMm,
    widthMm: outsideMm,
    heightMm: (resolved.endIndex - resolved.startIndex + 1) * rowHeightMm,
  };
}

export function getPortRangeRows(
  project: ProjectRoot,
  placement: ViewPlacement,
  side: 'left' | 'right',
): Port[] {
  if (placement.sourceType !== 'device') return [];
  const device = project.devices.find(
    (candidate) => candidate.id === placement.sourceId && candidate.kind === 'device',
  );
  return device ? getOrderedDevicePortColumns(project, device)[side] : [];
}
