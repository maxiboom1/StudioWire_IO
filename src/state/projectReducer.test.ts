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
