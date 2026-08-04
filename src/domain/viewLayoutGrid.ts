import type { ProjectView, ViewPlacement } from './types';
import {
  DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX,
  DEVICE_DIAGRAM_SOURCE_WIDTH_PX,
  VIEW_DEVICE_WIDTH_MM,
  type ViewSizeMm,
} from './viewGeometry';

export const VIEW_DEVICE_SCALE_OPTIONS = [0.7, 0.8, 0.9, 1] as const;
export type ViewDeviceScale = (typeof VIEW_DEVICE_SCALE_OPTIONS)[number];

export const VIEW_LAYOUT_ORIGIN_MM = 10;

export interface ViewLayoutMetrics {
  originMm: number;
  columnPitchMm: number;
  rowPitchMm: number;
}

export type ViewDeviceScaleState =
  | { kind: 'empty'; scale: 1 }
  | { kind: 'uniform'; scale: ViewDeviceScale }
  | { kind: 'mixed'; scale: null };

export function getViewLayoutMetrics(scale: ViewDeviceScale): ViewLayoutMetrics {
  const pitchMm = roundMm(
    (DEVICE_DIAGRAM_SOURCE_ROW_HEIGHT_PX * VIEW_DEVICE_WIDTH_MM * scale) / DEVICE_DIAGRAM_SOURCE_WIDTH_PX,
  );
  return {
    originMm: VIEW_LAYOUT_ORIGIN_MM,
    columnPitchMm: pitchMm,
    rowPitchMm: pitchMm,
  };
}

export function getViewDeviceScaleState(view: ProjectView): ViewDeviceScaleState {
  const deviceScales = view.placements
    .filter((placement) => placement.sourceType === 'device')
    .map((placement) => placement.scale);

  if (deviceScales.length === 0) {
    return { kind: 'empty', scale: 1 };
  }

  const preset = VIEW_DEVICE_SCALE_OPTIONS.find((scale) => nearlyEqual(scale, deviceScales[0]));
  if (preset && deviceScales.every((scale) => nearlyEqual(scale, preset))) {
    return { kind: 'uniform', scale: preset };
  }

  return { kind: 'mixed', scale: null };
}

export function getViewLayoutScale(view: ProjectView): ViewDeviceScale {
  const state = getViewDeviceScaleState(view);
  return state.kind === 'uniform' ? state.scale : 1;
}

export function isViewDeviceScale(value: number): value is ViewDeviceScale {
  return VIEW_DEVICE_SCALE_OPTIONS.some((scale) => nearlyEqual(scale, value));
}

export function snapViewLayoutPosition(
  position: Pick<ViewPlacement, 'xMm' | 'yMm'>,
  scale: ViewDeviceScale,
): Pick<ViewPlacement, 'xMm' | 'yMm'> {
  const metrics = getViewLayoutMetrics(scale);
  return {
    xMm: snapCoordinate(position.xMm, metrics.originMm, metrics.columnPitchMm),
    yMm: snapCoordinate(position.yMm, metrics.originMm, metrics.rowPitchMm),
  };
}

export function clampViewLayoutPosition(
  position: Pick<ViewPlacement, 'xMm' | 'yMm'>,
  size: ViewSizeMm,
  page: ViewSizeMm,
  scale: ViewDeviceScale,
): Pick<ViewPlacement, 'xMm' | 'yMm'> {
  const metrics = getViewLayoutMetrics(scale);
  return {
    xMm: clampGridCoordinate(
      position.xMm,
      Math.max(0, page.widthMm - size.widthMm),
      metrics.originMm,
      metrics.columnPitchMm,
    ),
    yMm: clampGridCoordinate(
      position.yMm,
      Math.max(0, page.heightMm - size.heightMm),
      metrics.originMm,
      metrics.rowPitchMm,
    ),
  };
}

export function moveViewLayoutPosition(
  position: Pick<ViewPlacement, 'xMm' | 'yMm'>,
  direction: readonly [number, number],
  scale: ViewDeviceScale,
  amount = 1,
): Pick<ViewPlacement, 'xMm' | 'yMm'> {
  const metrics = getViewLayoutMetrics(scale);
  const snapped = snapViewLayoutPosition(position, scale);
  return {
    xMm: roundMm(snapped.xMm + direction[0] * metrics.columnPitchMm * amount),
    yMm: roundMm(snapped.yMm + direction[1] * metrics.rowPitchMm * amount),
  };
}

export function remapViewLayoutPosition(
  position: Pick<ViewPlacement, 'xMm' | 'yMm'>,
  fromScale: ViewDeviceScale,
  toScale: ViewDeviceScale,
): Pick<ViewPlacement, 'xMm' | 'yMm'> {
  const from = getViewLayoutMetrics(fromScale);
  const to = getViewLayoutMetrics(toScale);
  const column = Math.round((position.xMm - from.originMm) / from.columnPitchMm);
  const row = Math.round((position.yMm - from.originMm) / from.rowPitchMm);

  return {
    xMm: roundMm(to.originMm + Math.max(0, column) * to.columnPitchMm),
    yMm: roundMm(to.originMm + Math.max(0, row) * to.rowPitchMm),
  };
}

function snapCoordinate(value: number, origin: number, pitch: number): number {
  return roundMm(origin + Math.max(0, Math.round((value - origin) / pitch)) * pitch);
}

function clampGridCoordinate(value: number, maximum: number, origin: number, pitch: number): number {
  if (maximum < origin) return 0;
  const maximumIndex = Math.max(0, Math.floor((maximum - origin) / pitch));
  const requestedIndex = Math.round((value - origin) / pitch);
  return roundMm(origin + Math.min(maximumIndex, Math.max(0, requestedIndex)) * pitch);
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.000001;
}

function roundMm(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
