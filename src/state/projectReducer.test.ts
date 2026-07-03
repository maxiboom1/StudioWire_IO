import { describe, expect, it } from 'vitest';
import { parseImportedProject } from '../domain/projectImport';
import { sampleProject } from '../domain/sampleProject';
import { STUDIOWIRE_CURRENT_VERSION } from '../domain/version';
import { createInitialProjectState, projectReducer, type ProjectState } from './projectReducer';

function createState(): ProjectState {
  return {
    project: structuredClone(sampleProject),
    statusMessage: 'ready',
    importError: null,
  };
}

describe('projectReducer core project actions', () => {
  it('creates a new unsaved local project state', () => {
    const state = createInitialProjectState();

    expect(state.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
    expect(state.project.project.name).toBe('Untitled Project');
    expect(state.project.settings.rackDefaults.heightRu).toBe(28);
    expect(state.persistenceState).toBe('unsaved');
    expect(state.importError).toBeNull();
  });

  it('updates project info and imports validation issues without preserving stale import errors', () => {
    const state = {
      ...createState(),
      importError: 'previous failure',
    };
    const updated = projectReducer(state, {
      type: 'UPDATE_PROJECT_INFO',
      payload: {
        name: 'Updated Project',
        customer: 'Updated Customer',
        revision: 'B',
      },
    });
    const imported = projectReducer(updated, {
      type: 'IMPORT_PROJECT_JSON',
      payload: {
        project: structuredClone(sampleProject),
        validationIssues: [
          {
            id: 'validation-test',
            severity: 'warning',
            code: 'test-warning',
            message: 'Test warning',
            objectType: 'project',
            objectId: sampleProject.project.id,
          },
        ],
      },
    });

    expect(updated.project.project).toMatchObject({
      name: 'Updated Project',
      customer: 'Updated Customer',
      revision: 'B',
    });
    expect(updated.importError).toBeNull();
    expect(imported.project.validationIssues).toHaveLength(1);
    expect(imported.statusMessage).toBe('Project imported; 1 validation issue(s) found');
    expect(imported.importError).toBeNull();
  });

  it('handles settings reference edits and duplicate connector safeguards', () => {
    let state = createState();

    state = projectReducer(state, {
      type: 'ADD_CATEGORY',
      payload: { id: 'category-test', name: 'Test', defaultCablePrefix: 'T', color: '#111827' },
    });
    state = projectReducer(state, {
      type: 'UPDATE_CATEGORY',
      payload: { id: 'category-test', updates: { name: 'Test Updated', defaultCablePrefix: 'TX' } },
    });
    state = projectReducer(state, {
      type: 'ADD_CONNECTOR_TYPE',
      payload: { id: 'connector-test', name: 'Test Connector', iconKey: 'generic' },
    });
    state = projectReducer(state, {
      type: 'UPDATE_CONNECTOR_TYPE',
      payload: { id: 'connector-test', updates: { name: 'Test Connector Updated' } },
    });
    state = projectReducer(state, {
      type: 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT',
      payload: { id: 'assignment-test', categoryId: 'category-test', connectorTypeId: 'connector-test' },
    });
    const duplicateAssignment = projectReducer(state, {
      type: 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT',
      payload: {
        id: 'assignment-test-duplicate',
        categoryId: 'category-test',
        connectorTypeId: 'connector-test',
      },
    });
    state = projectReducer(state, {
      type: 'ADD_CONNECTOR_GROUP',
      payload: { id: 'connector-group-test', categoryId: 'category-test', name: 'Test Group' },
    });
    state = projectReducer(state, {
      type: 'UPDATE_CONNECTOR_GROUP',
      payload: { id: 'connector-group-test', updates: { name: 'Test Group Updated' } },
    });
    state = projectReducer(state, {
      type: 'ADD_CONNECTOR_GROUP_MEMBER',
      payload: {
        id: 'group-member-test',
        groupId: 'connector-group-test',
        connectorTypeId: 'connector-test',
      },
    });
    const duplicateMember = projectReducer(state, {
      type: 'ADD_CONNECTOR_GROUP_MEMBER',
      payload: {
        id: 'group-member-test-duplicate',
        groupId: 'connector-group-test',
        connectorTypeId: 'connector-test',
      },
    });
    state = projectReducer(state, {
      type: 'REMOVE_CATEGORY_CONNECTOR_ASSIGNMENT',
      payload: { categoryId: 'category-test', connectorTypeId: 'connector-test' },
    });

    expect(
      state.project.settings.categories.find((category) => category.id === 'category-test'),
    ).toMatchObject({
      name: 'Test Updated',
      defaultCablePrefix: 'TX',
    });
    expect(
      state.project.settings.connectorTypes.find((connectorType) => connectorType.id === 'connector-test'),
    ).toMatchObject({ name: 'Test Connector Updated' });
    expect(duplicateAssignment.statusMessage).toBe('Connector already assigned to category');
    expect(duplicateMember.statusMessage).toBe('Connector already belongs to group');
    expect(
      state.project.settings.categoryConnectorAssignments.some(
        (assignment) => assignment.id === 'assignment-test',
      ),
    ).toBe(false);
    expect(
      state.project.settings.connectorCompatibilityGroupMembers.some(
        (member) => member.id === 'group-member-test',
      ),
    ).toBe(false);
  });

  it('adds cable prefixes, locations, and racks, then blocks unsafe deletes', () => {
    let state = createState();

    state = projectReducer(state, {
      type: 'ADD_CABLE_PREFIX',
      payload: { id: 'prefix-test', prefix: 'T', name: 'Test prefix' },
    });
    state = projectReducer(state, {
      type: 'ADD_LOCATION',
      payload: {
        id: 'location-test',
        name: 'Test Location',
        type: 'room',
        description: 'Temporary test location',
      },
    });
    state = projectReducer(state, {
      type: 'UPDATE_LOCATION',
      payload: {
        id: 'location-test',
        updates: { name: 'Test Location Updated', type: 'room', description: 'Updated' },
      },
    });
    state = projectReducer(state, {
      type: 'ADD_RACK',
      payload: {
        id: 'rack-test',
        locationId: 'location-test',
        subLocationId: null,
        name: 'Test Rack',
        heightRu: 12,
        numberingDirection: 'bottom_to_top',
      },
    });
    state = projectReducer(state, {
      type: 'UPDATE_RACK',
      payload: {
        id: 'rack-test',
        updates: { name: 'Test Rack Updated', heightRu: 14, numberingDirection: 'top_to_bottom' },
      },
    });
    const blockedLocationDelete = projectReducer(state, {
      type: 'DELETE_LOCATION',
      payload: { id: 'location-test' },
    });
    state = projectReducer(state, {
      type: 'DELETE_RACK',
      payload: { id: 'rack-test' },
    });
    state = projectReducer(state, {
      type: 'DELETE_LOCATION',
      payload: { id: 'location-test' },
    });

    expect(state.project.settings.cablePrefixes).toContainEqual({
      id: 'prefix-test',
      prefix: 'T',
      name: 'Test prefix',
    });
    expect(state.project.numberingLedgers).toContainEqual({ prefix: 'T', nextSuggested: 1, ranges: [] });
    expect(blockedLocationDelete.statusMessage).toBe(
      'Location deletion blocked: remove folders, racks, and devices first',
    );
    expect(state.project.racks.some((rack) => rack.id === 'rack-test')).toBe(false);
    expect(state.project.locations.some((location) => location.id === 'location-test')).toBe(false);
  });

  it('adds, updates, deletes, and clears referenced folders', () => {
    let state = createState();

    state = projectReducer(state, {
      type: 'ADD_SUB_LOCATION',
      payload: {
        id: 'sub-location-front-table',
        locationId: 'location-control-room',
        name: 'Front Table',
        description: 'Operator desk',
      },
    });
    state = projectReducer(state, {
      type: 'UPDATE_SUB_LOCATION',
      payload: {
        id: 'sub-location-front-table',
        updates: { name: 'Front Desk', description: 'Main operator desk' },
      },
    });

    state = {
      ...state,
      project: {
        ...state.project,
        racks: state.project.racks.map((rack) =>
          rack.id === 'rack-mcr-a' ? { ...rack, subLocationId: 'sub-location-front-table' } : rack,
        ),
        devices: state.project.devices.map((device) =>
          device.id === 'device-multiviewer-1'
            ? { ...device, subLocationId: 'sub-location-front-table' }
            : device,
        ),
      },
    };
    state = projectReducer(state, {
      type: 'DELETE_SUB_LOCATION',
      payload: { id: 'sub-location-front-table' },
    });

    expect(state.statusMessage).toBe('Folder deleted');
    expect(state.project.racks.find((rack) => rack.id === 'rack-mcr-a')?.subLocationId).toBeNull();
    expect(
      state.project.devices.find((device) => device.id === 'device-multiviewer-1')?.subLocationId,
    ).toBeNull();
    expect(
      state.project.subLocations.some((subLocation) => subLocation.id === 'sub-location-front-table'),
    ).toBe(false);
  });

  it('retains status text when persistence is updated without a message and dismisses import errors', () => {
    const state = {
      ...createState(),
      statusMessage: 'existing status',
      importError: 'import failed',
    };
    const saving = projectReducer(state, {
      type: 'SET_PERSISTENCE_STATE',
      payload: { persistenceState: 'saving' },
    });
    const dismissed = projectReducer(saving, { type: 'DISMISS_IMPORT_ERROR' });

    expect(saving.persistenceState).toBe('saving');
    expect(saving.statusMessage).toBe('existing status');
    expect(dismissed.importError).toBeNull();
  });
});

describe('projectReducer ADD_DEVICE safety', () => {
  it('leaves state unchanged when planned cable allocation fails', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_DEVICE',
      payload: {
        device: {
          id: 'device-overlap-test',
          name: 'Overlap Test',
          code: 'OVR',
          manufacturer: '',
          model: '',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          role: '',
          labelPrefix: 'OVR',
          mountType: 'non_rack',
          rackId: null,
          rackSizeRu: null,
          rackBottomRu: null,
          notes: '',
        },
        portGroups: [
          {
            name: 'OUT',
            direction: 'output',
            categoryId: 'category-video',
            connectorTypeId: 'connector-bnc',
            count: 1,
            portLabelPattern: '{DEVICE}-OUT-{000}',
            cablePrefix: 'V',
            firstCableNumber: 1,
            createPlannedCables: true,
          },
        ],
      },
    });

    expect(result.project).toBe(state.project);
    expect(result.statusMessage).toContain('Device creation blocked');
  });

  it('does not allocate ranges or planned cables when createPlannedCables is false', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_DEVICE',
      payload: {
        device: {
          id: 'device-no-planned-cables-test',
          name: 'No Planned Cables Test',
          code: 'NPC',
          manufacturer: '',
          model: '',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          role: '',
          labelPrefix: 'NPC',
          mountType: 'non_rack',
          rackId: null,
          rackSizeRu: null,
          rackBottomRu: null,
          notes: '',
        },
        portGroups: [
          {
            name: 'MON',
            direction: 'output',
            categoryId: 'category-video',
            connectorTypeId: 'connector-bnc',
            count: 2,
            portLabelPattern: '{DEVICE}-MON-{000}',
            cablePrefix: 'V',
            firstCableNumber: 100,
            createPlannedCables: false,
          },
        ],
      },
    });

    const portGroup = result.project.portGroups.find(
      (group) => group.deviceId === 'device-no-planned-cables-test',
    );
    const ports = result.project.ports.filter((port) => port.deviceId === 'device-no-planned-cables-test');

    expect(portGroup).toMatchObject({
      firstCableNumber: null,
      lastCableNumber: null,
      numberingRangeId: null,
      createPlannedCables: false,
    });
    expect(ports).toHaveLength(2);
    expect(ports.every((port) => port.plannedCableId === null)).toBe(true);
    expect(result.project.cables).toHaveLength(state.project.cables.length);
    expect(result.project.numberingLedgers).toEqual(state.project.numberingLedgers);
  });
});

describe('projectReducer ADD_TERMINAL_BLOCK', () => {
  it('creates rear/front ports and planned cables only for front ports', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_TERMINAL_BLOCK',
      payload: {
        terminalBlock: {
          id: 'device-tb-a',
          name: 'TB-A',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          labelPrefix: 'TB-A',
          rackId: 'rack-mcr-a',
          rackBottomRu: 1,
          connectorTypeId: 'connector-bnc',
          count: 2,
          cablePrefix: 'V',
          firstCableNumber: 9,
          createPlannedCables: true,
          notes: '',
        },
      },
    });
    const terminalBlock = result.project.devices.find((device) => device.id === 'device-tb-a');
    const portGroups = result.project.portGroups.filter((group) => group.deviceId === 'device-tb-a');
    const rearPorts = result.project.ports.filter(
      (port) => port.deviceId === 'device-tb-a' && port.direction === 'rear',
    );
    const frontPorts = result.project.ports.filter(
      (port) => port.deviceId === 'device-tb-a' && port.direction === 'front',
    );
    const frontCables = frontPorts.map((port) =>
      port.plannedCableId ? result.project.cables.find((cable) => cable.id === port.plannedCableId) : null,
    );

    expect(terminalBlock).toMatchObject({
      kind: 'terminal_block',
      mountType: 'rack',
      rackSizeRu: 1,
      rackId: 'rack-mcr-a',
      rackBottomRu: 1,
    });
    expect(terminalBlock).not.toHaveProperty('code');
    expect(portGroups.map((group) => group.direction).sort()).toEqual(['front', 'rear']);
    expect(rearPorts).toHaveLength(2);
    expect(frontPorts).toHaveLength(2);
    expect(rearPorts.every((port) => port.plannedCableId === null)).toBe(true);
    expect(frontCables.map((cable) => cable?.number)).toEqual(['V-0009', 'V-0010']);
    expect(frontCables.every((cable) => cable?.sideAEndpoint.type === 'tb_port')).toBe(true);
    expect(result.project.numberingLedgers[0].ranges).toContainEqual(
      expect.objectContaining({
        from: 9,
        to: 10,
        ownerId: expect.stringContaining('device-tb-a-front'),
      }),
    );
  });

  it('creates rear/front ports without cables when front planned numbering is disabled', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_TERMINAL_BLOCK',
      payload: {
        terminalBlock: {
          id: 'device-tb-no-cables',
          name: 'TB No Cables',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          labelPrefix: 'TB-NC',
          rackId: 'rack-mcr-a',
          rackBottomRu: 1,
          connectorTypeId: 'connector-bnc',
          count: 2,
          cablePrefix: 'V',
          firstCableNumber: null,
          createPlannedCables: false,
          notes: '',
        },
      },
    });
    const ports = result.project.ports.filter((port) => port.deviceId === 'device-tb-no-cables');
    const portGroups = result.project.portGroups.filter((group) => group.deviceId === 'device-tb-no-cables');

    expect(ports).toHaveLength(4);
    expect(ports.every((port) => port.plannedCableId === null)).toBe(true);
    expect(portGroups.every((group) => group.numberingRangeId === null)).toBe(true);
    expect(result.project.cables).toHaveLength(state.project.cables.length);
    expect(result.project.numberingLedgers).toEqual(state.project.numberingLedgers);
  });
});

describe('projectReducer UPDATE_DEVICE placement safety', () => {
  it('ignores rackId and rackBottomRu fields from normal device updates', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'UPDATE_DEVICE',
      payload: {
        id: 'device-router-1',
        updates: {
          name: 'Router 1 Updated',
          manufacturer: 'Updated Manufacturer',
          model: 'Updated Model',
          role: 'Updated Role',
          notes: 'Updated notes',
          locationId: 'location-machine-room',
          rackSizeRu: 2,
          rackId: null,
          rackBottomRu: 1,
        } as any,
      },
    });
    const device = result.project.devices.find((candidate) => candidate.id === 'device-router-1');

    expect(device).toMatchObject({
      name: 'Router 1 Updated',
      rackId: 'rack-mcr-a',
      rackBottomRu: 20,
    });
  });

  it('keeps a rack-mounted device location derived from the assigned rack', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'UPDATE_DEVICE',
      payload: {
        id: 'device-router-1',
        updates: {
          name: 'Router 1',
          manufacturer: '',
          model: '',
          role: '',
          notes: '',
          locationId: 'location-control-room',
          rackSizeRu: 2,
        },
      },
    });
    const device = result.project.devices.find((candidate) => candidate.id === 'device-router-1');

    expect(device?.locationId).toBe('location-machine-room');
  });

  it('allows rackSizeRu to be updated as mount-height metadata', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'UPDATE_DEVICE',
      payload: {
        id: 'device-router-1',
        updates: {
          name: 'Router 1',
          manufacturer: '',
          model: '',
          role: '',
          notes: '',
          locationId: 'location-control-room',
          rackSizeRu: 4,
        },
      },
    });
    const device = result.project.devices.find((candidate) => candidate.id === 'device-router-1');

    expect(device?.rackSizeRu).toBe(4);
    expect(device?.rackId).toBe('rack-mcr-a');
    expect(device?.rackBottomRu).toBe(20);
  });

  it('resets sub-location when a device moves to a location that does not own it', () => {
    const state = createState();
    const seededState = {
      ...state,
      project: {
        ...state.project,
        subLocations: [
          {
            id: 'sub-location-front-table',
            locationId: 'location-control-room',
            name: 'Front Table',
            description: '',
          },
        ],
        devices: state.project.devices.map((device) =>
          device.id === 'device-multiviewer-1'
            ? { ...device, subLocationId: 'sub-location-front-table' }
            : device,
        ),
      },
    };
    const result = projectReducer(seededState, {
      type: 'UPDATE_DEVICE',
      payload: {
        id: 'device-multiviewer-1',
        updates: {
          name: 'Multiviewer 1',
          manufacturer: '',
          model: '',
          role: '',
          notes: '',
          locationId: 'location-machine-room',
          subLocationId: 'sub-location-front-table',
          rackSizeRu: null,
        },
      },
    });
    const device = result.project.devices.find((candidate) => candidate.id === 'device-multiviewer-1');

    expect(device).toMatchObject({
      locationId: 'location-machine-room',
      subLocationId: null,
    });
  });
});

describe('projectReducer MOVE_MOUNTED_DEVICE', () => {
  it('assigns an eligible virtual device to a rack using existing placement fields', () => {
    const state = createState();
    const virtualDevice = {
      ...state.project.devices[0],
      id: 'device-tree-assign-test',
      name: 'Tree Assign Test',
      locationId: 'location-machine-room',
      mountType: 'virtual' as const,
      rackId: null,
      rackSizeRu: 1,
      rackBottomRu: null,
    };
    const result = projectReducer(
      {
        ...state,
        project: {
          ...state.project,
          devices: [...state.project.devices, virtualDevice],
        },
      },
      {
        type: 'MOVE_MOUNTED_DEVICE',
        payload: {
          deviceId: virtualDevice.id,
          targetRackId: 'rack-mcr-a',
          targetBottomRu: 1,
        },
      },
    );
    const movedDevice = result.project.devices.find((device) => device.id === virtualDevice.id);

    expect(movedDevice).toMatchObject({
      mountType: 'rack',
      locationId: 'location-machine-room',
      rackId: 'rack-mcr-a',
      rackBottomRu: 1,
      rackSizeRu: 1,
    });
  });

  it('blocks assigning a tree device without a valid rack size', () => {
    const state = createState();
    const virtualDevice = {
      ...state.project.devices[0],
      id: 'device-tree-invalid-size-test',
      name: 'Tree Invalid Size Test',
      locationId: 'location-machine-room',
      mountType: 'virtual' as const,
      rackId: null,
      rackSizeRu: null,
      rackBottomRu: null,
    };
    const seededState = {
      ...state,
      project: {
        ...state.project,
        devices: [...state.project.devices, virtualDevice],
      },
    };
    const result = projectReducer(seededState, {
      type: 'MOVE_MOUNTED_DEVICE',
      payload: {
        deviceId: virtualDevice.id,
        targetRackId: 'rack-mcr-a',
        targetBottomRu: 1,
      },
    });

    expect(result.project).toBe(seededState.project);
    expect(result.statusMessage).toContain('Set rack size before assigning to a rack');
  });

  it('unassigns standard rack devices while preserving rack height metadata', () => {
    const state = createState();
    const seededState = {
      ...state,
      project: {
        ...state.project,
        subLocations: [
          {
            id: 'sub-location-front-table',
            locationId: 'location-control-room',
            name: 'Front Table',
            description: '',
          },
        ],
        devices: state.project.devices.map((device) =>
          device.id === 'device-router-1' ? { ...device, subLocationId: 'sub-location-front-table' } : device,
        ),
      },
    };
    const result = projectReducer(seededState, {
      type: 'UNASSIGN_DEVICE_FROM_RACK',
      payload: { deviceId: 'device-router-1' },
    });
    const device = result.project.devices.find((candidate) => candidate.id === 'device-router-1');

    expect(device).toMatchObject({
      mountType: 'non_rack',
      rackId: null,
      rackBottomRu: null,
      rackSizeRu: 2,
      locationId: 'location-machine-room',
      subLocationId: null,
    });
    expect(result.statusMessage).toBe('Router 1 unassigned from rack');
  });

  it('blocks terminal blocks from rack unassign workflow', () => {
    const state = createState();
    const terminalBlock = {
      ...state.project.devices[0],
      id: 'device-tb-unassign-test',
      name: 'TB Unassign Test',
      kind: 'terminal_block' as const,
      rackSizeRu: 1,
      rackBottomRu: 1,
      rackId: 'rack-mcr-a',
      mountType: 'rack' as const,
    };
    const seededState = {
      ...state,
      project: {
        ...state.project,
        devices: [...state.project.devices, terminalBlock],
      },
    };
    const result = projectReducer(seededState, {
      type: 'UNASSIGN_DEVICE_FROM_RACK',
      payload: { deviceId: terminalBlock.id },
    });

    expect(result.project).toBe(seededState.project);
    expect(result.statusMessage).toBe('Rack unassign blocked: terminal blocks use the TB workflow');
  });

  it('moves navigator devices and terminal blocks to a target folder', () => {
    const state = createState();
    const seededState = {
      ...state,
      project: {
        ...state.project,
        subLocations: [
          {
            id: 'sub-location-mcr-racks',
            locationId: 'location-machine-room',
            name: 'MCR Racks',
            description: '',
          },
        ],
      },
    };
    const result = projectReducer(seededState, {
      type: 'MOVE_NAVIGATOR_ITEM_TO_FOLDER',
      payload: {
        itemType: 'device',
        itemId: 'device-router-1',
        targetLocationId: 'location-machine-room',
        targetFolderId: 'sub-location-mcr-racks',
      },
    });
    const device = result.project.devices.find((candidate) => candidate.id === 'device-router-1');

    expect(device).toMatchObject({
      locationId: 'location-machine-room',
      subLocationId: 'sub-location-mcr-racks',
    });
    expect(result.statusMessage).toBe('Router 1 moved to MCR Racks');
  });

  it('blocks moving racks with mounted devices to another location', () => {
    const state = createState();
    const seededState = {
      ...state,
      project: {
        ...state.project,
        subLocations: [
          {
            id: 'sub-location-front-table',
            locationId: 'location-control-room',
            name: 'Front Table',
            description: '',
          },
        ],
      },
    };
    const result = projectReducer(seededState, {
      type: 'MOVE_NAVIGATOR_ITEM_TO_FOLDER',
      payload: {
        itemType: 'rack',
        itemId: 'rack-mcr-a',
        targetLocationId: 'location-control-room',
        targetFolderId: 'sub-location-front-table',
      },
    });

    expect(result.project).toBe(seededState.project);
    expect(result.statusMessage).toBe('Move blocked: rack has mounted devices; unassign them first.');
  });

  it('allows moving empty racks to another location folder', () => {
    const state = createState();
    const seededState = {
      ...state,
      project: {
        ...state.project,
        subLocations: [
          {
            id: 'sub-location-front-table',
            locationId: 'location-control-room',
            name: 'Front Table',
            description: '',
          },
        ],
        racks: [
          ...state.project.racks,
          {
            id: 'rack-empty',
            locationId: 'location-machine-room',
            subLocationId: null,
            name: 'Empty Rack',
            heightRu: 12,
            numberingDirection: 'bottom_to_top' as const,
          },
        ],
      },
    };
    const result = projectReducer(seededState, {
      type: 'MOVE_NAVIGATOR_ITEM_TO_FOLDER',
      payload: {
        itemType: 'rack',
        itemId: 'rack-empty',
        targetLocationId: 'location-control-room',
        targetFolderId: 'sub-location-front-table',
      },
    });

    expect(result.project.racks.find((candidate) => candidate.id === 'rack-empty')).toMatchObject({
      locationId: 'location-control-room',
      subLocationId: 'sub-location-front-table',
    });
    expect(result.statusMessage).toBe('Empty Rack moved to Front Table');
  });

  it('moves navigator items back to the parent location and blocks mounted cross-location item moves', () => {
    const state = createState();
    const seededState = {
      ...state,
      project: {
        ...state.project,
        subLocations: [
          {
            id: 'sub-location-mcr-racks',
            locationId: 'location-machine-room',
            name: 'MCR Racks',
            description: '',
          },
        ],
        racks: state.project.racks.map((rack) =>
          rack.id === 'rack-mcr-a' ? { ...rack, subLocationId: 'sub-location-mcr-racks' } : rack,
        ),
      },
    };

    const movedRack = projectReducer(seededState, {
      type: 'MOVE_NAVIGATOR_ITEM_TO_FOLDER',
      payload: {
        itemType: 'rack',
        itemId: 'rack-mcr-a',
        targetLocationId: 'location-machine-room',
        targetFolderId: null,
      },
    });
    expect(movedRack.project.racks.find((rack) => rack.id === 'rack-mcr-a')?.subLocationId).toBeNull();

    const blocked = projectReducer(seededState, {
      type: 'MOVE_NAVIGATOR_ITEM_TO_FOLDER',
      payload: {
        itemType: 'device',
        itemId: 'device-router-1',
        targetLocationId: 'location-control-room',
        targetFolderId: null,
      },
    });
    expect(blocked.project).toBe(seededState.project);
    expect(blocked.statusMessage).toBe(
      'Move blocked: item is assigned to a rack in this location; release it first.',
    );
  });
});

describe('parseImportedProject schema compatibility', () => {
  it('preserves the currently open project after a failed import', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'IMPORT_PROJECT_FAILED',
      payload: { message: '$.devices[0].status: must be equal to one of the allowed values' },
    });

    expect(result.project).toBe(state.project);
    expect(result.importError).toContain('devices');
  });

  it('round-trips current schema exported project data', () => {
    const firstImport = parseImportedProject(structuredClone(sampleProject));

    expect(firstImport.ok).toBe(true);
    if (!firstImport.ok) {
      return;
    }

    const exportedJson = JSON.parse(JSON.stringify(firstImport.project));
    const secondImport = parseImportedProject(exportedJson);

    expect(secondImport.ok).toBe(true);
    if (!secondImport.ok) {
      return;
    }
    expect(secondImport.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
    expect(secondImport.project.cables[0]).toHaveProperty('sideAEndpoint');
    expect(secondImport.project.cables[0]).toHaveProperty('sideBEndpoint');
  });

  it('rejects older internal dev schemas instead of migrating them in this dev line', () => {
    const oldProject = structuredClone(sampleProject) as any;

    oldProject.schemaVersion = '0.2.8.11';

    const result = parseImportedProject(oldProject);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toContain('Unsupported schemaVersion');
  });
});
