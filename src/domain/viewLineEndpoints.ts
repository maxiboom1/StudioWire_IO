import { getOrderedDevicePortColumns } from './devicePortLayout';
import {
  DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_WIDTH_PX,
  VIEW_DEVICE_WIDTH_MM,
  getPlacementBounds,
} from './viewGeometry';
import { resolveViewPortRange } from './viewPortRanges';
import type {
  Port,
  ProjectRoot,
  ProjectView,
  ViewLineEndpoint,
  ViewPlacement,
  ViewPoint,
  ViewPortRangeAnnotation,
} from './types';

const CABLE_PICKER_SIZE_PX = 18;
const CABLE_PICKER_CENTER_PX = CABLE_PICKER_SIZE_PX / 2;

export interface ResolvedViewLineEndpoint {
  point: ViewPoint;
  side: 'left' | 'right';
  normal: { xMm: -1 | 1; yMm: 0 };
  placement: ViewPlacement;
  port: Port | null;
  range: ViewPortRangeAnnotation | null;
}

export function resolveViewLineEndpoint(
  project: ProjectRoot,
  view: ProjectView,
  endpoint: ViewLineEndpoint,
): ResolvedViewLineEndpoint | null {
  const placement = view.placements.find((candidate) => candidate.id === endpoint.placementId);
  if (!placement || placement.sourceType !== 'device') return null;
  const device = project.devices.find(
    (candidate) => candidate.id === placement.sourceId && candidate.kind === 'device',
  );
  if (!device) return null;

  if (endpoint.kind === 'port') {
    const columns = getOrderedDevicePortColumns(project, device);
    const leftIndex = columns.left.findIndex((port) => port.id === endpoint.portId);
    const rightIndex = columns.right.findIndex((port) => port.id === endpoint.portId);
    if (leftIndex < 0 && rightIndex < 0) return null;
    const side = leftIndex >= 0 ? 'left' : 'right';
    const index = side === 'left' ? leftIndex : rightIndex;
    const port = side === 'left' ? columns.left[index] : columns.right[index];
    return {
      point: getPortAnchorPoint(placement, side, index),
      side,
      normal: { xMm: side === 'left' ? -1 : 1, yMm: 0 },
      placement,
      port,
      range: null,
    };
  }

  const range = view.annotations.find(
    (annotation): annotation is ViewPortRangeAnnotation =>
      annotation.kind === 'port_range' && annotation.id === endpoint.annotationId,
  );
  if (!range || range.placementId !== placement.id) return null;
  const resolved = resolveViewPortRange(project, view, range);
  if (!resolved) return null;
  const bounds = getPlacementBounds(project, placement);
  const mmPerSourcePx = (VIEW_DEVICE_WIDTH_MM / DEVICE_DIAGRAM_SOURCE_WIDTH_PX) * placement.scale;
  const rowCenter =
    placement.yMm +
    (DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX +
      ((resolved.startIndex + resolved.endIndex + 1) / 2) * DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX) *
      mmPerSourcePx;
  const rangeWidthMm = (14 / 3) * placement.scale;
  return {
    point: {
      xMm: range.side === 'left' ? bounds.xMm - rangeWidthMm : bounds.xMm + bounds.widthMm + rangeWidthMm,
      yMm: rowCenter,
    },
    side: range.side,
    normal: { xMm: range.side === 'left' ? -1 : 1, yMm: 0 },
    placement,
    port: null,
    range,
  };
}

export function getViewLineEndpointPoint(
  project: ProjectRoot,
  view: ProjectView,
  endpoint: ViewLineEndpoint,
): ViewPoint | null {
  return resolveViewLineEndpoint(project, view, endpoint)?.point ?? null;
}

export function getCoveredViewPortIds(
  project: ProjectRoot,
  view: ProjectView,
  placementId: string,
): Set<string> {
  const covered = new Set<string>();
  for (const annotation of view.annotations) {
    if (annotation.kind !== 'port_range' || annotation.placementId !== placementId) continue;
    const resolved = resolveViewPortRange(project, view, annotation);
    if (!resolved) continue;
    for (let index = resolved.startIndex; index <= resolved.endIndex; index += 1) {
      covered.add(resolved.ports[index].id);
    }
  }
  return covered;
}

function getPortAnchorPoint(
  placement: ViewPlacement,
  side: 'left' | 'right',
  rowIndex: number,
): ViewPoint {
  const mmPerSourcePx = (VIEW_DEVICE_WIDTH_MM / DEVICE_DIAGRAM_SOURCE_WIDTH_PX) * placement.scale;
  return {
    xMm:
      placement.xMm +
      (side === 'left'
        ? CABLE_PICKER_CENTER_PX
        : DEVICE_DIAGRAM_SOURCE_WIDTH_PX - CABLE_PICKER_CENTER_PX) *
        mmPerSourcePx,
    yMm:
      placement.yMm +
      (DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX +
        rowIndex * DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX +
        DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX / 2) *
        mmPerSourcePx,
  };
}
