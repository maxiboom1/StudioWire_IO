import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { ProjectView, ViewLine } from './types';
import { getViewLayoutMetrics, snapViewLayoutPosition } from './viewLayoutGrid';
import { makeLineRouteManual, moveLineSegment } from './viewRouteEditing';
import { snapViewLineSegmentCoordinate, snapViewLineWaypointPosition } from './viewRouteSnapping';
import { getRenderedLineRoute, getViewLineSegments } from './viewRouting';

const view: ProjectView = {
  id: 'view-route-snap',
  name: 'Route snap',
  description: '',
  pageSize: 'a3',
  orientation: 'portrait',
  placements: [
    {
      id: 'router',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 10,
      yMm: 10,
      scale: 1,
      labelOverride: null,
    },
    {
      id: 'multiviewer',
      sourceType: 'device',
      sourceId: 'device-multiviewer-1',
      xMm: 160,
      yMm: 80,
      scale: 1,
      labelOverride: null,
    },
  ],
  lines: [],
  annotations: [],
};

const line: ViewLine = {
  ...sampleProject.views[0].lines[0],
  id: 'line-route-snap',
  from: { kind: 'port', placementId: 'router', portId: 'port-group-router-outputs-port-0001' },
  to: {
    kind: 'port',
    placementId: 'multiviewer',
    portId: 'port-group-multiviewer-inputs-port-0001',
  },
  waypoints: [],
};

describe('View line route-aware snapping', () => {
  it('returns an end-adjacent segment exactly to the live port axis and removes the collapsed elbow', () => {
    const original = makeLineRouteManual(sampleProject, view, line);
    const originalRoute = getRenderedLineRoute(sampleProject, view, original);
    const endSegment = getViewLineSegments(originalRoute).at(-1)!;
    const endpointAxis = endSegment.end.yMm;
    const displacedWaypoints = moveLineSegment(
      sampleProject,
      view,
      original,
      endSegment.index,
      endpointAxis + 30,
    );
    const displacedLine = { ...line, waypoints: displacedWaypoints };
    const displacedSegment = getViewLineSegments(
      getRenderedLineRoute(sampleProject, view, displacedLine),
    ).find((segment) => segment.orientation === 'horizontal' && segment.start.yMm > endpointAxis + 20)!;

    const ordinaryGridCoordinate = snapViewLayoutPosition(
      { xMm: displacedSegment.midpoint.xMm, yMm: endpointAxis },
      1,
    ).yMm;
    expect(ordinaryGridCoordinate).not.toBe(endpointAxis);

    const restoredCoordinate = snapViewLineSegmentCoordinate(
      sampleProject,
      view,
      displacedLine,
      displacedSegment.index,
      endpointAxis + 0.1,
      1,
    );
    expect(restoredCoordinate).toBe(endpointAxis);

    const restoredWaypoints = moveLineSegment(
      sampleProject,
      view,
      displacedLine,
      displacedSegment.index,
      restoredCoordinate,
    );
    expect(getRenderedLineRoute(sampleProject, view, { ...line, waypoints: restoredWaypoints })).toEqual(
      originalRoute,
    );
    expect(restoredWaypoints).toEqual(original.waypoints);
  });

  it('uses the equal-axis page grid away from route axes and magnetically restores bend axes', () => {
    const manual = makeLineRouteManual(sampleProject, view, line);
    const route = getRenderedLineRoute(sampleProject, view, manual);
    const pitch = getViewLayoutMetrics(1).rowPitchMm;
    const freeCoordinate = route[0].yMm + pitch * 3.3;
    const free = snapViewLineSegmentCoordinate(sampleProject, view, manual, 0, freeCoordinate, 1);
    expect(free).toBe(snapViewLayoutPosition({ xMm: 0, yMm: freeCoordinate }, 1).yMm);

    const target = route.at(-1)!;
    expect(
      snapViewLineWaypointPosition(
        sampleProject,
        view,
        manual,
        { xMm: target.xMm + 0.1, yMm: target.yMm + 0.1 },
        1,
      ),
    ).toEqual({ xMm: target.xMm, yMm: target.yMm });
  });
});
