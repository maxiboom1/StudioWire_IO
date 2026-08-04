import type { ViewOrientation, ViewPageSize } from '../../domain/types';

export const VIEW_PIXELS_PER_MM = 3;
export const VIEW_GRID_MM = 2.5;
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
  const portrait = pageSize === 'a4' ? { widthMm: 210, heightMm: 297 } : { widthMm: 297, heightMm: 420 };

  return orientation === 'portrait' ? portrait : { widthMm: portrait.heightMm, heightMm: portrait.widthMm };
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
