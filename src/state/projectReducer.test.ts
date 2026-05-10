import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import { projectReducer, type ProjectState } from './projectReducer';

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

describe('projectReducer ADD_TERMINAL_BLOCK', () => {
  function makeTerminalBlockPayload(overrides = {}) {
    return {
      id: 'terminal-block-test',
      name: 'Test TB',
      code: 'TB T',
      manufacturer: '',
      model: '',
      categoryId: 'category-video',
      locationId: 'location-machine-room',
      role: '',
      labelPrefix: 'TB T',
      rackSizeRu: 1,
      notes: '',
      connectorTypeId: 'connector-bnc',
      cablePrefix: 'V',
      positionCount: 4,
      plannedCableMode: 'none' as const,
      firstCableNumber: null,
      ...overrides,
    };
  }

  it('adds a terminal block without planned cables', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_TERMINAL_BLOCK',
      payload: makeTerminalBlockPayload(),
    });
    const terminalBlock = result.project.terminalBlocks.find((candidate) => candidate.id === 'terminal-block-test');
    const portGroup = result.project.terminalBlockPortGroups.find(
      (candidate) => candidate.terminalBlockId === 'terminal-block-test',
    );
    const ports = result.project.terminalBlockPorts.filter((port) => port.terminalBlockId === 'terminal-block-test');

    expect(terminalBlock).toMatchObject({ name: 'Test TB', labelPrefix: 'TB T' });
    expect(portGroup).toMatchObject({ plannedCableMode: 'none', firstCableNumber: null, lastCableNumber: null });
    expect(ports).toHaveLength(8);
    expect(result.project.cables).toHaveLength(state.project.cables.length);
  });

  it('adds a terminal block with rear planned cables', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_TERMINAL_BLOCK',
      payload: makeTerminalBlockPayload({
        id: 'terminal-block-rear-test',
        plannedCableMode: 'rear' as const,
        firstCableNumber: 9,
      }),
    });
    const cables = result.project.cables.filter((cable) => cable.sourceEndpoint.type === 'tb_port');
    const portGroup = result.project.terminalBlockPortGroups.find(
      (candidate) => candidate.terminalBlockId === 'terminal-block-rear-test',
    );

    expect(cables).toHaveLength(4);
    expect(cables.every((cable) => cable.sourceEndpoint.label.endsWith('rear'))).toBe(true);
    expect(portGroup).toMatchObject({ firstCableNumber: 9, lastCableNumber: 12 });
  });

  it('adds a terminal block with front planned cables', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_TERMINAL_BLOCK',
      payload: makeTerminalBlockPayload({
        id: 'terminal-block-front-test',
        plannedCableMode: 'front' as const,
        firstCableNumber: 9,
      }),
    });
    const cables = result.project.cables.filter((cable) => cable.sourceEndpoint.type === 'tb_port');

    expect(cables).toHaveLength(4);
    expect(cables.every((cable) => cable.sourceEndpoint.label.endsWith('front'))).toBe(true);
  });

  it('adds a terminal block with both-face planned cables', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_TERMINAL_BLOCK',
      payload: makeTerminalBlockPayload({
        id: 'terminal-block-both-test',
        plannedCableMode: 'both' as const,
        firstCableNumber: 9,
      }),
    });
    const cables = result.project.cables.filter((cable) => cable.sourceEndpoint.type === 'tb_port');
    const ledger = result.project.numberingLedgers.find((candidate) => candidate.prefix === 'V');
    const newRanges = ledger?.ranges.filter((range) => range.ownerId.includes('terminal-block-both-test'));

    expect(cables).toHaveLength(8);
    expect(newRanges).toHaveLength(2);
    expect(newRanges?.map((range) => [range.from, range.to])).toEqual([
      [9, 12],
      [13, 16],
    ]);
  });

  it('rejects an invalid terminal block cable range without partial creation', () => {
    const state = createState();
    const result = projectReducer(state, {
      type: 'ADD_TERMINAL_BLOCK',
      payload: makeTerminalBlockPayload({
        id: 'terminal-block-invalid-range-test',
        plannedCableMode: 'rear' as const,
        firstCableNumber: 1,
      }),
    });

    expect(result.project).toBe(state.project);
    expect(result.statusMessage).toContain('Terminal block creation blocked');
  });
});
