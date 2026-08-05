import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './projectFactory';
import type { ProjectView } from './types';
import { predictViewFormatOverflow } from './viewFormatPrediction';

describe('View target-format prediction', () => {
  it('counts each outside placement, line, and annotation without changing layout', () => {
    const project = createEmptyProject({ name: 'Format test' });
    project.views = [
      {
        id: 'view',
        name: 'View',
        description: '',
        pageSize: 'a3',
        orientation: 'landscape',
        placements: [
          {
            id: 'missing',
            sourceType: 'device',
            sourceId: 'missing-device',
            xMm: 250,
            yMm: 20,
            scale: 1,
            labelOverride: null,
          },
        ],
        lines: [],
        annotations: [
          { id: 'text', kind: 'text', xMm: 230, yMm: 30, widthMm: 30, text: 'Outside', size: 'medium' },
        ],
      } satisfies ProjectView,
    ];
    const before = JSON.stringify(project.views[0]);
    expect(predictViewFormatOverflow(project, project.views[0], 'a4', 'portrait')).toEqual({
      placementCount: 1,
      lineCount: 0,
      annotationCount: 1,
      totalCount: 2,
    });
    expect(JSON.stringify(project.views[0])).toBe(before);
  });
});
