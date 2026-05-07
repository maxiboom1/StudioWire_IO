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
