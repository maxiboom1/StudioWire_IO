import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../projectFactory';
import type { ProjectRoot, ProjectView } from '../types';
import { validateProject } from '../validators';
import { sampleProject } from '../sampleProject';
import { getOrderedDevicePortColumns } from '../devicePortLayout';
import { DEFAULT_VIEW_LINE_STYLE } from '../viewLineStyles';

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
            from: { kind: 'port', placementId: 'placement-missing-device', portId: 'port-missing' },
            to: { kind: 'port', placementId: 'placement-gone', portId: 'port-gone' },
            label: '',
            waypoints: [],
            ...DEFAULT_VIEW_LINE_STYLE,
          },
          {
            id: 'line-self',
            from: { kind: 'port', placementId: 'placement-missing-rack', portId: 'port-a' },
            to: { kind: 'port', placementId: 'placement-missing-rack', portId: 'port-b' },
            label: '',
            waypoints: [],
            ...DEFAULT_VIEW_LINE_STYLE,
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
            from: { kind: 'port', placementId: project.project.id, portId: 'port-a' },
            to: { kind: 'port', placementId: 'placement-b', portId: 'port-b' },
            label: '',
            waypoints: [],
            ...DEFAULT_VIEW_LINE_STYLE,
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

  it('validates missing, invalid, overlapping, and out-of-page I/O Ranges', () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find((item) => item.id === 'device-multiviewer-1')!;
    const ports = getOrderedDevicePortColumns(project, device).left;
    project.views = [
      viewFixture({
        placements: [
          {
            id: 'placement-device',
            sourceType: 'device',
            sourceId: device.id,
            xMm: 0,
            yMm: 10,
            scale: 1,
            labelOverride: null,
          },
        ],
        annotations: [
          {
            id: 'range-a',
            kind: 'port_range',
            placementId: 'placement-device',
            side: 'left',
            startPortId: ports[0].id,
            endPortId: ports[2].id,
            label: '',
          },
          {
            id: 'range-b',
            kind: 'port_range',
            placementId: 'placement-device',
            side: 'left',
            startPortId: ports[2].id,
            endPortId: ports[3].id,
            label: '',
          },
          {
            id: 'range-missing',
            kind: 'port_range',
            placementId: 'placement-device',
            side: 'left',
            startPortId: 'missing-port',
            endPortId: ports[0].id,
            label: '',
          },
          {
            id: 'range-placement',
            kind: 'port_range',
            placementId: 'missing-placement',
            side: 'right',
            startPortId: ports[0].id,
            endPortId: ports[0].id,
            label: '',
          },
        ],
      }),
    ];
    const codes = validateProject(project).map((issue) => issue.code);
    expect(codes).toContain('view-port-range-overlap');
    expect(codes).toContain('view-port-range-port-missing');
    expect(codes).toContain('view-port-range-placement-missing');
    expect(codes).toContain('view-item-outside-page');
  });

  it('validates port/range line references and fixed style values without rejecting loadable data', () => {
    const project = structuredClone(sampleProject);
    project.views = [
      viewFixture({
        placements: [
          {
            id: 'router',
            sourceType: 'device',
            sourceId: 'device-router-1',
            xMm: 20,
            yMm: 20,
            scale: 1,
            labelOverride: null,
          },
          {
            id: 'multiviewer',
            sourceType: 'device',
            sourceId: 'device-multiviewer-1',
            xMm: 150,
            yMm: 20,
            scale: 1,
            labelOverride: null,
          },
          {
            id: 'rack',
            sourceType: 'rack',
            sourceId: 'rack-mcr-a',
            xMm: 280,
            yMm: 20,
            scale: 1,
            labelOverride: null,
          },
        ],
        annotations: [
          {
            id: 'router-range',
            kind: 'port_range',
            placementId: 'router',
            side: 'right',
            startPortId: 'port-group-router-outputs-port-0001',
            endPortId: 'port-group-router-outputs-port-0002',
            label: '',
          },
        ],
        lines: [
          {
            id: 'port-missing',
            from: { kind: 'port', placementId: 'router', portId: 'missing-port' },
            to: {
              kind: 'port',
              placementId: 'multiviewer',
              portId: 'port-group-multiviewer-inputs-port-0001',
            },
            label: '',
            waypoints: [],
            ...DEFAULT_VIEW_LINE_STYLE,
          },
          {
            id: 'port-invalid',
            from: { kind: 'port', placementId: 'rack', portId: 'port-group-router-outputs-port-0001' },
            to: {
              kind: 'port',
              placementId: 'multiviewer',
              portId: 'port-group-multiviewer-inputs-port-0001',
            },
            label: '',
            waypoints: [],
            ...DEFAULT_VIEW_LINE_STYLE,
          },
          {
            id: 'range-missing-line',
            from: { kind: 'port_range', placementId: 'router', annotationId: 'gone' },
            to: {
              kind: 'port',
              placementId: 'multiviewer',
              portId: 'port-group-multiviewer-inputs-port-0001',
            },
            label: '',
            waypoints: [],
            ...DEFAULT_VIEW_LINE_STYLE,
          },
          {
            id: 'range-invalid-line',
            from: { kind: 'port_range', placementId: 'multiviewer', annotationId: 'router-range' },
            to: { kind: 'port', placementId: 'router', portId: 'port-group-router-outputs-port-0001' },
            label: '',
            waypoints: [],
            ...DEFAULT_VIEW_LINE_STYLE,
          },
          {
            id: 'style-invalid',
            from: { kind: 'port', placementId: 'router', portId: 'port-group-router-outputs-port-0001' },
            to: {
              kind: 'port',
              placementId: 'multiviewer',
              portId: 'port-group-multiviewer-inputs-port-0001',
            },
            label: 'Outside',
            waypoints: [],
            color: 'cyan' as never,
            width: 'thin',
            labelOrientation: 'horizontal',
            labelPosition: 2,
          },
        ],
      }),
    ];
    const codes = validateProject(project).map((issue) => issue.code);
    expect(codes).toContain('view-line-port-missing');
    expect(codes).toContain('view-line-port-invalid');
    expect(codes).toContain('view-line-range-missing');
    expect(codes).toContain('view-line-range-invalid');
    expect(codes).toContain('view-line-style-invalid');
  });

  it('reports malformed grouped Flex paths without preventing safe View validation', () => {
    const project = structuredClone(sampleProject);
    project.views[0].lines[0].waypoints = [
      { xMm: 110, yMm: 90, flexPathId: 'flex-broken' },
      { xMm: 110, yMm: 100, flexPathId: 'flex-broken' },
      { xMm: 120, yMm: 100, flexPathId: 'flex-broken' },
    ];

    expect(validateProject(project)).toContainEqual(
      expect.objectContaining({
        code: 'view-line-flex-invalid',
        objectType: 'view',
        objectId: 'view-signal-overview',
      }),
    );

    project.views[0].lines[0].waypoints = [
      { xMm: 110, yMm: 90, flexPathId: null },
      { xMm: 110, yMm: 90, flexPathId: null },
    ];
    expect(validateProject(project)).toContainEqual(
      expect.objectContaining({ code: 'view-geometry-invalid', objectId: 'view-signal-overview' }),
    );
  });
});
