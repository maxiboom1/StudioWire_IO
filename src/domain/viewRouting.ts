import type {
  ProjectRoot,
  ProjectView,
  ViewLine,
  ViewLineEndpoint,
  ViewLineWaypoint,
  ViewPoint,
} from './types';
import { resolveViewLineEndpoint } from './viewLineEndpoints';

const ROUTE_EXTENSION_MM = 5;

interface TaggedRoutePoint extends ViewLineWaypoint {
  source: 'endpoint' | 'derived' | 'waypoint';
}

export interface ViewLineSegment {
  index: number;
  start: ViewLineWaypoint;
  end: ViewLineWaypoint;
  orientation: 'horizontal' | 'vertical';
  lengthMm: number;
  midpoint: ViewPoint;
  flexPathId: string | null;
  touchesFlexPath: boolean;
}

export function getRenderedLinePoints(project: ProjectRoot, view: ProjectView, line: ViewLine): ViewPoint[] {
  return getRenderedLineRoute(project, view, line).map(({ xMm, yMm }) => ({ xMm, yMm }));
}

export function getRenderedLineRoute(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
): ViewLineWaypoint[] {
  const from = resolveViewLineEndpoint(project, view, line.from);
  const to = resolveViewLineEndpoint(project, view, line.to);
  if (!from || !to) return [];
  if (!line.waypoints.length) {
    return getAutomaticLineRoute(project, view, line.from, line.to).map((point) => ({
      ...point,
      flexPathId: null,
    }));
  }

  const start = tagged(from.point, null, 'endpoint');
  const end = tagged(to.point, null, 'endpoint');
  const startStub = tagged(extendPoint(from.point, from.normal.xMm, ROUTE_EXTENSION_MM), null, 'derived');
  const endStub = tagged(extendPoint(to.point, to.normal.xMm, ROUTE_EXTENSION_MM), null, 'derived');
  const requested = [
    start,
    startStub,
    ...line.waypoints.map((point) => tagged(point, point.flexPathId, 'waypoint')),
    endStub,
    end,
  ];
  return normalizeTaggedRoute(orthogonalizeTaggedRoute(requested)).map(
    ({ source: _source, ...point }) => point,
  );
}

export function materializeViewLineWaypoints(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
): ViewLineWaypoint[] {
  return getRenderedLineRoute(project, view, line).slice(1, -1);
}

export function getViewLineSegments(points: ViewLineWaypoint[]): ViewLineSegment[] {
  return points.slice(1).flatMap((end, index) => {
    const start = points[index];
    const horizontal = start.yMm === end.yMm;
    const vertical = start.xMm === end.xMm;
    if (!horizontal && !vertical) return [];
    const lengthMm = horizontal ? Math.abs(end.xMm - start.xMm) : Math.abs(end.yMm - start.yMm);
    if (lengthMm === 0) return [];
    return [
      {
        index,
        start,
        end,
        orientation: horizontal ? 'horizontal' : 'vertical',
        lengthMm,
        midpoint: { xMm: (start.xMm + end.xMm) / 2, yMm: (start.yMm + end.yMm) / 2 },
        flexPathId: start.flexPathId && start.flexPathId === end.flexPathId ? start.flexPathId : null,
        touchesFlexPath: Boolean(start.flexPathId || end.flexPathId),
      },
    ];
  });
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

function orthogonalizeTaggedRoute(points: TaggedRoutePoint[]): TaggedRoutePoint[] {
  const result: TaggedRoutePoint[] = [];
  for (const target of points) {
    const previous = result.at(-1);
    if (!previous) {
      result.push(target);
      continue;
    }
    if (previous.xMm !== target.xMm && previous.yMm !== target.yMm) {
      result.push(tagged({ xMm: target.xMm, yMm: previous.yMm }, null, 'derived'));
    }
    result.push(target);
  }
  return result;
}

function normalizeTaggedRoute(points: TaggedRoutePoint[]): TaggedRoutePoint[] {
  const unique: TaggedRoutePoint[] = [];
  for (const point of points) {
    const previous = unique.at(-1);
    if (previous && previous.xMm === point.xMm && previous.yMm === point.yMm) {
      if (point.source === 'waypoint' && previous.source !== 'waypoint') unique[unique.length - 1] = point;
      continue;
    }
    unique.push(point);
  }
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1 || point.flexPathId) return true;
    const previous = unique[index - 1];
    const next = unique[index + 1];
    return !(
      (previous.xMm === point.xMm && point.xMm === next.xMm) ||
      (previous.yMm === point.yMm && point.yMm === next.yMm)
    );
  });
}

function tagged(
  point: ViewPoint,
  flexPathId: string | null,
  source: TaggedRoutePoint['source'],
): TaggedRoutePoint {
  return { xMm: point.xMm, yMm: point.yMm, flexPathId, source };
}

function extendPoint(point: ViewPoint, xDirection: -1 | 1, distance: number): ViewPoint {
  return { xMm: point.xMm + xDirection * distance, yMm: point.yMm };
}
