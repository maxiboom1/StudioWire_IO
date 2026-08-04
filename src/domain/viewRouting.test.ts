import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { ProjectView, ViewLine } from './types';
import { getAutomaticLineRoute, getRenderedLinePoints, normalizeOrthogonalPoints } from './viewRouting';

function view(): ProjectView {
  return {
    id: 'view-routing',
    name: 'Routing',
    description: '',
    pageSize: 'a3',
    orientation: 'landscape',
    placements: [
      {
        id: 'a',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 20,
        yMm: 20,
        scale: 1,
        labelOverride: null,
      },
      {
        id: 'b',
        sourceType: 'device',
        sourceId: 'device-multiviewer-1',
        xMm: 180,
        yMm: 100,
        scale: 0.8,
        labelOverride: null,
      },
    ],
    lines: [],
    annotations: [],
  };
}

describe('View orthogonal routing', () => {
  it('routes opposing, same, and mixed sides without diagonal segments', () => {
    const current = view();
    const cases = [
      [
        { placementId: 'a', side: 'right' as const, offset: 0.25 },
        { placementId: 'b', side: 'left' as const, offset: 0.75 },
      ],
      [
        { placementId: 'a', side: 'left' as const, offset: 0.5 },
        { placementId: 'b', side: 'left' as const, offset: 0.5 },
      ],
      [
        { placementId: 'a', side: 'bottom' as const, offset: 0.5 },
        { placementId: 'b', side: 'left' as const, offset: 0.25 },
      ],
    ] as const;
    for (const [from, to] of cases) {
      const points = getAutomaticLineRoute(sampleProject, current, from, to);
      expect(points.length).toBeGreaterThanOrEqual(3);
      expect(
        points
          .slice(1)
          .every((point, index) => point.xMm === points[index].xMm || point.yMm === points[index].yMm),
      ).toBe(true);
    }
  });

  it('normalizes duplicate/collinear points and preserves absolute manual waypoints', () => {
    expect(
      normalizeOrthogonalPoints([
        { xMm: 0, yMm: 0 },
        { xMm: 0, yMm: 0 },
        { xMm: 5, yMm: 0 },
        { xMm: 10, yMm: 0 },
      ]),
    ).toEqual([
      { xMm: 0, yMm: 0 },
      { xMm: 10, yMm: 0 },
    ]);
    const current = view();
    const line: ViewLine = {
      id: 'line',
      from: { placementId: 'a', side: 'right', offset: 0.5 },
      to: { placementId: 'b', side: 'left', offset: 0.5 },
      label: '',
      waypoints: [
        { xMm: 130, yMm: 50 },
        { xMm: 130, yMm: 120 },
      ],
    };
    expect(getRenderedLinePoints(sampleProject, current, line)).toContainEqual({ xMm: 130, yMm: 50 });
    current.placements[0].xMm += 20;
    expect(line.waypoints).toEqual([
      { xMm: 130, yMm: 50 },
      { xMm: 130, yMm: 120 },
    ]);
  });
});
