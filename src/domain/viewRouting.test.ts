import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { ProjectView, ViewLine } from './types';
import { getAutomaticLineRoute, getRenderedLinePoints, normalizeOrthogonalPoints } from './viewRouting';
import { DEFAULT_VIEW_LINE_STYLE } from './viewLineStyles';

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
      {
        id: 'c',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 180,
        yMm: 180,
        scale: 1,
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
        { kind: 'port' as const, placementId: 'a', portId: 'port-group-router-outputs-port-0001' },
        {
          kind: 'port' as const,
          placementId: 'b',
          portId: 'port-group-multiviewer-inputs-port-0001',
        },
      ],
      [
        { kind: 'port' as const, placementId: 'a', portId: 'port-group-router-outputs-port-0001' },
        { kind: 'port' as const, placementId: 'c', portId: 'port-group-router-outputs-port-0002' },
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
      from: { kind: 'port', placementId: 'a', portId: 'port-group-router-outputs-port-0001' },
      to: {
        kind: 'port',
        placementId: 'b',
        portId: 'port-group-multiviewer-inputs-port-0001',
      },
      label: '',
      waypoints: [
        { xMm: 130, yMm: 50, flexPathId: null },
        { xMm: 130, yMm: 120, flexPathId: null },
      ],
      ...DEFAULT_VIEW_LINE_STYLE,
    };
    expect(isOrthogonal(getRenderedLinePoints(sampleProject, current, line))).toBe(true);
    current.placements[0].xMm += 20;
    expect(isOrthogonal(getRenderedLinePoints(sampleProject, current, line))).toBe(true);
    expect(line.waypoints).toEqual([
      { xMm: 130, yMm: 50, flexPathId: null },
      { xMm: 130, yMm: 120, flexPathId: null },
    ]);
  });

  it('renders malformed imported manual geometry through a safe orthogonal route', () => {
    const current = view();
    const line: ViewLine = {
      id: 'line-invalid-import',
      from: { kind: 'port', placementId: 'a', portId: 'port-group-router-outputs-port-0001' },
      to: {
        kind: 'port',
        placementId: 'b',
        portId: 'port-group-multiviewer-inputs-port-0001',
      },
      label: '',
      waypoints: [
        { xMm: 120, yMm: 50, flexPathId: null },
        { xMm: 145, yMm: 85, flexPathId: null },
      ],
      ...DEFAULT_VIEW_LINE_STYLE,
    };
    expect(isOrthogonal(getRenderedLinePoints(sampleProject, current, line))).toBe(true);
  });
});

function isOrthogonal(points: Array<{ xMm: number; yMm: number }>) {
  return points
    .slice(1)
    .every((point, index) => point.xMm === points[index].xMm || point.yMm === points[index].yMm);
}
