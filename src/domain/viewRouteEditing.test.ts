import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { ProjectView, ViewLine } from './types';
import { makeLineRouteManual, moveLineWaypoint, removeLineWaypoint } from './viewRouteEditing';
import { DEFAULT_VIEW_LINE_STYLE } from './viewLineStyles';

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
            { xMm: 1, yMm: 1 },
            { xMm: 1, yMm: 2 },
          ],
        },
        0,
      ),
    ).toEqual([{ xMm: 1, yMm: 2 }]);
  });
});
