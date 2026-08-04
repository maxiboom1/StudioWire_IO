import { describe, expect, it } from 'vitest';
import { deleteNormalDeviceFromProject } from './deviceDeletion';
import { sampleProject } from './sampleProject';
import type { ProjectRoot, ProjectView, ViewLine, ViewPlacement } from './types';
import {
  addProjectView,
  addViewAnnotation,
  addViewLine,
  addViewPlacement,
  createProjectView,
  createViewPlacement,
  getViewSourceImpact,
  removeViewPlacement,
  removeViewSourceReferences,
  replaceViewCanvas,
  setViewDeviceScale,
  updateProjectView,
  updateViewAnnotation,
  updateViewLine,
  updateViewPlacement,
} from './viewOperations';
import {
  getPlacementBounds,
  getStandardDeviceDiagramHeightMm,
  getViewPageDimensions,
  VIEW_GRID_MM,
} from './viewGeometry';
import { getAutomaticLineRoute } from './viewRouting';

function projectFixture(): ProjectRoot {
  return structuredClone(sampleProject);
}

function viewFixture(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 'view-main',
    name: 'Main View',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [],
    lines: [],
    annotations: [],
    ...overrides,
  };
}

function placementFixture(
  id: string,
  sourceId: string,
  overrides: Partial<ViewPlacement> = {},
): ViewPlacement {
  return {
    id,
    sourceType: 'device',
    sourceId,
    xMm: 10,
    yMm: 20,
    scale: 1,
    labelOverride: null,
    ...overrides,
  };
}

function lineFixture(id = 'line-main'): ViewLine {
  return {
    id,
    from: { placementId: 'placement-router', side: 'right', offset: 0.5 },
    to: { placementId: 'placement-multiviewer', side: 'left', offset: 0.5 },
    label: '4 x SDI',
    waypoints: [],
  };
}

describe('View domain operations', () => {
  it('creates default A3 portrait Views and placement defaults', () => {
    expect(createProjectView({ id: 'view-new', name: '  New View  ' })).toEqual({
      id: 'view-new',
      name: 'New View',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
      placements: [],
      lines: [],
      annotations: [],
    });
    expect(
      createViewPlacement({
        id: 'placement-new',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 0,
        yMm: 0,
      }),
    ).toMatchObject({ scale: 1, labelOverride: null });
    expect(VIEW_GRID_MM).toBe(2.5);
    expect(getViewPageDimensions('a4', 'portrait')).toEqual({ widthMm: 210, heightMm: 297 });
    expect(getViewPageDimensions('a3', 'landscape')).toEqual({ widthMm: 420, heightMm: 297 });
  });

  it('enforces the trimmed case-insensitive View namespace', () => {
    const project = projectFixture();
    const added = addProjectView(project, viewFixture({ name: '  Signal Plan  ' }));

    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.project.views[0].name).toBe('Signal Plan');
    expect(addProjectView(added.project, viewFixture({ id: 'view-2', name: 'signal plan' }))).toEqual({
      ok: false,
      error: 'View operation blocked: View name "signal plan" is already used.',
    });
    expect(addProjectView(project, viewFixture({ name: '   ' })).ok).toBe(false);

    const renamed = updateProjectView(added.project, 'view-main', { name: '  Overview  ' });
    expect(renamed.ok && renamed.project.views[0].name).toBe('Overview');
  });

  it('supports focused canvas CRUD, parallel lines, and placement-line cleanup', () => {
    const project = projectFixture();
    const engineeringBefore = engineeringSnapshot(project);
    const created = addProjectView(project, viewFixture());
    if (!created.ok) throw new Error(created.error);

    const routerPlacement = placementFixture('placement-router', 'device-router-1');
    const withRouter = addViewPlacement(created.project, 'view-main', routerPlacement);
    if (!withRouter.ok) throw new Error(withRouter.error);

    expect(
      addViewPlacement(withRouter.project, 'view-main', {
        ...routerPlacement,
        id: 'placement-router-copy',
      }).ok,
    ).toBe(false);

    const withMultiviewer = addViewPlacement(
      withRouter.project,
      'view-main',
      placementFixture('placement-multiviewer', 'device-multiviewer-1', { xMm: 160 }),
    );
    if (!withMultiviewer.ok) throw new Error(withMultiviewer.error);

    const firstLine = addViewLine(withMultiviewer.project, 'view-main', lineFixture());
    if (!firstLine.ok) throw new Error(firstLine.error);
    const parallelLine = addViewLine(firstLine.project, 'view-main', lineFixture('line-parallel'));
    if (!parallelLine.ok) throw new Error(parallelLine.error);
    expect(parallelLine.project.views[0].lines).toHaveLength(2);
    expect(
      addViewLine(parallelLine.project, 'view-main', {
        ...lineFixture('line-self'),
        to: { placementId: 'placement-router', side: 'left', offset: 0.5 },
      }).ok,
    ).toBe(false);

    const moved = updateViewPlacement(parallelLine.project, 'view-main', 'placement-router', {
      xMm: 12.5,
      yMm: 25,
      scale: 0.75,
      labelOverride: 'Router block',
    });
    if (!moved.ok) throw new Error(moved.error);
    const movedView = moved.project.views[0];
    const movedLine = movedView.lines.find((line) => line.id === 'line-main');
    if (!movedLine) throw new Error('Expected the routed line.');
    const routed = updateViewLine(moved.project, 'view-main', 'line-main', {
      waypoints: getAutomaticLineRoute(moved.project, movedView, movedLine.from, movedLine.to).slice(1, -1),
    });
    if (!routed.ok) throw new Error(routed.error);
    const annotated = addViewAnnotation(routed.project, 'view-main', {
      id: 'annotation-title',
      kind: 'text',
      xMm: 10,
      yMm: 5,
      widthMm: 80,
      text: 'VIDEO',
      size: 'large',
    });
    if (!annotated.ok) throw new Error(annotated.error);
    const titleAnnotation = annotated.project.views[0].annotations[0];
    if (titleAnnotation.kind !== 'text') throw new Error('Expected a text annotation.');
    const updatedAnnotation = updateViewAnnotation(annotated.project, 'view-main', 'annotation-title', {
      ...titleAnnotation,
      text: 'VIDEO CORE',
    });
    if (!updatedAnnotation.ok) throw new Error(updatedAnnotation.error);

    const removed = removeViewPlacement(updatedAnnotation.project, 'view-main', 'placement-router');
    if (!removed.ok) throw new Error(removed.error);
    expect(removed.project.views[0].placements.map((placement) => placement.id)).toEqual([
      'placement-multiviewer',
    ]);
    expect(removed.project.views[0].lines).toEqual([]);
    expect(removed.project.views[0].annotations).toHaveLength(1);
    expect(engineeringSnapshot(removed.project)).toEqual(engineeringBefore);
  });

  it('replaces a whole canvas without touching project engineering data', () => {
    const project = { ...projectFixture(), views: [viewFixture()] };
    const canvas: Pick<ProjectView, 'placements' | 'lines' | 'annotations'> = {
      placements: [placementFixture('placement-router', 'device-router-1')],
      lines: [],
      annotations: [
        {
          id: 'group-core',
          kind: 'group',
          xMm: 5,
          yMm: 5,
          widthMm: 100,
          heightMm: 50,
          label: 'Core',
        },
      ],
    };
    const result = replaceViewCanvas(project, 'view-main', canvas);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.views[0]).toMatchObject(canvas);
      expect(engineeringSnapshot(result.project)).toEqual(engineeringSnapshot(project));
    }
  });

  it('reports and removes only direct source placements and attached lines', () => {
    const project = projectFixture();
    project.views = [
      viewFixture({
        placements: [
          placementFixture('placement-router', 'device-router-1'),
          placementFixture('placement-multiviewer', 'device-multiviewer-1'),
          placementFixture('placement-rack', 'rack-mcr-a', { sourceType: 'rack' }),
        ],
        lines: [lineFixture()],
        annotations: [
          {
            id: 'note',
            kind: 'text',
            xMm: 1,
            yMm: 1,
            widthMm: 20,
            text: 'Keep me',
            size: 'small',
          },
        ],
      }),
    ];

    expect(getViewSourceImpact(project, 'device', 'device-router-1')).toEqual([
      {
        viewId: 'view-main',
        viewName: 'Main View',
        placementCount: 1,
        attachedLineCount: 1,
        attachedPortRangeCount: 0,
      },
    ]);

    const cleaned = removeViewSourceReferences(project, 'device', 'device-router-1');
    expect(cleaned.views[0].placements.map((placement) => placement.id)).toEqual([
      'placement-multiviewer',
      'placement-rack',
    ]);
    expect(cleaned.views[0].lines).toEqual([]);
    expect(cleaned.views[0].annotations).toHaveLength(1);

    const deleted = deleteNormalDeviceFromProject(project, 'device-router-1');
    expect(deleted.ok).toBe(true);
    if (deleted.ok) {
      expect(deleted.affectedViewCount).toBe(1);
      expect(deleted.deletedViewPlacementCount).toBe(1);
      expect(deleted.deletedViewLineCount).toBe(1);
      expect(deleted.project.views[0].placements.some((placement) => placement.id === 'placement-rack')).toBe(
        true,
      );
    }
  });

  it('derives deterministic live placement bounds from source rows and rack height', () => {
    const project = projectFixture();
    const deviceBounds = getPlacementBounds(
      project,
      placementFixture('placement-router', 'device-router-1', { scale: 0.5 }),
    );
    const rackBounds = getPlacementBounds(
      project,
      placementFixture('placement-rack', 'rack-mcr-a', { sourceType: 'rack' }),
    );
    const missingBounds = getPlacementBounds(
      project,
      placementFixture('placement-missing', 'device-missing'),
    );

    expect(deviceBounds).toMatchObject({
      widthMm: 46,
      heightMm: getStandardDeviceDiagramHeightMm(4) * 0.5,
      sourceMissing: false,
    });
    expect(rackBounds).toMatchObject({ widthMm: 58, heightMm: 134, sourceMissing: false });
    expect(missingBounds).toMatchObject({ widthMm: 60, heightMm: 30, sourceMissing: true });
  });

  it('sets one View-wide device size while preserving grid slots and engineering data', () => {
    const project = projectFixture();
    project.views = [
      viewFixture({
        placements: [
          placementFixture('placement-router', 'device-router-1', { xMm: 112, yMm: 19.787234 }),
          placementFixture('placement-multiviewer', 'device-multiviewer-1', {
            xMm: 10,
            yMm: 29.574468,
          }),
          placementFixture('placement-rack', 'rack-mcr-a', {
            sourceType: 'rack',
            xMm: 112,
            yMm: 10,
          }),
        ],
      }),
    ];
    const before = engineeringSnapshot(project);

    const result = setViewDeviceScale(project, 'view-main', 0.8);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.views[0].placements).toEqual([
        expect.objectContaining({
          id: 'placement-router',
          xMm: 92.212774,
          yMm: 17.829788,
          scale: 0.8,
        }),
        expect.objectContaining({
          id: 'placement-multiviewer',
          xMm: 10,
          yMm: 25.659576,
          scale: 0.8,
        }),
        expect.objectContaining({ id: 'placement-rack', xMm: 92.212774, yMm: 10, scale: 1 }),
      ]);
      expect(engineeringSnapshot(result.project)).toEqual(before);
    }
  });
});

function engineeringSnapshot(project: ProjectRoot) {
  return structuredClone({
    settings: project.settings,
    locations: project.locations,
    subLocations: project.subLocations,
    racks: project.racks,
    devices: project.devices,
    portGroups: project.portGroups,
    ports: project.ports,
    cables: project.cables,
    numberingLedgers: project.numberingLedgers,
  });
}
