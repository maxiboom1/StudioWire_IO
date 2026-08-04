import type { ProjectRoot, ProjectView, ViewLine, ViewPoint } from './types';
import { getViewLineEndpointPoint } from './viewLineEndpoints';
import { getRenderedLinePoints, normalizeOrthogonalPoints } from './viewRouting';

export function makeLineRouteManual(project: ProjectRoot, view: ProjectView, line: ViewLine): ViewLine {
  return line.waypoints.length
    ? line
    : { ...line, waypoints: getRenderedLinePoints(project, view, line).slice(1, -1) };
}

export function moveLineWaypoint(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  waypointIndex: number,
  point: ViewPoint,
): ViewPoint[] {
  const start = getViewLineEndpointPoint(project, view, line.from);
  const end = getViewLineEndpointPoint(project, view, line.to);
  if (!start || !end || !line.waypoints[waypointIndex]) return line.waypoints;
  const full = [start, ...line.waypoints.map((item) => ({ ...item })), end];
  const index = waypointIndex + 1;
  const previous = full[index - 1];
  const current = full[index];
  const next = full[index + 1];
  const previousHorizontal = previous.yMm === current.yMm;
  const nextHorizontal = current.yMm === next.yMm;
  current.xMm = point.xMm;
  current.yMm = point.yMm;
  if (index - 1 === 0) {
    if (previousHorizontal) current.yMm = previous.yMm;
    else current.xMm = previous.xMm;
  } else if (previousHorizontal) previous.yMm = current.yMm;
  else previous.xMm = current.xMm;
  if (index + 1 === full.length - 1) {
    if (nextHorizontal) current.yMm = next.yMm;
    else current.xMm = next.xMm;
  } else if (nextHorizontal) next.yMm = current.yMm;
  else next.xMm = current.xMm;
  return full.slice(1, -1);
}

export function removeLineWaypoint(line: ViewLine, waypointIndex: number): ViewPoint[] {
  return normalizeOrthogonalPoints(line.waypoints.filter((_, index) => index !== waypointIndex));
}

export function insertLineWaypoint(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  point: ViewPoint,
) {
  const manual = makeLineRouteManual(project, view, line);
  const full = getRenderedLinePoints(project, view, manual);
  let segment = 0;
  let distance = Number.POSITIVE_INFINITY;
  let projected = point;
  for (let index = 0; index < full.length - 1; index += 1) {
    const candidate = projectPointToSegment(point, full[index], full[index + 1]);
    const nextDistance = Math.hypot(candidate.xMm - point.xMm, candidate.yMm - point.yMm);
    if (nextDistance < distance) {
      distance = nextDistance;
      segment = index;
      projected = candidate;
    }
  }
  const waypoints = [...manual.waypoints];
  waypoints.splice(segment, 0, projected);
  return waypoints;
}

function projectPointToSegment(point: ViewPoint, start: ViewPoint, end: ViewPoint): ViewPoint {
  if (start.yMm === end.yMm)
    return {
      xMm: Math.min(Math.max(point.xMm, Math.min(start.xMm, end.xMm)), Math.max(start.xMm, end.xMm)),
      yMm: start.yMm,
    };
  return {
    xMm: start.xMm,
    yMm: Math.min(Math.max(point.yMm, Math.min(start.yMm, end.yMm)), Math.max(start.yMm, end.yMm)),
  };
}
