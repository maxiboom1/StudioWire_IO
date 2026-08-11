import type { ProjectRoot, ProjectView, ViewLine, ViewLineWaypoint, ViewPoint } from './types';
import {
  getFlexPathIdAtWaypoint,
  getViewFlexPathValidationError,
  moveViewFlexPathWaypoint,
  removeViewFlexPath,
} from './viewFlexPaths';
import {
  getRenderedLineRoute,
  getViewLineSegments,
  materializeViewLineWaypoints,
  type ViewLineSegment,
} from './viewRouting';

const ENDPOINT_STUB_MM = 5;

export type FlexPathCreationFailure = 'segment-missing' | 'segment-too-short' | 'nested' | 'depth-too-small';

export type FlexPathCreationResult =
  | {
      ok: true;
      waypoints: ViewLineWaypoint[];
      flexPathId: string;
      firstWaypointIndex: number;
    }
  | { ok: false; reason: FlexPathCreationFailure };

export function makeLineRouteManual(project: ProjectRoot, view: ProjectView, line: ViewLine): ViewLine {
  return { ...line, waypoints: materializeViewLineWaypoints(project, view, line) };
}

export function moveLineWaypoint(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  waypointIndex: number,
  point: ViewPoint,
): ViewLineWaypoint[] {
  const manual = makeLineRouteManual(project, view, line);
  if (!manual.waypoints[waypointIndex]) return manual.waypoints;
  const flexMoved = moveViewFlexPathWaypoint(manual.waypoints, waypointIndex, point.xMm, point.yMm);
  if (flexMoved) return canonicalizeLineWaypoints(project, view, manual, flexMoved);

  const route = getRenderedLineRoute(project, view, manual).map((item) => ({ ...item }));
  const index = waypointIndex + 1;
  const previous = route[index - 1];
  const current = route[index];
  const next = route[index + 1];
  if (!previous || !current || !next) return manual.waypoints;
  const previousHorizontal = previous.yMm === current.yMm;
  const nextHorizontal = current.yMm === next.yMm;
  current.xMm = point.xMm;
  current.yMm = point.yMm;
  if (index - 1 === 0) {
    if (previousHorizontal) current.yMm = previous.yMm;
    else current.xMm = previous.xMm;
  } else if (previousHorizontal) previous.yMm = current.yMm;
  else previous.xMm = current.xMm;
  if (index + 1 === route.length - 1) {
    if (nextHorizontal) current.yMm = next.yMm;
    else current.xMm = next.xMm;
  } else if (nextHorizontal) next.yMm = current.yMm;
  else next.xMm = current.xMm;
  return canonicalizeLineWaypoints(project, view, manual, route.slice(1, -1));
}

export function removeLineWaypoint(line: ViewLine, waypointIndex: number): ViewLineWaypoint[] {
  const flexPathId = getFlexPathIdAtWaypoint(line.waypoints, waypointIndex);
  return flexPathId
    ? removeViewFlexPath(line.waypoints, flexPathId)
    : line.waypoints.filter((_, index) => index !== waypointIndex);
}

export function createLineFlexPath(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  segmentIndex: number,
  gridPitchMm: number,
  depthMm: number,
  flexPathId: string,
): FlexPathCreationResult {
  const manual = makeLineRouteManual(project, view, line);
  const route = getRenderedLineRoute(project, view, manual);
  const segment = getViewLineSegments(route).find((candidate) => candidate.index === segmentIndex);
  if (!segment) return { ok: false, reason: 'segment-missing' };
  if (segment.flexPathId) return { ok: false, reason: 'nested' };
  if (segment.lengthMm + 0.000001 < gridPitchMm * 4) {
    return { ok: false, reason: 'segment-too-short' };
  }
  if (Math.abs(depthMm) < 1) {
    return { ok: false, reason: 'depth-too-small' };
  }

  const halfSpan = gridPitchMm;
  const center = segment.midpoint;
  const direction =
    segment.orientation === 'horizontal'
      ? Math.sign(segment.end.xMm - segment.start.xMm) || 1
      : Math.sign(segment.end.yMm - segment.start.yMm) || 1;
  const firstAlong = (segment.orientation === 'horizontal' ? center.xMm : center.yMm) - halfSpan * direction;
  const lastAlong = (segment.orientation === 'horizontal' ? center.xMm : center.yMm) + halfSpan * direction;
  const points: ViewLineWaypoint[] =
    segment.orientation === 'horizontal'
      ? [
          { xMm: firstAlong, yMm: center.yMm, flexPathId },
          { xMm: firstAlong, yMm: center.yMm + depthMm, flexPathId },
          { xMm: lastAlong, yMm: center.yMm + depthMm, flexPathId },
          { xMm: lastAlong, yMm: center.yMm, flexPathId },
        ]
      : [
          { xMm: center.xMm, yMm: firstAlong, flexPathId },
          { xMm: center.xMm + depthMm, yMm: firstAlong, flexPathId },
          { xMm: center.xMm + depthMm, yMm: lastAlong, flexPathId },
          { xMm: center.xMm, yMm: lastAlong, flexPathId },
        ];
  const full = [...route.slice(0, segment.index + 1), ...points, ...route.slice(segment.index + 1)];
  const waypoints = full.slice(1, -1);
  if (getViewFlexPathValidationError(waypoints)) return { ok: false, reason: 'nested' };
  return {
    ok: true,
    waypoints,
    flexPathId,
    firstWaypointIndex: segment.index,
  };
}

export function moveLineSegment(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  segmentIndex: number,
  coordinateMm: number,
): ViewLineWaypoint[] {
  const manual = makeLineRouteManual(project, view, line);
  const route = getRenderedLineRoute(project, view, manual).map((point) => ({ ...point }));
  const segment = getViewLineSegments(route).find((candidate) => candidate.index === segmentIndex);
  if (!segment) return manual.waypoints;

  let moved: ViewLineWaypoint[];
  if (segment.flexPathId) {
    moved = moveFlexSegment(route, segment, coordinateMm);
  } else if (segment.touchesFlexPath) {
    moved = moveFlexAdjacentSegment(route, segment, coordinateMm);
  } else if (segment.index === 0) {
    moved = moveStartSegment(route, segment, coordinateMm);
  } else if (segment.index === route.length - 2) {
    moved = moveEndSegment(route, segment, coordinateMm);
  } else {
    if (segment.orientation === 'horizontal') {
      route[segment.index].yMm = coordinateMm;
      route[segment.index + 1].yMm = coordinateMm;
    } else {
      route[segment.index].xMm = coordinateMm;
      route[segment.index + 1].xMm = coordinateMm;
    }
    moved = route.slice(1, -1);
  }
  return canonicalizeLineWaypoints(project, view, manual, moved);
}

export function isLineSegmentFlexEligible(segment: ViewLineSegment, gridPitchMm: number): boolean {
  return !segment.flexPathId && segment.lengthMm + 0.000001 >= gridPitchMm * 4;
}

function moveFlexSegment(
  route: ViewLineWaypoint[],
  segment: ViewLineSegment,
  coordinateMm: number,
): ViewLineWaypoint[] {
  const original = route.slice(1, -1).map((point) => ({ ...point }));
  const flexPathId = segment.flexPathId!;
  if (segment.orientation === 'horizontal') {
    route[segment.index].yMm = coordinateMm;
    route[segment.index + 1].yMm = coordinateMm;
  } else {
    route[segment.index].xMm = coordinateMm;
    route[segment.index + 1].xMm = coordinateMm;
  }
  const waypoints = route.slice(1, -1);
  const flexPoints = waypoints.filter((point) => point.flexPathId === flexPathId);
  if (flexPoints.length === 4) {
    const collapsed =
      (flexPoints[0].yMm === flexPoints[3].yMm && flexPoints[0].yMm === flexPoints[1].yMm) ||
      (flexPoints[0].xMm === flexPoints[3].xMm && flexPoints[0].xMm === flexPoints[1].xMm);
    if (collapsed) return removeViewFlexPath(waypoints, flexPathId);
  }
  return getViewFlexPathValidationError(waypoints) ? original : waypoints;
}

function moveFlexAdjacentSegment(
  route: ViewLineWaypoint[],
  segment: ViewLineSegment,
  coordinateMm: number,
): ViewLineWaypoint[] {
  const original = route.slice(1, -1).map((point) => ({ ...point }));
  const flexPathId = segment.start.flexPathId ?? segment.end.flexPathId;
  if (!flexPathId) return route.slice(1, -1);
  const indices = route.flatMap((point, index) => (point.flexPathId === flexPathId ? [index] : []));
  if (indices.length !== 4) return route.slice(1, -1);
  const [firstIndex, secondIndex, thirdIndex, fourthIndex] = indices;
  const horizontal = route[firstIndex].yMm === route[fourthIndex].yMm;
  const vertical = route[firstIndex].xMm === route[fourthIndex].xMm;
  if (
    (horizontal && segment.orientation !== 'horizontal') ||
    (vertical && segment.orientation !== 'vertical') ||
    (!horizontal && !vertical)
  ) {
    return route.slice(1, -1);
  }

  if (horizontal) {
    route[firstIndex].yMm = coordinateMm;
    route[fourthIndex].yMm = coordinateMm;
    if (route[firstIndex - 1]) route[firstIndex - 1].yMm = coordinateMm;
    if (route[fourthIndex + 1]) route[fourthIndex + 1].yMm = coordinateMm;
    if (coordinateMm === route[secondIndex].yMm && coordinateMm === route[thirdIndex].yMm) {
      return removeViewFlexPath(route.slice(1, -1), flexPathId);
    }
  } else {
    route[firstIndex].xMm = coordinateMm;
    route[fourthIndex].xMm = coordinateMm;
    if (route[firstIndex - 1]) route[firstIndex - 1].xMm = coordinateMm;
    if (route[fourthIndex + 1]) route[fourthIndex + 1].xMm = coordinateMm;
    if (coordinateMm === route[secondIndex].xMm && coordinateMm === route[thirdIndex].xMm) {
      return removeViewFlexPath(route.slice(1, -1), flexPathId);
    }
  }

  const waypoints = route.slice(1, -1);
  return getViewFlexPathValidationError(waypoints) ? original : waypoints;
}

function moveStartSegment(
  route: ViewLineWaypoint[],
  segment: ViewLineSegment,
  coordinateMm: number,
): ViewLineWaypoint[] {
  const start = route[0];
  const next = route[1];
  if (segment.orientation === 'vertical') {
    next.xMm = coordinateMm;
    return route.slice(1, -1);
  }
  if (coordinateMm === start.yMm) return route.slice(1, -1);
  const direction = Math.sign(next.xMm - start.xMm) || 1;
  const stubX = start.xMm + direction * Math.min(ENDPOINT_STUB_MM, segment.lengthMm / 2);
  return [
    { xMm: stubX, yMm: start.yMm, flexPathId: null },
    { xMm: stubX, yMm: coordinateMm, flexPathId: null },
    { ...next, yMm: coordinateMm },
    ...route.slice(2, -1),
  ];
}

function moveEndSegment(
  route: ViewLineWaypoint[],
  segment: ViewLineSegment,
  coordinateMm: number,
): ViewLineWaypoint[] {
  const previous = route.at(-2)!;
  const end = route.at(-1)!;
  if (segment.orientation === 'vertical') {
    previous.xMm = coordinateMm;
    return route.slice(1, -1);
  }
  if (coordinateMm === end.yMm) return route.slice(1, -1);
  const direction = Math.sign(previous.xMm - end.xMm) || 1;
  const stubX = end.xMm + direction * Math.min(ENDPOINT_STUB_MM, segment.lengthMm / 2);
  return [
    ...route.slice(1, -2),
    { ...previous, yMm: coordinateMm },
    { xMm: stubX, yMm: coordinateMm, flexPathId: null },
    { xMm: stubX, yMm: end.yMm, flexPathId: null },
  ];
}

function canonicalizeLineWaypoints(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  waypoints: ViewLineWaypoint[],
): ViewLineWaypoint[] {
  if (!waypoints.length) return [];
  return materializeViewLineWaypoints(project, view, { ...line, waypoints });
}
