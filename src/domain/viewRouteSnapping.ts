import type { ProjectRoot, ProjectView, ViewLine, ViewPoint } from './types';
import { getViewLayoutMetrics, snapViewLayoutPosition, type ViewDeviceScale } from './viewLayoutGrid';
import { getRenderedLineRoute, getViewLineSegments } from './viewRouting';

const SNAP_EPSILON_MM = 0.000001;

export function snapViewLineWaypointPosition(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  point: ViewPoint,
  scale: ViewDeviceScale,
): ViewPoint {
  const route = getRenderedLineRoute(project, view, line);
  const gridPoint = snapViewLayoutPosition(point, scale);
  const thresholdMm = getViewLayoutMetrics(scale).rowPitchMm / 2;
  return {
    xMm: snapCoordinateToRoute(
      point.xMm,
      gridPoint.xMm,
      route.map((candidate) => candidate.xMm),
      thresholdMm,
    ),
    yMm: snapCoordinateToRoute(
      point.yMm,
      gridPoint.yMm,
      route.map((candidate) => candidate.yMm),
      thresholdMm,
    ),
  };
}

export function snapViewLineSegmentCoordinate(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  segmentIndex: number,
  coordinateMm: number,
  scale: ViewDeviceScale,
): number {
  const route = getRenderedLineRoute(project, view, line);
  const segment = getViewLineSegments(route).find((candidate) => candidate.index === segmentIndex);
  if (!segment) return coordinateMm;
  const gridPoint = snapViewLayoutPosition(
    segment.orientation === 'horizontal'
      ? { xMm: segment.midpoint.xMm, yMm: coordinateMm }
      : { xMm: coordinateMm, yMm: segment.midpoint.yMm },
    scale,
  );
  const gridCoordinate = segment.orientation === 'horizontal' ? gridPoint.yMm : gridPoint.xMm;
  const routeCoordinates = route.map((point) =>
    segment.orientation === 'horizontal' ? point.yMm : point.xMm,
  );
  return snapCoordinateToRoute(
    coordinateMm,
    gridCoordinate,
    routeCoordinates,
    getViewLayoutMetrics(scale).rowPitchMm / 2,
  );
}

function snapCoordinateToRoute(
  rawCoordinate: number,
  gridCoordinate: number,
  routeCoordinates: number[],
  thresholdMm: number,
): number {
  const routeCoordinate = routeCoordinates.reduce<number | null>((closest, candidate) => {
    if (Math.abs(candidate - rawCoordinate) > thresholdMm + SNAP_EPSILON_MM) return closest;
    if (closest === null) return candidate;
    return Math.abs(candidate - rawCoordinate) < Math.abs(closest - rawCoordinate) ? candidate : closest;
  }, null);
  if (routeCoordinate === null) return gridCoordinate;
  const routeDistance = Math.abs(routeCoordinate - rawCoordinate);
  const gridDistance = Math.abs(gridCoordinate - rawCoordinate);
  return routeDistance <= gridDistance + SNAP_EPSILON_MM ? routeCoordinate : gridCoordinate;
}
