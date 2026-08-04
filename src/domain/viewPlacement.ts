import type { ProjectRoot, ProjectView, ViewPlacement, ViewSourceType } from './types';
import {
  getPlacementBounds,
  getViewPageDimensions,
  isBoundsOutsidePage,
  VIEW_GRID_MM,
  VIEW_PLACEMENT_MAX_SCALE,
  VIEW_PLACEMENT_MIN_SCALE,
  type ViewSizeMm,
} from './viewGeometry';
import { snapViewLayoutPosition, type ViewDeviceScale } from './viewLayoutGrid';

export interface PageClientRect {
  left: number;
  top: number;
}

export function findExistingPlacement(
  view: ProjectView,
  sourceType: ViewSourceType,
  sourceId: string,
): ViewPlacement | null {
  return (
    view.placements.find(
      (placement) => placement.sourceType === sourceType && placement.sourceId === sourceId,
    ) ?? null
  );
}

export function pointToViewPosition(
  clientX: number,
  clientY: number,
  pageRect: PageClientRect,
  zoom: number,
  pixelsPerMm: number,
  bypassSnap: boolean,
  layoutScale: ViewDeviceScale = 1,
): { xMm: number; yMm: number } {
  const raw = {
    xMm: (clientX - pageRect.left) / zoom / pixelsPerMm,
    yMm: (clientY - pageRect.top) / zoom / pixelsPerMm,
  };
  return bypassSnap ? raw : snapViewLayoutPosition(raw, layoutScale);
}

export function snapViewPosition(position: { xMm: number; yMm: number }) {
  return {
    xMm: snapMm(position.xMm),
    yMm: snapMm(position.yMm),
  };
}

export function clampPlacementPosition(
  position: { xMm: number; yMm: number },
  size: ViewSizeMm,
  page: ViewSizeMm,
) {
  return {
    xMm: clamp(position.xMm, 0, Math.max(0, page.widthMm - size.widthMm)),
    yMm: clamp(position.yMm, 0, Math.max(0, page.heightMm - size.heightMm)),
  };
}

export function clampPlacementScale(scale: number): number {
  return clamp(scale, VIEW_PLACEMENT_MIN_SCALE, VIEW_PLACEMENT_MAX_SCALE);
}

export function getPlacementPage(project: ProjectRoot, view: ProjectView) {
  return getViewPageDimensions(view.pageSize, view.orientation);
}

export function isPlacementOutsidePage(
  project: ProjectRoot,
  view: ProjectView,
  placement: ViewPlacement,
): boolean {
  return isBoundsOutsidePage(getPlacementBounds(project, placement), getPlacementPage(project, view));
}

function snapMm(value: number): number {
  return Math.round(value / VIEW_GRID_MM) * VIEW_GRID_MM;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
