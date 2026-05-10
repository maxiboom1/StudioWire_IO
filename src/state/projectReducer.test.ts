import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import { parseImportedProject, projectReducer, type ProjectState } from './projectReducer';

function createState(): ProjectState {
  return {
    project: structuredClone(sampleProject),
    statusMessage: 'ready',
    importError: null,
  };
}

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

    const portGroup = result.project.portGroups.find((group) => group.deviceId === 'device-no-planned-cables-test');
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
    const rearPorts = result.project.ports.filter((port) => port.deviceId === 'device-tb-a' && port.direction === 'rear');
    const frontPorts = result.project.ports.filter((port) => port.deviceId === 'device-tb-a' && port.direction === 'front');
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
    expect(frontCables.every((cable) => cable?.sourceEndpoint.type === 'tb_port')).toBe(true);
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
});

describe('projectReducer MOVE_MOUNTED_DEVICE', () => {
  it('assigns an eligible virtual device to a rack using existing placement fields', () => {
    const state = createState();
    const virtualDevice = {
      ...state.project.devices[0],
      id: 'device-tree-assign-test',
      name: 'Tree Assign Test',
      locationId: null,
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
      locationId: null,
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
});

describe('parseImportedProject schema compatibility', () => {
  it('normalizes old projects with devices missing kind', () => {
    const oldProject = structuredClone(sampleProject) as any;

    oldProject.schemaVersion = '0.1.0';
    delete oldProject.devices[0].kind;

    const result = parseImportedProject(oldProject);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.project.schemaVersion).toBe('0.2.4.1');
    expect(result.project.devices[0]).toMatchObject({
      kind: 'device',
      code: 'RTR1',
    });
  });
});
