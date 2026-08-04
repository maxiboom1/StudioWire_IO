import type { ProjectRoot, ProjectView, ViewLine, ViewLineEndpoint, ViewPoint } from './types';
import { getLineEndpointPoint, getPlacementBounds } from './viewGeometry';

const ROUTE_EXTENSION_MM = 5;

export function getRenderedLinePoints(project: ProjectRoot, view: ProjectView, line: ViewLine): ViewPoint[] {
  const start = getLineEndpointPoint(project, view, line.from);
  const end = getLineEndpointPoint(project, view, line.to);
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
  const start = getLineEndpointPoint(project, view, from);
  const end = getLineEndpointPoint(project, view, to);
  if (!start || !end) return [];
  const fromHorizontal = from.side === 'left' || from.side === 'right';
  const toHorizontal = to.side === 'left' || to.side === 'right';
  if (fromHorizontal && toHorizontal && from.side !== to.side) {
    const midX = (start.xMm + end.xMm) / 2;
    return normalizeOrthogonalPoints([
      start,
      { xMm: midX, yMm: start.yMm },
      { xMm: midX, yMm: end.yMm },
      end,
    ]);
  }
  if (!fromHorizontal && !toHorizontal && from.side !== to.side) {
    const midY = (start.yMm + end.yMm) / 2;
    return normalizeOrthogonalPoints([
      start,
      { xMm: start.xMm, yMm: midY },
      { xMm: end.xMm, yMm: midY },
      end,
    ]);
  }
  const fromExtended = extendPoint(start, from.side, ROUTE_EXTENSION_MM);
  const toExtended = extendPoint(end, to.side, ROUTE_EXTENSION_MM);
  if (from.side === to.side) {
    const placements = [from.placementId, to.placementId]
      .map((id) => view.placements.find((placement) => placement.id === id))
      .filter((placement): placement is NonNullable<typeof placement> => Boolean(placement));
    const bounds = placements.map((placement) => getPlacementBounds(project, placement));
    if (fromHorizontal) {
      const channelX =
        from.side === 'left'
          ? Math.min(...bounds.map((bound) => bound.xMm)) - ROUTE_EXTENSION_MM * 2
          : Math.max(...bounds.map((bound) => bound.xMm + bound.widthMm)) + ROUTE_EXTENSION_MM * 2;
      return normalizeOrthogonalPoints([
        start,
        fromExtended,
        { xMm: channelX, yMm: fromExtended.yMm },
        { xMm: channelX, yMm: toExtended.yMm },
        toExtended,
        end,
      ]);
    }
    const channelY =
      from.side === 'top'
        ? Math.min(...bounds.map((bound) => bound.yMm)) - ROUTE_EXTENSION_MM * 2
        : Math.max(...bounds.map((bound) => bound.yMm + bound.heightMm)) + ROUTE_EXTENSION_MM * 2;
    return normalizeOrthogonalPoints([
      start,
      fromExtended,
      { xMm: fromExtended.xMm, yMm: channelY },
      { xMm: toExtended.xMm, yMm: channelY },
      toExtended,
      end,
    ]);
  }
  const dx = Math.abs(toExtended.xMm - fromExtended.xMm);
  const dy = Math.abs(toExtended.yMm - fromExtended.yMm);
  const bend =
    dx >= dy
      ? { xMm: toExtended.xMm, yMm: fromExtended.yMm }
      : { xMm: fromExtended.xMm, yMm: toExtended.yMm };
  return normalizeOrthogonalPoints([start, fromExtended, bend, toExtended, end]);
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

function extendPoint(point: ViewPoint, side: ViewLineEndpoint['side'], distance: number): ViewPoint {
  switch (side) {
    case 'left':
      return { xMm: point.xMm - distance, yMm: point.yMm };
    case 'right':
      return { xMm: point.xMm + distance, yMm: point.yMm };
    case 'top':
      return { xMm: point.xMm, yMm: point.yMm - distance };
    case 'bottom':
      return { xMm: point.xMm, yMm: point.yMm + distance };
  }
}
