import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { ProjectView, ViewLine } from './types';
import { getViewFlexPathGroups } from './viewFlexPaths';
import {
  createLineFlexPath,
  makeLineRouteManual,
  moveLineSegment,
  moveLineWaypoint,
  removeLineWaypoint,
} from './viewRouteEditing';
import { DEFAULT_VIEW_LINE_STYLE } from './viewLineStyles';
import { getRenderedLineRoute, getViewLineSegments } from './viewRouting';

const view: ProjectView = {
  id: 'view',
  name: 'View',
  description: '',
  pageSize: 'a3',
  orientation: 'portrait',
  placements: [
    {
      id: 'a',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 10,
      yMm: 10,
      scale: 1,
      labelOverride: null,
    },
    {
      id: 'b',
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
  id: 'line',
  from: { kind: 'port', placementId: 'a', portId: 'port-group-router-outputs-port-0001' },
  to: { kind: 'port', placementId: 'b', portId: 'port-group-multiviewer-inputs-port-0001' },
  label: '',
  waypoints: [],
  ...DEFAULT_VIEW_LINE_STYLE,
};

describe('View route editing', () => {
  it('materializes automatic bends and moves them without diagonal legs', () => {
    const manual = makeLineRouteManual(sampleProject, view, line);
    expect(manual.waypoints.length).toBeGreaterThan(0);
    const moved = moveLineWaypoint(sampleProject, view, manual, 0, { xMm: 130, yMm: 999 });
    expect(moved[0].yMm).toBe(manual.waypoints[0].yMm);
  });

  it('removes a selected bend while retaining the line route data', () => {
    expect(
      removeLineWaypoint(
        {
          ...line,
          waypoints: [
            { xMm: 1, yMm: 1, flexPathId: null },
            { xMm: 1, yMm: 2, flexPathId: null },
          ],
        },
        0,
      ),
    ).toEqual([{ xMm: 1, yMm: 2, flexPathId: null }]);
  });

  it.each(['horizontal', 'vertical'] as const)(
    'creates one four-corner %s Flex path on an eligible straight segment',
    (orientation) => {
      const manual = makeLineRouteManual(sampleProject, view, line);
      const segment = getViewLineSegments(getRenderedLineRoute(sampleProject, view, manual)).find(
        (candidate) => candidate.orientation === orientation && candidate.lengthMm >= 10,
      );
      expect(segment).toBeTruthy();
      const result = createLineFlexPath(
        sampleProject,
        view,
        manual,
        segment!.index,
        2.5,
        7.5,
        `flex-${orientation}`,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.waypoints.filter((point) => point.flexPathId === result.flexPathId)).toHaveLength(4);
      expect(getViewFlexPathGroups(result.waypoints)).toEqual([
        expect.objectContaining({ id: result.flexPathId, orientation }),
      ]);
      expect(
        isOrthogonal(getRenderedLineRoute(sampleProject, view, { ...line, waypoints: result.waypoints })),
      ).toBe(true);
    },
  );

  it('rejects short segments and removes a complete Flex when any grouped corner is deleted', () => {
    const manual = makeLineRouteManual(sampleProject, view, line);
    const short = getViewLineSegments(getRenderedLineRoute(sampleProject, view, manual))[0];
    expect(
      createLineFlexPath(sampleProject, view, manual, short.index, short.lengthMm, 5, 'flex-short'),
    ).toEqual({
      ok: false,
      reason: 'segment-too-short',
    });
    const depthSegment = getViewLineSegments(getRenderedLineRoute(sampleProject, view, manual)).find(
      (segment) => segment.lengthMm >= 10,
    )!;
    expect(
      createLineFlexPath(sampleProject, view, manual, depthSegment.index, 2.5, 0.99, 'flex-shallow'),
    ).toEqual({ ok: false, reason: 'depth-too-small' });

    const eligible = getViewLineSegments(getRenderedLineRoute(sampleProject, view, manual)).find(
      (segment) => segment.orientation === 'horizontal' && segment.lengthMm >= 10,
    )!;
    const created = createLineFlexPath(sampleProject, view, manual, eligible.index, 2.5, 5, 'flex-delete');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const groupedIndex = created.waypoints.findIndex((point) => point.flexPathId === 'flex-delete');
    expect(removeLineWaypoint({ ...line, waypoints: created.waypoints }, groupedIndex)).toEqual(
      created.waypoints.filter((point) => point.flexPathId !== 'flex-delete'),
    );
  });

  it('moves complete segments in parallel and collapses a Flex returned to its original axis', () => {
    const manual = makeLineRouteManual(sampleProject, view, line);
    const horizontal = getViewLineSegments(getRenderedLineRoute(sampleProject, view, manual)).find(
      (segment) => segment.orientation === 'horizontal' && segment.index > 0 && segment.lengthMm >= 10,
    )!;
    const moved = moveLineSegment(sampleProject, view, manual, horizontal.index, horizontal.start.yMm + 10);
    expect(isOrthogonal(getRenderedLineRoute(sampleProject, view, { ...line, waypoints: moved }))).toBe(true);

    const created = createLineFlexPath(
      sampleProject,
      view,
      manual,
      horizontal.index,
      2.5,
      5,
      'flex-collapse',
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const flexLine = { ...line, waypoints: created.waypoints };
    const flexGroup = getViewFlexPathGroups(created.waypoints)[0];
    const middle = getViewLineSegments(getRenderedLineRoute(sampleProject, view, flexLine)).find(
      (segment) => segment.flexPathId === flexGroup.id && segment.orientation === flexGroup.orientation,
    )!;
    const originalAxis =
      flexGroup.orientation === 'horizontal' ? flexGroup.waypoints[0].yMm : flexGroup.waypoints[0].xMm;
    const collapsed = moveLineSegment(sampleProject, view, flexLine, middle.index, originalAxis);
    expect(collapsed.some((point) => point.flexPathId === flexGroup.id)).toBe(false);
  });

  it('moves a Flex-adjacent axis segment without creating an inert or diagonal control', () => {
    const manual = makeLineRouteManual(sampleProject, view, line);
    const horizontal = getViewLineSegments(getRenderedLineRoute(sampleProject, view, manual)).find(
      (segment) => segment.orientation === 'horizontal' && segment.lengthMm >= 10,
    )!;
    const created = createLineFlexPath(sampleProject, view, manual, horizontal.index, 2.5, 5, 'flex-axis');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const flexLine = { ...line, waypoints: created.waypoints };
    const adjacent = getViewLineSegments(getRenderedLineRoute(sampleProject, view, flexLine)).find(
      (segment) => segment.touchesFlexPath && !segment.flexPathId,
    )!;
    const coordinate =
      adjacent.orientation === 'horizontal' ? adjacent.start.yMm + 3 : adjacent.start.xMm + 3;
    const moved = moveLineSegment(sampleProject, view, flexLine, adjacent.index, coordinate);
    expect(getViewFlexPathGroups(moved)).toHaveLength(1);
    expect(isOrthogonal(getRenderedLineRoute(sampleProject, view, { ...line, waypoints: moved }))).toBe(true);
    expect(moved).not.toEqual(created.waypoints);
  });

  it('keeps every project engineering record unchanged while editing route presentation', () => {
    const project = structuredClone(sampleProject);
    const before = structuredClone(project);
    const manual = makeLineRouteManual(project, view, line);
    const segment = getViewLineSegments(getRenderedLineRoute(project, view, manual)).find(
      (candidate) => candidate.orientation === 'horizontal' && candidate.lengthMm >= 10,
    )!;
    const created = createLineFlexPath(project, view, manual, segment.index, 2.5, 5, 'flex-isolated');
    expect(created.ok).toBe(true);
    if (created.ok) {
      moveLineSegment(project, view, { ...line, waypoints: created.waypoints }, segment.index, 60);
      removeLineWaypoint({ ...line, waypoints: created.waypoints }, created.firstWaypointIndex);
    }
    expect(project).toEqual(before);
  });
});

function isOrthogonal(points: Array<{ xMm: number; yMm: number }>) {
  return points
    .slice(1)
    .every((point, index) => point.xMm === points[index].xMm || point.yMm === points[index].yMm);
}
