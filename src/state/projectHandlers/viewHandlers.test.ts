import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW_LINE_STYLE } from '../../domain/viewLineStyles';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot, ProjectView } from '../../domain/types';
import { createProjectReducer } from '../projectReducer';
import type { ProjectAction, ProjectState } from '../projectTypes';

const reducer = createProjectReducer({
  nowIso: () => '2026-08-04T10:00:00.000Z',
  makeId: (prefix, value) => `${prefix}-${value}`,
  makeUniqueId: (prefix, value) => `${prefix}-${value}`,
});

function stateFixture(): ProjectState {
  return {
    project: structuredClone(sampleProject),
    statusMessage: '',
    importError: null,
    persistenceState: 'saved',
  };
}

function reduce(state: ProjectState, action: ProjectAction): ProjectState {
  return reducer(state, action);
}

function viewFixture(id = 'view-state'): ProjectView {
  return {
    id,
    name: 'State View',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [],
    lines: [],
    annotations: [],
  };
}

describe('View project action family', () => {
  it('stamps successful mutations once and does not stamp rejected mutations', () => {
    const initial = stateFixture();
    const initialLogLength = initial.project.changeLog.length;
    const added = reduce(initial, { type: 'ADD_VIEW', payload: viewFixture() });

    expect(added.project.views).toHaveLength(1);
    expect(added.project.changeLog).toHaveLength(initialLogLength + 1);
    expect(added.project.project.updatedAt).toBe('2026-08-04T10:00:00.000Z');

    const rejected = reduce(added, {
      type: 'ADD_VIEW',
      payload: viewFixture('view-duplicate'),
    });

    expect(rejected.project).toBe(added.project);
    expect(rejected.project.changeLog).toHaveLength(initialLogLength + 1);
    expect(rejected.statusMessage).toContain('already used');
  });

  it('routes placement, line, annotation, canvas, and removal actions through focused handlers', () => {
    const initial = stateFixture();
    const engineeringBefore = engineeringSnapshot(initial.project);
    let state = reduce(initial, { type: 'ADD_VIEW', payload: viewFixture() });
    state = reduce(state, {
      type: 'ADD_VIEW_PLACEMENT',
      payload: {
        viewId: 'view-state',
        placement: {
          id: 'placement-router',
          sourceType: 'device',
          sourceId: 'device-router-1',
          xMm: 10,
          yMm: 10,
          scale: 1,
          labelOverride: null,
        },
      },
    });
    state = reduce(state, {
      type: 'ADD_VIEW_PLACEMENT',
      payload: {
        viewId: 'view-state',
        placement: {
          id: 'placement-multiviewer',
          sourceType: 'device',
          sourceId: 'device-multiviewer-1',
          xMm: 150,
          yMm: 10,
          scale: 1,
          labelOverride: null,
        },
      },
    });
    state = reduce(state, {
      type: 'ADD_VIEW_LINE',
      payload: {
        viewId: 'view-state',
        line: {
          id: 'line-state',
          from: {
            kind: 'port',
            placementId: 'placement-router',
            portId: 'port-group-router-outputs-port-0001',
          },
          to: {
            kind: 'port',
            placementId: 'placement-multiviewer',
            portId: 'port-group-multiviewer-inputs-port-0001',
          },
          label: '',
          waypoints: [],
          ...DEFAULT_VIEW_LINE_STYLE,
        },
      },
    });
    state = reduce(state, {
      type: 'ADD_VIEW_ANNOTATION',
      payload: {
        viewId: 'view-state',
        annotation: {
          id: 'annotation-state',
          kind: 'text',
          xMm: 5,
          yMm: 5,
          widthMm: 40,
          text: 'Core',
          size: 'medium',
        },
      },
    });
    state = reduce(state, {
      type: 'UPDATE_VIEW_PLACEMENT',
      payload: { viewId: 'view-state', placementId: 'placement-router', updates: { xMm: 12.5 } },
    });
    state = reduce(state, {
      type: 'UPDATE_VIEW_LINE',
      payload: { viewId: 'view-state', lineId: 'line-state', updates: { label: '4 x SDI' } },
    });
    state = reduce(state, {
      type: 'UPDATE_VIEW_ANNOTATION',
      payload: {
        viewId: 'view-state',
        annotationId: 'annotation-state',
        annotation: {
          id: 'annotation-state',
          kind: 'text',
          xMm: 5,
          yMm: 5,
          widthMm: 40,
          text: 'Video Core',
          size: 'large',
        },
      },
    });

    expect(state.project.views[0]).toMatchObject({
      placements: expect.arrayContaining([expect.objectContaining({ id: 'placement-router', xMm: 12.5 })]),
      lines: [expect.objectContaining({ id: 'line-state', label: '4 x SDI' })],
      annotations: [expect.objectContaining({ id: 'annotation-state', text: 'Video Core' })],
    });
    expect(engineeringSnapshot(state.project)).toEqual(engineeringBefore);

    const removed = reduce(state, {
      type: 'REMOVE_VIEW_PLACEMENT',
      payload: { viewId: 'view-state', placementId: 'placement-router' },
    });
    expect(removed.project.views[0].lines).toEqual([]);
    expect(removed.project.views[0].annotations).toHaveLength(1);

    const replaced = reduce(removed, {
      type: 'REPLACE_VIEW_CANVAS',
      payload: { viewId: 'view-state', canvas: { placements: [], lines: [], annotations: [] } },
    });
    expect(replaced.project.views[0]).toMatchObject({ placements: [], lines: [], annotations: [] });

    const deleted = reduce(replaced, { type: 'DELETE_VIEW', payload: { id: 'view-state' } });
    expect(deleted.project.views).toEqual([]);
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
