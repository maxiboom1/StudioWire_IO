import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../projectFactory';
import type { ProjectRoot, ProjectView } from '../types';
import { validateProject } from '../validators';

function emptyProject(): ProjectRoot {
  return createEmptyProject({ id: 'project-view-validation', name: 'View Validation' });
}

function viewFixture(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 'view-validation',
    name: 'Validation View',
    description: '',
    pageSize: 'a4',
    orientation: 'portrait',
    placements: [],
    lines: [],
    annotations: [],
    ...overrides,
  };
}

describe('View relational validation', () => {
  it('reports required and case-insensitive duplicate View names in the View namespace', () => {
    const project = emptyProject();
    project.views = [
      viewFixture({ id: 'view-empty', name: '   ' }),
      viewFixture({ id: 'view-a', name: 'Signal Plan' }),
      viewFixture({ id: 'view-b', name: ' signal plan ' }),
    ];

    const issues = validateProject(project);

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'view-name-required', objectType: 'view', objectId: 'view-empty' }),
    );
    expect(issues.filter((issue) => issue.code === 'duplicate-view-name')).toHaveLength(2);
  });

  it('reports dangling sources, duplicate sources, dangling line endpoints, and self-lines', () => {
    const project = emptyProject();
    project.views = [
      viewFixture({
        placements: [
          {
            id: 'placement-missing-device',
            sourceType: 'device',
            sourceId: 'device-missing',
            xMm: 10,
            yMm: 10,
            scale: 1,
            labelOverride: null,
          },
          {
            id: 'placement-missing-device-copy',
            sourceType: 'device',
            sourceId: 'device-missing',
            xMm: 80,
            yMm: 10,
            scale: 1,
            labelOverride: null,
          },
          {
            id: 'placement-missing-rack',
            sourceType: 'rack',
            sourceId: 'rack-missing',
            xMm: 10,
            yMm: 60,
            scale: 1,
            labelOverride: null,
          },
        ],
        lines: [
          {
            id: 'line-dangling',
            from: { placementId: 'placement-missing-device', side: 'right', offset: 0.5 },
            to: { placementId: 'placement-gone', side: 'left', offset: 0.5 },
            label: '',
            waypoints: [],
          },
          {
            id: 'line-self',
            from: { placementId: 'placement-missing-rack', side: 'right', offset: 0.5 },
            to: { placementId: 'placement-missing-rack', side: 'left', offset: 0.5 },
            label: '',
            waypoints: [],
          },
        ],
      }),
    ];

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('duplicate-view-placement-source');
    expect(codes).toContain('view-placement-device-missing');
    expect(codes).toContain('view-placement-rack-missing');
    expect(codes).toContain('view-line-placement-missing');
    expect(codes).toContain('view-line-self-reference');
  });

  it('reports invalid geometry as errors and out-of-page content as warnings', () => {
    const project = emptyProject();
    project.views = [
      viewFixture({
        placements: [
          {
            id: 'placement-invalid',
            sourceType: 'device',
            sourceId: 'device-missing',
            xMm: 205,
            yMm: 290,
            scale: 4,
            labelOverride: null,
          },
        ],
        annotations: [
          {
            id: 'group-outside',
            kind: 'group',
            xMm: -2,
            yMm: 5,
            widthMm: 30,
            heightMm: 20,
            label: '',
          },
          {
            id: 'text-invalid',
            kind: 'text',
            xMm: 5,
            yMm: 5,
            widthMm: 0,
            text: '',
            size: 'small',
          },
        ],
      }),
    ];

    const issues = validateProject(project);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'view-geometry-invalid',
        severity: 'error',
        objectType: 'view',
        objectId: 'view-validation',
      }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'view-item-outside-page',
        severity: 'warning',
        objectType: 'view',
        objectId: 'view-validation',
      }),
    );
  });

  it('includes View, placement, line, and annotation IDs in global duplicate-ID validation', () => {
    const project = emptyProject();
    project.views = [
      viewFixture({
        id: project.project.id,
        placements: [
          {
            id: project.project.id,
            sourceType: 'device',
            sourceId: 'missing-a',
            xMm: 0,
            yMm: 0,
            scale: 1,
            labelOverride: null,
          },
          {
            id: 'placement-b',
            sourceType: 'device',
            sourceId: 'missing-b',
            xMm: 70,
            yMm: 0,
            scale: 1,
            labelOverride: null,
          },
        ],
        lines: [
          {
            id: project.project.id,
            from: { placementId: project.project.id, side: 'right', offset: 0.5 },
            to: { placementId: 'placement-b', side: 'left', offset: 0.5 },
            label: '',
            waypoints: [],
          },
        ],
        annotations: [
          {
            id: project.project.id,
            kind: 'text',
            xMm: 0,
            yMm: 0,
            widthMm: 10,
            text: '',
            size: 'small',
          },
        ],
      }),
    ];

    const duplicateIssues = validateProject(project).filter((issue) => issue.code === 'duplicate-object-id');

    expect(duplicateIssues).toHaveLength(4);
    expect(duplicateIssues.every((issue) => issue.objectType === 'view')).toBe(true);
    expect(duplicateIssues.every((issue) => issue.objectId === project.project.id)).toBe(true);
  });
});
