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
});
