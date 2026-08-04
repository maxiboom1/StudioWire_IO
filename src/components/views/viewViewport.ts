import type { ViewOrientation, ViewPageSize } from '../../domain/types';
import {
  getViewPageDimensions as getDomainViewPageDimensions,
  VIEW_GRID_MM as DOMAIN_VIEW_GRID_MM,
} from '../../domain/viewGeometry';

export const VIEW_PIXELS_PER_MM = 3;
export const VIEW_GRID_MM = DOMAIN_VIEW_GRID_MM;
export const VIEW_MIN_ZOOM = 0.25;
export const VIEW_MAX_ZOOM = 3;
export const VIEW_VIEWPORT_PADDING_PX = 32;

export interface ViewPageDimensions {
  widthMm: number;
  heightMm: number;
}

export interface ViewViewportSize {
  width: number;
  height: number;
}

export function getViewPageDimensions(
  pageSize: ViewPageSize,
  orientation: ViewOrientation,
): ViewPageDimensions {
  return getDomainViewPageDimensions(pageSize, orientation);
}

export function clampViewZoom(zoom: number): number {
  return Math.min(VIEW_MAX_ZOOM, Math.max(VIEW_MIN_ZOOM, zoom));
}

export function getFitPageZoom(
  viewport: ViewViewportSize,
  page: ViewPageDimensions,
  paddingPx = VIEW_VIEWPORT_PADDING_PX,
): number {
  const availableWidth = Math.max(0, viewport.width - paddingPx * 2);
  const availableHeight = Math.max(0, viewport.height - paddingPx * 2);

  return clampViewZoom(
    Math.min(
      availableWidth / (page.widthMm * VIEW_PIXELS_PER_MM),
      availableHeight / (page.heightMm * VIEW_PIXELS_PER_MM),
    ),
  );
}

export function getFitWidthZoom(
  viewport: ViewViewportSize,
  page: ViewPageDimensions,
  paddingPx = VIEW_VIEWPORT_PADDING_PX,
): number {
  const availableWidth = Math.max(0, viewport.width - paddingPx * 2);
  return clampViewZoom(availableWidth / (page.widthMm * VIEW_PIXELS_PER_MM));
}
