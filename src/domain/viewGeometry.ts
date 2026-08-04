import type {
  ProjectRoot,
  ProjectView,
  ViewAnnotation,
  ViewLineEndpoint,
  ViewOrientation,
  ViewPageSize,
  ViewPlacement,
  ViewPoint,
} from './types';
import { getDeviceViewRowCount } from './devicePortLayout';

export const VIEW_GRID_MM = 2.5;
export const VIEW_PLACEMENT_MIN_SCALE = 0.25;
export const VIEW_PLACEMENT_MAX_SCALE = 3;

export const VIEW_DEVICE_WIDTH_MM = 92;
export const DEVICE_DIAGRAM_SOURCE_WIDTH_PX = 940;
export const DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX = 82;
export const DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX = 50;

const DEVICE_DIAGRAM_MM_PER_SOURCE_PX = VIEW_DEVICE_WIDTH_MM / DEVICE_DIAGRAM_SOURCE_WIDTH_PX;
const TERMINAL_BLOCK_HEADER_HEIGHT_MM = 10;
const TERMINAL_BLOCK_ROW_HEIGHT_MM = 2.4;
const RACK_WIDTH_MM = 58;
const RACK_HEADER_HEIGHT_MM = 8;
const RACK_RU_HEIGHT_MM = 3;
const MISSING_SOURCE_WIDTH_MM = 60;
const MISSING_SOURCE_HEIGHT_MM = 30;

const TEXT_HEIGHT_MM = {
  small: 6,
  medium: 8,
  large: 10,
} as const;

export interface ViewSizeMm {
  widthMm: number;
  heightMm: number;
}

export interface ViewBounds extends ViewSizeMm {
  xMm: number;
  yMm: number;
}

export interface ViewPlacementBounds extends ViewBounds {
  sourceMissing: boolean;
}

export function getViewPageDimensions(pageSize: ViewPageSize, orientation: ViewOrientation): ViewSizeMm {
  const portrait = pageSize === 'a4' ? { widthMm: 210, heightMm: 297 } : { widthMm: 297, heightMm: 420 };

  return orientation === 'portrait' ? portrait : { widthMm: portrait.heightMm, heightMm: portrait.widthMm };
}

export function getPlacementNaturalSize(
  project: ProjectRoot,
  placement: ViewPlacement,
): ViewSizeMm & { sourceMissing: boolean } {
  if (placement.sourceType === 'rack') {
    const rack = project.racks.find((candidate) => candidate.id === placement.sourceId);

    return rack
      ? {
          widthMm: RACK_WIDTH_MM,
          heightMm: RACK_HEADER_HEIGHT_MM + rack.heightRu * RACK_RU_HEIGHT_MM,
          sourceMissing: false,
        }
      : missingSourceSize();
  }

  const device = project.devices.find((candidate) => candidate.id === placement.sourceId);

  if (!device) {
    return missingSourceSize();
  }

  const rowCount = getDeviceViewRowCount(project, device);

  return {
    widthMm: VIEW_DEVICE_WIDTH_MM,
    heightMm:
      device.kind === 'terminal_block'
        ? TERMINAL_BLOCK_HEADER_HEIGHT_MM + rowCount * TERMINAL_BLOCK_ROW_HEIGHT_MM
        : getStandardDeviceDiagramHeightMm(rowCount),
    sourceMissing: false,
  };
}

export function getStandardDeviceDiagramHeightMm(rowCount: number): number {
  return (
    (DEVICE_DIAGRAM_SOURCE_HEADER_HEIGHT_PX + rowCount * DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX) *
    DEVICE_DIAGRAM_MM_PER_SOURCE_PX
  );
}

export function getPlacementBounds(project: ProjectRoot, placement: ViewPlacement): ViewPlacementBounds {
  const naturalSize = getPlacementNaturalSize(project, placement);

  return {
    xMm: placement.xMm,
    yMm: placement.yMm,
    widthMm: naturalSize.widthMm * placement.scale,
    heightMm: naturalSize.heightMm * placement.scale,
    sourceMissing: naturalSize.sourceMissing,
  };
}

export function getAnnotationBounds(annotation: ViewAnnotation): ViewBounds | null {
  if (annotation.kind === 'port_range') return null;
  return {
    xMm: annotation.xMm,
    yMm: annotation.yMm,
    widthMm: annotation.widthMm,
    heightMm: annotation.kind === 'group' ? annotation.heightMm : TEXT_HEIGHT_MM[annotation.size],
  };
}

export function getLineEndpointPoint(
  project: ProjectRoot,
  view: ProjectView,
  endpoint: ViewLineEndpoint,
): ViewPoint | null {
  const placement = view.placements.find((candidate) => candidate.id === endpoint.placementId);

  if (!placement) {
    return null;
  }

  const bounds = getPlacementBounds(project, placement);

  switch (endpoint.side) {
    case 'top':
      return { xMm: bounds.xMm + bounds.widthMm * endpoint.offset, yMm: bounds.yMm };
    case 'right':
      return { xMm: bounds.xMm + bounds.widthMm, yMm: bounds.yMm + bounds.heightMm * endpoint.offset };
    case 'bottom':
      return { xMm: bounds.xMm + bounds.widthMm * endpoint.offset, yMm: bounds.yMm + bounds.heightMm };
    case 'left':
      return { xMm: bounds.xMm, yMm: bounds.yMm + bounds.heightMm * endpoint.offset };
  }
}

export function isBoundsOutsidePage(bounds: ViewBounds, page: ViewSizeMm): boolean {
  return (
    bounds.xMm < 0 ||
    bounds.yMm < 0 ||
    bounds.xMm + bounds.widthMm > page.widthMm ||
    bounds.yMm + bounds.heightMm > page.heightMm
  );
}

export function isPointOutsidePage(point: ViewPoint, page: ViewSizeMm): boolean {
  return point.xMm < 0 || point.yMm < 0 || point.xMm > page.widthMm || point.yMm > page.heightMm;
}

function missingSourceSize(): ViewSizeMm & { sourceMissing: true } {
  return {
    widthMm: MISSING_SOURCE_WIDTH_MM,
    heightMm: MISSING_SOURCE_HEIGHT_MM,
    sourceMissing: true,
  };
}
