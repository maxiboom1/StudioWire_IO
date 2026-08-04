import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW_LINE_STYLE } from '../domain/viewLineStyles';
import { sampleProject } from '../domain/sampleProject';
import type { ProjectRoot } from '../domain/types';
import { createProjectCommands, type ProjectDispatch } from './projectCommands';
import type { ProjectAction } from './projectTypes';

function createHarness(project: ProjectRoot = structuredClone(sampleProject)) {
  const actions: ProjectAction[] = [];
  const seeds: Array<[string, string]> = [];
  const dispatch: ProjectDispatch = (action) => actions.push(action);
  const commands = createProjectCommands({
    dispatch,
    getProject: () => project,
    makeUniqueId: (prefix, value) => {
      seeds.push([prefix, value]);
      return `${prefix}:${value}`;
    },
    importProjectFile: async (file) => {
      const text = await file.text();

      if (text === 'bad') {
        return {
          ok: false,
          error: 'bad import',
          errors: [{ code: 'bad', path: '$', message: 'bad import' }],
        };
      }

      return { ok: true, project, validationIssues: [], removedViewLineCount: 0 };
    },
    exportProjectFile: (exportedProject) => {
      actions.push({ type: 'IMPORT_PROJECT_FAILED', payload: { message: exportedProject.project.name } });
    },
  });

  return { actions, commands, seeds };
}

function fileWithText(text: string): File {
  return { text: async () => text } as File;
}

describe('project command factory', () => {
  it('dispatches project/session/import/export commands without browser globals', async () => {
    const { actions, commands } = createHarness();

    commands.createNewProject();
    commands.loadSampleProject();
    commands.validateProject();
    commands.dismissImportError();
    await expect(commands.importProjectJson(fileWithText('ok'))).resolves.toBe(true);
    await expect(commands.importProjectJson(fileWithText('bad'))).resolves.toBe(false);
    commands.exportProjectJson();

    expect(actions.map((action) => action.type)).toEqual([
      'NEW_PROJECT',
      'LOAD_SAMPLE_PROJECT',
      'VALIDATE_PROJECT',
      'DISMISS_IMPORT_ERROR',
      'IMPORT_PROJECT_JSON',
      'IMPORT_PROJECT_FAILED',
      'IMPORT_PROJECT_FAILED',
    ]);
  });

  it('centralizes settings command IDs and cable-prefix normalization', () => {
    const { actions, commands, seeds } = createHarness();

    expect(commands.addCategory({ name: 'Lighting', defaultCablePrefix: 'L' })).toBe('category:Lighting');
    commands.updateCategory('category-a', { name: 'Audio', defaultCablePrefix: 'A' });
    expect(
      commands.addCategoryConnectorAssignment({
        categoryId: 'category-video',
        connectorTypeId: 'connector-bnc',
      }),
    ).toBe('assignment:category-video-connector-bnc');
    commands.removeCategoryConnectorAssignment({
      categoryId: 'category-video',
      connectorTypeId: 'connector-bnc',
    });
    expect(commands.addConnectorGroup({ categoryId: 'category-video', name: 'Video' })).toBe(
      'group:category-video-Video',
    );
    commands.updateConnectorGroup('group-a', { name: 'Updated' });
    expect(commands.addConnectorGroupMember({ groupId: 'group-a', connectorTypeId: 'connector-hdmi' })).toBe(
      'member:group-a-connector-hdmi',
    );
    commands.removeConnectorGroupMember({ groupId: 'group-a', connectorTypeId: 'connector-hdmi' });
    expect(commands.addConnectorType({ name: 'Optical' })).toBe('connector:Optical');
    commands.updateConnectorType('connector-a', { name: 'Updated connector' });
    expect(commands.addCablePrefix({ prefix: ' v2 ', name: 'Video 2' })).toBe('prefix:V2');

    expect(seeds).toContainEqual(['prefix', 'V2']);
    expect(actions).toContainEqual({
      type: 'ADD_CABLE_PREFIX',
      payload: { id: 'prefix:V2', prefix: 'V2', name: 'Video 2' },
    });
  });

  it('centralizes location, rack, device, terminal-block, connection, and delete commands', () => {
    const { actions, commands, seeds } = createHarness();

    expect(commands.addLocation({ name: 'MCR', description: 'Main' })).toBe('location:MCR');
    commands.updateLocation('location-a', { name: 'PCR', description: 'Prod' });
    commands.deleteLocation('location-a');
    expect(
      commands.addSubLocation({
        locationId: 'location-a',
        name: 'Front Table',
        description: 'Operators',
      }),
    ).toBe('sub-location:location-a-Front Table');
    commands.updateSubLocation('sub-location-a', { name: 'Back Table', description: 'Producers' });
    commands.deleteSubLocation('sub-location-a');
    expect(
      commands.addRack({
        locationId: 'location-a',
        name: 'Rack A',
        heightRu: 42,
        numberingDirection: 'bottom_to_top',
      }),
    ).toBe('rack:location-a-Rack A');
    commands.updateRack('rack-a', { name: 'Rack B', heightRu: 40, numberingDirection: 'top_to_bottom' });
    commands.deleteRack('rack-a');
    expect(
      commands.addDevice({
        device: {
          name: 'Router',
          code: 'RTR',
          manufacturer: '',
          model: '',
          categoryId: 'category-video',
          locationId: 'location-a',
          role: '',
          labelPrefix: 'RTR',
          mountType: 'non_rack',
          rackId: null,
          rackSizeRu: null,
          rackBottomRu: null,
          notes: '',
        },
        portGroups: [],
      }),
    ).toBe('device:RTR');
    expect(
      commands.addDevice({
        device: {
          id: 'device-supplied',
          name: 'Supplied',
          code: '',
          manufacturer: '',
          model: '',
          categoryId: 'category-video',
          locationId: 'location-a',
          role: '',
          labelPrefix: 'SUP',
          mountType: 'non_rack',
          rackId: null,
          rackSizeRu: null,
          rackBottomRu: null,
          notes: '',
        },
        portGroups: [],
      }),
    ).toBe('device-supplied');
    expect(
      commands.addTerminalBlock({
        name: 'TB',
        categoryId: 'category-video',
        locationId: 'location-a',
        labelPrefix: 'TB',
        rackId: 'rack-a',
        rackBottomRu: 1,
        connectorTypeId: 'connector-bnc',
        count: 2,
        notes: '',
      }),
    ).toBe('terminal-block:TB');
    commands.connectPorts({ fromPortId: 'port-a', toPortId: 'port-b' });
    commands.disconnectPort({ portId: 'port-a' });
    commands.moveMountedDevice({ deviceId: 'device-a', targetRackId: 'rack-b', targetBottomRu: 4 });
    commands.moveNavigatorItemToFolder({
      itemType: 'device',
      itemId: 'device-a',
      targetLocationId: 'location-a',
      targetFolderId: 'sub-location-a',
    });
    commands.unassignDeviceFromRack('device-a');
    commands.updateDevice('device-a', {
      name: 'Router 2',
      notes: '',
      locationId: 'location-a',
      rackSizeRu: null,
    });
    commands.editDevice({
      deviceId: 'device-a',
      deviceUpdates: {
        name: 'Router 2',
        code: 'RTR2',
        manufacturer: '',
        model: '',
        categoryId: 'category-video',
        locationId: 'location-a',
        role: '',
        labelPrefix: 'RTR2',
        notes: '',
        rackSizeRu: null,
      },
      existingPortGroups: [],
      newPortGroups: [],
    });
    commands.deleteDevice('device-a');

    expect(seeds).not.toContainEqual(['device', 'Supplied']);
    expect(actions.map((action) => action.type)).toContain('EDIT_DEVICE');
    expect(actions.map((action) => action.type)).toContain('DELETE_DEVICE');
    expect(actions.map((action) => action.type)).toContain('MOVE_NAVIGATOR_ITEM_TO_FOLDER');
    expect(actions.map((action) => action.type)).toContain('UNASSIGN_DEVICE_FROM_RACK');
  });

  it('exports the latest project returned by the injected getter', () => {
    const first = structuredClone(sampleProject);
    const second = {
      ...structuredClone(sampleProject),
      project: { ...sampleProject.project, name: 'Latest' },
    };
    const exported: string[] = [];
    let current = first;
    const commands = createProjectCommands({
      dispatch: () => undefined,
      getProject: () => current,
      makeUniqueId: (prefix, value) => `${prefix}:${value}`,
      importProjectFile: async () => ({
        ok: true,
        project: current,
        validationIssues: [],
        removedViewLineCount: 0,
      }),
      exportProjectFile: (project) => exported.push(project.project.name),
    });

    current = second;
    commands.exportProjectJson();

    expect(exported).toEqual(['Latest']);
  });

  it('creates all persistent View element IDs in the command layer', () => {
    const { actions, commands, seeds } = createHarness();

    expect(commands.addView({ name: 'Signal View' })).toBe('view:Signal View');
    expect(
      commands.addViewPlacement('view-a', {
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 10,
        yMm: 20,
      }),
    ).toBe('view-placement:view-a-device-device-router-1');
    expect(
      commands.addViewLine('view-a', {
        from: { kind: 'port', placementId: 'placement-a', portId: 'port-a' },
        to: { kind: 'port', placementId: 'placement-b', portId: 'port-b' },
        label: '4 x SDI',
        waypoints: [],
        ...DEFAULT_VIEW_LINE_STYLE,
      }),
    ).toBe('view-line:view-a-placement-a-placement-b');
    expect(
      commands.addViewAnnotation('view-a', {
        kind: 'text',
        xMm: 5,
        yMm: 5,
        widthMm: 40,
        text: 'Core',
        size: 'medium',
      }),
    ).toBe('view-annotation:view-a-text');

    commands.updateView('view-a', { name: 'Overview' });
    commands.updateViewPlacement('view-a', 'placement-a', { xMm: 12.5 });
    commands.updateViewLine('view-a', 'line-a', { label: '8 x SDI' });
    commands.updateViewAnnotation('view-a', 'annotation-a', {
      kind: 'group',
      xMm: 0,
      yMm: 0,
      widthMm: 100,
      heightMm: 50,
      label: 'Core',
    });
    commands.removeViewLine('view-a', 'line-a');
    commands.removeViewAnnotation('view-a', 'annotation-a');
    commands.removeViewPlacement('view-a', 'placement-a');
    commands.replaceViewCanvas('view-a', { placements: [], lines: [], annotations: [] });
    commands.deleteView('view-a');

    expect(seeds).toEqual(
      expect.arrayContaining([
        ['view', 'Signal View'],
        ['view-placement', 'view-a-device-device-router-1'],
        ['view-line', 'view-a-placement-a-placement-b'],
        ['view-annotation', 'view-a-text'],
      ]),
    );
    expect(actions.map((action) => action.type)).toEqual([
      'ADD_VIEW',
      'ADD_VIEW_PLACEMENT',
      'ADD_VIEW_LINE',
      'ADD_VIEW_ANNOTATION',
      'UPDATE_VIEW',
      'UPDATE_VIEW_PLACEMENT',
      'UPDATE_VIEW_LINE',
      'UPDATE_VIEW_ANNOTATION',
      'REMOVE_VIEW_LINE',
      'REMOVE_VIEW_ANNOTATION',
      'REMOVE_VIEW_PLACEMENT',
      'REPLACE_VIEW_CANVAS',
      'DELETE_VIEW',
    ]);
  });
});
