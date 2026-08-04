import type { ViewLineLabelOrientation, ViewPoint } from './types';
import type { ViewBounds } from './viewGeometry';

export interface ProjectedViewLineLabel {
  point: ViewPoint;
  labelPosition: number;
  segmentIndex: number;
}

export function getOrthogonalPolylineLength(points: ViewPoint[]): number {
  return points.slice(1).reduce((total, point, index) => total + segmentLength(points[index], point), 0);
}

export function getViewLineLabelPoint(points: ViewPoint[], labelPosition: number): ViewPoint | null {
  if (points.length === 0) return null;
  const total = getOrthogonalPolylineLength(points);
  if (!Number.isFinite(total) || total <= 0) return { ...points[0] };
  let remaining = Math.min(1, Math.max(0, labelPosition)) * total;
  for (let index = 0; index < points.length - 1; index += 1) {
    const length = segmentLength(points[index], points[index + 1]);
    if (remaining <= length || index === points.length - 2) {
      const ratio = length <= 0 ? 0 : remaining / length;
      return {
        xMm: points[index].xMm + (points[index + 1].xMm - points[index].xMm) * ratio,
        yMm: points[index].yMm + (points[index + 1].yMm - points[index].yMm) * ratio,
      };
    }
    remaining -= length;
  }
  return { ...points[points.length - 1] };
}

export function projectViewLineLabelToRoute(
  points: ViewPoint[],
  pointer: ViewPoint,
): ProjectedViewLineLabel | null {
  if (points.length === 0) return null;
  if (points.length === 1) return { point: { ...points[0] }, labelPosition: 0, segmentIndex: 0 };
  const total = getOrthogonalPolylineLength(points);
  let best: ProjectedViewLineLabel | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let elapsed = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const point = projectToOrthogonalSegment(pointer, start, end);
    const distance = Math.hypot(pointer.xMm - point.xMm, pointer.yMm - point.yMm);
    const along = segmentLength(start, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = {
        point,
        labelPosition: total <= 0 ? 0 : Math.min(1, Math.max(0, (elapsed + along) / total)),
        segmentIndex: index,
      };
    }
    elapsed += segmentLength(start, end);
  }
  return best;
}

export function getViewLineLabelBounds(
  point: ViewPoint,
  label: string,
  orientation: ViewLineLabelOrientation,
): ViewBounds {
  const longSideMm = Math.max(4, label.length * 1.8);
  const shortSideMm = 3.4;
  const widthMm = orientation === 'horizontal' ? longSideMm : shortSideMm;
  const heightMm = orientation === 'horizontal' ? shortSideMm : longSideMm;
  return {
    xMm: point.xMm - widthMm / 2,
    yMm: point.yMm - heightMm / 2,
    widthMm,
    heightMm,
  };
}

function segmentLength(start: ViewPoint, end: ViewPoint): number {
  return Math.abs(end.xMm - start.xMm) + Math.abs(end.yMm - start.yMm);
}

function projectToOrthogonalSegment(pointer: ViewPoint, start: ViewPoint, end: ViewPoint): ViewPoint {
  if (start.yMm === end.yMm) {
    return {
      xMm: clamp(pointer.xMm, Math.min(start.xMm, end.xMm), Math.max(start.xMm, end.xMm)),
      yMm: start.yMm,
    };
  }
  return {
    xMm: start.xMm,
    yMm: clamp(pointer.yMm, Math.min(start.yMm, end.yMm), Math.max(start.yMm, end.yMm)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
