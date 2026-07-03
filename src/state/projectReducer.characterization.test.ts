import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import type { Device, ProjectRoot } from '../domain/types';
import { createProjectReducer, type ProjectAction, type ProjectState } from './projectReducer';
import { createNewProject, stampProject } from './projectStamping';

const TEST_TIMESTAMP = '2026-06-26T10:00:00.000Z';
const dependencies = {
  nowIso: () => TEST_TIMESTAMP,
  makeId: (prefix: string, value: string) =>
    `${prefix}-${value.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`,
  makeUniqueId: (prefix: string, value: string) => `${prefix}-${value}-fixed`,
};
const reduce = createProjectReducer(dependencies);

function createState(project: ProjectRoot = structuredClone(sampleProject)): ProjectState {
  return {
    project,
    statusMessage: 'ready',
    importError: 'stale import error',
    persistenceState: 'saved',
  };
}

function lastChange(project: ProjectRoot) {
  return project.changeLog[project.changeLog.length - 1];
}

function expectStamped(result: ProjectState, message: string) {
  expect(result.project.project.updatedAt).toBe(TEST_TIMESTAMP);
  expect(result.project.project.updatedBy).toBe('local');
  expect(lastChange(result.project)).toMatchObject({
    timestamp: TEST_TIMESTAMP,
    message,
    author: 'local',
  });
}

function addTerminalBlock(state: ProjectState) {
  return reduce(state, {
    type: 'ADD_TERMINAL_BLOCK',
    payload: {
      terminalBlock: {
        id: 'device-tb-characterization',
        name: 'TB Characterization',
        categoryId: 'category-video',
        locationId: 'location-machine-room',
        labelPrefix: 'TB-C',
        rackId: 'rack-mcr-a',
        rackBottomRu: 1,
        connectorTypeId: 'connector-bnc',
        count: 1,
        cablePrefix: 'V',
        firstCableNumber: null,
        createPlannedCables: false,
        notes: '',
      },
    },
  });
}

describe('projectReducer action characterization', () => {
  const basicCases: Array<{
    name: string;
    action: ProjectAction;
    expectedStatus: string;
    expectedChange?: string;
    assert?: (result: ProjectState, before: ProjectState) => void;
  }> = [
    {
      name: 'NEW_PROJECT',
      action: { type: 'NEW_PROJECT' },
      expectedStatus: 'New project created',
      assert: (result) => {
        expect(result.project.project.name).toBe('Untitled Project');
        expect(result.project.project.createdAt).toBe(TEST_TIMESTAMP);
        expect(result.persistenceState).toBe('unsaved');
        expect(result.importError).toBeNull();
      },
    },
    {
      name: 'LOAD_SAMPLE_PROJECT',
      action: { type: 'LOAD_SAMPLE_PROJECT' },
      expectedStatus: 'Sample project loaded',
      expectedChange: 'Sample project loaded',
      assert: (result) => {
        expect(result.project.project.name).toBe('Demo Studio');
        expect(result.persistenceState).toBe('unsaved');
      },
    },
    {
      name: 'IMPORT_PROJECT_JSON',
      action: {
        type: 'IMPORT_PROJECT_JSON',
        payload: {
          project: structuredClone(sampleProject),
          validationIssues: [
            {
              id: 'issue-characterization',
              severity: 'warning',
              code: 'characterization',
              message: 'warning',
              objectType: 'project',
              objectId: sampleProject.project.id,
            },
          ],
        },
      },
      expectedStatus: 'Project imported; 1 validation issue(s) found',
      expectedChange: 'Project imported from JSON with 1 validation issue(s)',
      assert: (result) => {
        expect(result.project.validationIssues).toHaveLength(1);
        expect(result.persistenceState).toBe('unsaved');
        expect(result.importError).toBeNull();
      },
    },
    {
      name: 'IMPORT_PROJECT_FAILED',
      action: { type: 'IMPORT_PROJECT_FAILED', payload: { message: '$.schemaVersion: bad' } },
      expectedStatus: 'Import failed',
      assert: (result, before) => {
        expect(result.project).toBe(before.project);
        expect(result.importError).toBe('$.schemaVersion: bad');
      },
    },
    {
      name: 'SET_PERSISTENCE_STATE',
      action: {
        type: 'SET_PERSISTENCE_STATE',
        payload: { persistenceState: 'failed', message: 'Autosave failed: quota exceeded' },
      },
      expectedStatus: 'Autosave failed: quota exceeded',
      assert: (result, before) => {
        expect(result.project).toBe(before.project);
        expect(result.persistenceState).toBe('failed');
        expect(result.importError).toBe(before.importError);
      },
    },
    {
      name: 'UPDATE_PROJECT_INFO',
      action: {
        type: 'UPDATE_PROJECT_INFO',
        payload: { name: 'Renamed', customer: 'Customer', revision: 'B' },
      },
      expectedStatus: 'Project settings updated',
      expectedChange: 'Project settings updated',
      assert: (result) => {
        expect(result.project.project).toMatchObject({
          name: 'Renamed',
          customer: 'Customer',
          revision: 'B',
        });
      },
    },
    {
      name: 'ADD_CATEGORY',
      action: {
        type: 'ADD_CATEGORY',
        payload: { id: 'category-char', name: 'Char', defaultCablePrefix: 'CH', color: '#111827' },
      },
      expectedStatus: 'Category added',
      expectedChange: 'Category added: Char',
      assert: (result) => {
        expect(result.project.settings.categories).toContainEqual({
          id: 'category-char',
          name: 'Char',
          defaultCablePrefix: 'CH',
          color: '#111827',
        });
      },
    },
    {
      name: 'UPDATE_CATEGORY',
      action: {
        type: 'UPDATE_CATEGORY',
        payload: { id: 'category-video', updates: { name: 'Video Updated', defaultCablePrefix: 'VU' } },
      },
      expectedStatus: 'Category updated',
      expectedChange: 'Category updated: category-video',
      assert: (result) => {
        expect(
          result.project.settings.categories.find((category) => category.id === 'category-video'),
        ).toMatchObject({
          name: 'Video Updated',
          defaultCablePrefix: 'VU',
        });
      },
    },
    {
      name: 'ADD_CONNECTOR_TYPE',
      action: {
        type: 'ADD_CONNECTOR_TYPE',
        payload: { id: 'connector-char', name: 'Char Connector', iconKey: 'generic' },
      },
      expectedStatus: 'Connector type added',
      expectedChange: 'Connector type added: Char Connector',
    },
    {
      name: 'UPDATE_CONNECTOR_TYPE',
      action: {
        type: 'UPDATE_CONNECTOR_TYPE',
        payload: { id: 'connector-bnc', updates: { name: 'BNC Updated' } },
      },
      expectedStatus: 'Connector type updated',
      expectedChange: 'Connector type updated: connector-bnc',
    },
    {
      name: 'ADD_CABLE_PREFIX',
      action: { type: 'ADD_CABLE_PREFIX', payload: { id: 'prefix-char', prefix: 'CH', name: 'Char prefix' } },
      expectedStatus: 'Cable prefix added',
      expectedChange: 'Cable prefix added: CH',
      assert: (result) => {
        expect(result.project.numberingLedgers).toContainEqual({
          prefix: 'CH',
          nextSuggested: 1,
          ranges: [],
        });
      },
    },
    {
      name: 'ADD_LOCATION',
      action: {
        type: 'ADD_LOCATION',
        payload: { id: 'location-char', name: 'Char Location', type: 'room', description: 'desc' },
      },
      expectedStatus: 'Location created',
      expectedChange: 'Location created: Char Location',
    },
    {
      name: 'UPDATE_LOCATION',
      action: {
        type: 'UPDATE_LOCATION',
        payload: {
          id: 'location-machine-room',
          updates: { name: 'MCR Updated', type: 'machine_room', description: 'u' },
        },
      },
      expectedStatus: 'Location updated',
      expectedChange: 'Location updated: location-machine-room',
    },
    {
      name: 'ADD_RACK',
      action: {
        type: 'ADD_RACK',
        payload: {
          id: 'rack-char',
          locationId: 'location-machine-room',
          name: 'Char Rack',
          heightRu: 12,
          numberingDirection: 'bottom_to_top',
        },
      },
      expectedStatus: 'Rack created',
      expectedChange: 'Rack created: Char Rack',
    },
    {
      name: 'UPDATE_RACK',
      action: {
        type: 'UPDATE_RACK',
        payload: {
          id: 'rack-mcr-a',
          updates: { name: 'Rack Updated', heightRu: 42, numberingDirection: 'top_to_bottom' },
        },
      },
      expectedStatus: 'Rack updated',
      expectedChange: 'Rack updated: rack-mcr-a',
    },
    {
      name: 'VALIDATE_PROJECT',
      action: { type: 'VALIDATE_PROJECT' },
      expectedStatus: 'Validation passed',
      expectedChange: 'Project validation completed with no issues',
      assert: (result) => {
        expect(result.project.validationIssues).toEqual([]);
      },
    },
    {
      name: 'DISMISS_IMPORT_ERROR',
      action: { type: 'DISMISS_IMPORT_ERROR' },
      expectedStatus: 'ready',
      assert: (result, before) => {
        expect(result.project).toBe(before.project);
        expect(result.importError).toBeNull();
      },
    },
  ];

  it.each(basicCases)('$name preserves characterized state semantics', (testCase) => {
    const before = createState();
    const result = reduce(before, testCase.action);

    expect(result.statusMessage).toBe(testCase.expectedStatus);
    if (testCase.expectedChange) {
      expectStamped(result, testCase.expectedChange);
      expect(result.importError).toBeNull();
    }
    testCase.assert?.(result, before);
  });

  it('characterizes category assignment and compatibility-group member branches', () => {
    const withCategory = reduce(createState(), {
      type: 'ADD_CATEGORY',
      payload: { id: 'category-char', name: 'Char', defaultCablePrefix: 'CH', color: '#111827' },
    });
    const withConnector = reduce(withCategory, {
      type: 'ADD_CONNECTOR_TYPE',
      payload: { id: 'connector-char', name: 'Char Connector', iconKey: 'generic' },
    });
    const withAssignment = reduce(withConnector, {
      type: 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT',
      payload: { id: 'assignment-char', categoryId: 'category-char', connectorTypeId: 'connector-char' },
    });
    const duplicateAssignment = reduce(withAssignment, {
      type: 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT',
      payload: { id: 'assignment-char-dupe', categoryId: 'category-char', connectorTypeId: 'connector-char' },
    });
    const withGroup = reduce(withAssignment, {
      type: 'ADD_CONNECTOR_GROUP',
      payload: { id: 'group-char', categoryId: 'category-char', name: 'Char group' },
    });
    const updatedGroup = reduce(withGroup, {
      type: 'UPDATE_CONNECTOR_GROUP',
      payload: { id: 'group-char', updates: { name: 'Char group updated' } },
    });
    const withMember = reduce(updatedGroup, {
      type: 'ADD_CONNECTOR_GROUP_MEMBER',
      payload: { id: 'member-char', groupId: 'group-char', connectorTypeId: 'connector-char' },
    });
    const duplicateMember = reduce(withMember, {
      type: 'ADD_CONNECTOR_GROUP_MEMBER',
      payload: { id: 'member-char-dupe', groupId: 'group-char', connectorTypeId: 'connector-char' },
    });
    const withoutMember = reduce(withMember, {
      type: 'REMOVE_CONNECTOR_GROUP_MEMBER',
      payload: { groupId: 'group-char', connectorTypeId: 'connector-char' },
    });
    const removedAssignment = reduce(withMember, {
      type: 'REMOVE_CATEGORY_CONNECTOR_ASSIGNMENT',
      payload: { categoryId: 'category-char', connectorTypeId: 'connector-char' },
    });

    expect(withAssignment.statusMessage).toBe('Connector assigned to category');
    expectStamped(withAssignment, 'Connector assigned to category: connector-char');
    expect(duplicateAssignment.statusMessage).toBe('Connector already assigned to category');
    expect(duplicateAssignment.project).toBe(withAssignment.project);
    expect(
      updatedGroup.project.settings.connectorCompatibilityGroups.find((group) => group.id === 'group-char'),
    ).toMatchObject({
      name: 'Char group updated',
    });
    expect(withMember.statusMessage).toBe('Connector added to group');
    expect(duplicateMember.statusMessage).toBe('Connector already belongs to group');
    expect(duplicateMember.project).toBe(withMember.project);
    expect(withoutMember.project.settings.connectorCompatibilityGroupMembers).not.toContainEqual(
      expect.objectContaining({ id: 'member-char' }),
    );
    expect(removedAssignment.project.settings.categoryConnectorAssignments).not.toContainEqual(
      expect.objectContaining({ id: 'assignment-char' }),
    );
    expect(removedAssignment.project.settings.connectorCompatibilityGroupMembers).not.toContainEqual(
      expect.objectContaining({ id: 'member-char' }),
    );
  });

  it('characterizes duplicate cable-prefix behavior without duplicating ledgers', () => {
    const result = reduce(createState(), {
      type: 'ADD_CABLE_PREFIX',
      payload: { id: 'prefix-video-duplicate', prefix: 'V', name: 'Video duplicate' },
    });

    expect(result.statusMessage).toBe('Cable prefix added');
    expect(result.project.settings.cablePrefixes.filter((prefix) => prefix.prefix === 'V')).toHaveLength(2);
    expect(result.project.numberingLedgers.filter((ledger) => ledger.prefix === 'V')).toHaveLength(1);
  });

  it('characterizes hierarchy delete success and blocked branches', () => {
    const blockedLocationDelete = reduce(createState(), {
      type: 'DELETE_LOCATION',
      payload: { id: 'location-machine-room' },
    });
    const blockedRackDelete = reduce(createState(), {
      type: 'DELETE_RACK',
      payload: { id: 'rack-mcr-a' },
    });
    const withEmptyLocation = reduce(createState(), {
      type: 'ADD_LOCATION',
      payload: { id: 'location-empty', name: 'Empty', type: 'room', description: '' },
    });
    const deletedLocation = reduce(withEmptyLocation, {
      type: 'DELETE_LOCATION',
      payload: { id: 'location-empty' },
    });
    const withEmptyRack = reduce(createState(), {
      type: 'ADD_RACK',
      payload: {
        id: 'rack-empty',
        locationId: 'location-machine-room',
        name: 'Empty Rack',
        heightRu: 8,
        numberingDirection: 'bottom_to_top',
      },
    });
    const deletedRack = reduce(withEmptyRack, { type: 'DELETE_RACK', payload: { id: 'rack-empty' } });

    expect(blockedLocationDelete.statusMessage).toBe(
      'Location deletion blocked: remove racks and devices first',
    );
    expect(blockedLocationDelete.importError).toBe('stale import error');
    expect(blockedRackDelete.statusMessage).toBe('Rack deletion blocked: unassign devices first');
    expect(deletedLocation.project.locations.some((location) => location.id === 'location-empty')).toBe(
      false,
    );
    expectStamped(deletedLocation, 'Location deleted: location-empty');
    expect(deletedRack.project.racks.some((rack) => rack.id === 'rack-empty')).toBe(false);
    expectStamped(deletedRack, 'Rack deleted: rack-empty');
  });

  it('characterizes device and terminal-block lifecycle guarded branches', () => {
    const deviceCreated = reduce(createState(), {
      type: 'ADD_DEVICE',
      payload: {
        device: {
          id: 'device-char',
          name: 'Char Device',
          code: 'CHAR',
          manufacturer: '',
          model: '',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          role: '',
          labelPrefix: 'CHAR',
          mountType: 'non_rack',
          rackId: null,
          rackSizeRu: null,
          rackBottomRu: null,
          notes: '',
        },
        portGroups: [],
      },
    });
    const failedDeviceState = createState();
    const failedDevice = reduce(failedDeviceState, {
      type: 'ADD_DEVICE',
      payload: {
        device: {
          id: 'device-fail',
          name: 'Fail Device',
          code: 'FAIL',
          manufacturer: '',
          model: '',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          role: '',
          labelPrefix: 'FAIL',
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
    const terminalBlockCreated = addTerminalBlock(createState());
    const failedTerminalBlock = reduce(createState(), {
      type: 'ADD_TERMINAL_BLOCK',
      payload: {
        terminalBlock: {
          id: 'device-tb-fail',
          name: 'TB Fail',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          labelPrefix: 'TBF',
          rackId: 'missing-rack',
          rackBottomRu: 1,
          connectorTypeId: 'connector-bnc',
          count: 1,
          cablePrefix: 'V',
          firstCableNumber: null,
          createPlannedCables: false,
          notes: '',
        },
      },
    });
    const updatedDevice = reduce(createState(), {
      type: 'UPDATE_DEVICE',
      payload: {
        id: 'device-router-1',
        updates: {
          name: 'Router Updated',
          manufacturer: 'M',
          model: 'Model',
          role: 'Role',
          notes: 'Notes',
          locationId: 'location-control-room',
          rackSizeRu: 4,
        },
      },
    });
    const updatedTerminalBlock = reduce(terminalBlockCreated, {
      type: 'UPDATE_DEVICE',
      payload: {
        id: 'device-tb-characterization',
        updates: {
          name: 'TB Renamed',
          manufacturer: 'Ignored',
          model: 'Ignored',
          role: 'Ignored',
          notes: 'TB notes',
          locationId: 'location-control-room',
          rackSizeRu: 5,
        },
      },
    });
    const invalidLocationUpdateState = createState();
    const blockedInvalidLocationUpdate = reduce(invalidLocationUpdateState, {
      type: 'UPDATE_DEVICE',
      payload: {
        id: 'device-router-1',
        updates: {
          name: 'Blocked',
          notes: '',
          locationId: 'missing-location',
          rackSizeRu: 1,
        },
      },
    });

    expect(deviceCreated.project.devices).toContainEqual(expect.objectContaining({ id: 'device-char' }));
    expectStamped(deviceCreated, 'Device created: Char Device');
    expect(failedDevice.project).toBe(failedDeviceState.project);
    expect(failedDevice.statusMessage).toContain('Device creation blocked');
    expect(terminalBlockCreated.project.devices).toContainEqual(
      expect.objectContaining({ id: 'device-tb-characterization', kind: 'terminal_block', rackSizeRu: 1 }),
    );
    expect(failedTerminalBlock.statusMessage).toBe('Terminal block creation blocked: select a valid rack.');
    expect(updatedDevice.project.devices.find((device) => device.id === 'device-router-1')).toMatchObject({
      name: 'Router Updated',
      manufacturer: 'M',
      model: 'Model',
      role: 'Role',
      rackSizeRu: 4,
      locationId: 'location-machine-room',
      updatedAt: TEST_TIMESTAMP,
    });
    const terminalBlock = updatedTerminalBlock.project.devices.find(
      (device) => device.id === 'device-tb-characterization',
    ) as Device;
    expect(terminalBlock).toMatchObject({ name: 'TB Renamed', notes: 'TB notes', rackSizeRu: 1 });
    expect(terminalBlock).not.toHaveProperty('manufacturer');
    expect(blockedInvalidLocationUpdate.statusMessage).toContain('select a valid location');
    expect(blockedInvalidLocationUpdate.project).toBe(invalidLocationUpdateState.project);
  });

  it('characterizes mounted-device move success and placement failure', () => {
    const virtualDevice = {
      ...sampleProject.devices[0],
      id: 'device-virtual-char',
      name: 'Virtual Char',
      mountType: 'virtual' as const,
      locationId: 'location-machine-room',
      rackId: null,
      rackSizeRu: 1,
      rackBottomRu: null,
    };
    const state = createState({
      ...structuredClone(sampleProject),
      devices: [...sampleProject.devices, virtualDevice],
    });
    const moved = reduce(state, {
      type: 'MOVE_MOUNTED_DEVICE',
      payload: { deviceId: 'device-virtual-char', targetRackId: 'rack-mcr-a', targetBottomRu: 1 },
    });
    const invalid = reduce(
      createState({
        ...structuredClone(sampleProject),
        devices: [{ ...virtualDevice, rackSizeRu: null }],
      }),
      {
        type: 'MOVE_MOUNTED_DEVICE',
        payload: { deviceId: 'device-virtual-char', targetRackId: 'rack-mcr-a', targetBottomRu: 1 },
      },
    );
    expect(moved.project.devices.find((device) => device.id === 'device-virtual-char')).toMatchObject({
      mountType: 'rack',
      rackId: 'rack-mcr-a',
      locationId: 'location-machine-room',
      rackBottomRu: 1,
      updatedAt: TEST_TIMESTAMP,
    });
    expect(moved.statusMessage).toBe('Virtual Char moved to MCR Rack A RU 1');
    expect(invalid.statusMessage).toContain('Set rack size before assigning to a rack');
  });

  it('characterizes connection success, rejection, disconnection success, and rejection', () => {
    const connected = reduce(createState(), {
      type: 'CONNECT_PORTS',
      payload: {
        fromPortId: 'port-group-router-outputs-port-0001',
        toPortId: 'port-group-multiviewer-inputs-port-0001',
      },
    });
    const rejectedConnect = reduce(createState(), {
      type: 'CONNECT_PORTS',
      payload: {
        fromPortId: 'port-group-router-outputs-port-0001',
        toPortId: 'port-group-router-outputs-port-0001',
      },
    });
    const disconnected = reduce(connected, {
      type: 'DISCONNECT_PORT',
      payload: { portId: 'port-group-router-outputs-port-0001' },
    });
    const rejectedDisconnect = reduce(createState(), {
      type: 'DISCONNECT_PORT',
      payload: { portId: 'port-group-multiviewer-inputs-port-0001' },
    });

    expect(connected.statusMessage).toContain('connected RTR1-OUT-001 to MV1-IN-001');
    expect(connected.project.cables.find((cable) => cable.id === 'cable-v-0001')).toMatchObject({
      status: 'connected',
      sideBEndpoint: { id: 'port-group-multiviewer-inputs-port-0001' },
    });
    expect(rejectedConnect.statusMessage).toBe('Cannot connect a port to itself.');
    expect(disconnected.statusMessage).toBe('Connection cleared for RTR1-OUT-001');
    expect(disconnected.project.cables.find((cable) => cable.id === 'cable-v-0001')).toMatchObject({
      status: 'planned',
      sideBEndpoint: { type: 'unknown', id: null },
    });
    expect(rejectedDisconnect.statusMessage).toBe('No active connection to clear.');
  });

  it('characterizes hard delete side effects and reusable reserved-number behavior', () => {
    const result = reduce(createState(), { type: 'DELETE_DEVICE', payload: { id: 'device-router-1' } });

    expect(result.statusMessage).toBe('Device deleted; cable numbers released');
    expect(result.project.devices.some((device) => device.id === 'device-router-1')).toBe(false);
    expect(result.project.portGroups.some((group) => group.deviceId === 'device-router-1')).toBe(false);
    expect(result.project.ports.some((port) => port.portGroupId === 'port-group-router-outputs')).toBe(false);
    expect(result.project.cables).toHaveLength(0);
    expect(result.project.numberingLedgers[0].nextSuggested).toBe(1);
    expect(result.project.numberingLedgers[0].ranges.some((range) => range.id === 'range-v-router-outputs')).toBe(
      false,
    );
    expect(
      result.project.numberingLedgers[0].ranges.find((range) => range.status === 'reserved_gap'),
    ).toMatchObject({
      from: 5,
      to: 8,
    });
    expectStamped(result, 'Device deleted: device-router-1');
  });

  it('centralizes deterministic project creation and stamping helpers', () => {
    const project = createNewProject(dependencies);
    const stamped = stampProject(project, 'Characterized change', dependencies);

    expect(project.project).toMatchObject({
      id: 'project-untitled-fixed',
      createdAt: TEST_TIMESTAMP,
      updatedAt: TEST_TIMESTAMP,
    });
    expect(stamped.changeLog).toHaveLength(2);
    expect(lastChange(stamped)).toMatchObject({
      id: 'change-2026-06-26t10-00-00-000z-characterized-change',
      message: 'Characterized change',
    });
  });
});
