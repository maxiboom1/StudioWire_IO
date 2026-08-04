import type { ProjectRoot, ProjectView, ViewLine, ViewLineEndpoint, ViewPoint } from './types';
import { resolveViewLineEndpoint } from './viewLineEndpoints';

const ROUTE_EXTENSION_MM = 5;

export function getRenderedLinePoints(project: ProjectRoot, view: ProjectView, line: ViewLine): ViewPoint[] {
  const start = resolveViewLineEndpoint(project, view, line.from)?.point;
  const end = resolveViewLineEndpoint(project, view, line.to)?.point;
  if (!start || !end) return [];
  return normalizeOrthogonalPoints(
    line.waypoints.length
      ? [start, ...line.waypoints, end]
      : getAutomaticLineRoute(project, view, line.from, line.to),
  );
}

export function getAutomaticLineRoute(
  project: ProjectRoot,
  view: ProjectView,
  from: ViewLineEndpoint,
  to: ViewLineEndpoint,
): ViewPoint[] {
  const resolvedFrom = resolveViewLineEndpoint(project, view, from);
  const resolvedTo = resolveViewLineEndpoint(project, view, to);
  if (!resolvedFrom || !resolvedTo) return [];
  const start = resolvedFrom.point;
  const end = resolvedTo.point;
  const fromExtended = extendPoint(start, resolvedFrom.normal.xMm, ROUTE_EXTENSION_MM);
  const toExtended = extendPoint(end, resolvedTo.normal.xMm, ROUTE_EXTENSION_MM);
  if (resolvedFrom.side === resolvedTo.side) {
    const channelX =
      resolvedFrom.side === 'left'
        ? Math.min(fromExtended.xMm, toExtended.xMm) - ROUTE_EXTENSION_MM
        : Math.max(fromExtended.xMm, toExtended.xMm) + ROUTE_EXTENSION_MM;
    return normalizeOrthogonalPoints([
      start,
      fromExtended,
      { xMm: channelX, yMm: fromExtended.yMm },
      { xMm: channelX, yMm: toExtended.yMm },
      toExtended,
      end,
    ]);
  }
  const midX = (fromExtended.xMm + toExtended.xMm) / 2;
  return normalizeOrthogonalPoints([
    start,
    fromExtended,
    { xMm: midX, yMm: fromExtended.yMm },
    { xMm: midX, yMm: toExtended.yMm },
    toExtended,
    end,
  ]);
}

export function normalizeOrthogonalPoints(points: ViewPoint[]): ViewPoint[] {
  const unique = points.filter(
    (point, index) =>
      index === 0 || point.xMm !== points[index - 1].xMm || point.yMm !== points[index - 1].yMm,
  );
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) return true;
    const previous = unique[index - 1];
    const next = unique[index + 1];
    return !(
      (previous.xMm === point.xMm && point.xMm === next.xMm) ||
      (previous.yMm === point.yMm && point.yMm === next.yMm)
    );
  });
}

export function getPolylineMidpoint(points: ViewPoint[]): ViewPoint | null {
  if (points.length === 0) return null;
  const lengths = points
    .slice(1)
    .map((point, index) => Math.hypot(point.xMm - points[index].xMm, point.yMm - points[index].yMm));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let remaining = total / 2;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index]) {
      const start = points[index];
      const end = points[index + 1];
      const ratio = lengths[index] === 0 ? 0 : remaining / lengths[index];
      return {
        xMm: start.xMm + (end.xMm - start.xMm) * ratio,
        yMm: start.yMm + (end.yMm - start.yMm) * ratio,
      };
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
}

function extendPoint(point: ViewPoint, xDirection: -1 | 1, distance: number): ViewPoint {
  return { xMm: point.xMm + xDirection * distance, yMm: point.yMm };
}
