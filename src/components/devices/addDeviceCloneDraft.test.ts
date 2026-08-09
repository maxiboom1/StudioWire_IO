import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import { createClonedAddDeviceDraft } from './addDeviceCloneDraft';
import { createSequentialAddDeviceLocalIdFactory } from './addDeviceLocalIds';

describe('Add Device clone draft', () => {
  it('copies reusable device and I/O data while deriving fresh placement and cable allocation state', () => {
    const project = structuredClone(sampleProject) as ProjectRoot;
    const sourceDevice = project.devices.find((device) => device.id === 'device-router-1')!;
    sourceDevice.subLocationId = 'folder-mcr';
    project.subLocations.push({
      id: 'folder-mcr',
      locationId: sourceDevice.locationId,
      name: 'Router Folder',
      description: '',
    });
    project.portGroups[0].colorOverride = '#123456';
    project.portGroups[0].devicePortLabelPattern = '{0}';
    project.portGroups[0].devicePortLabelMode = 'manual';
    project.ports
      .filter((port) => port.portGroupId === project.portGroups[0].id)
      .forEach((port) => (port.devicePortLabelOverride = `Body ${port.index}`));

    const draft = createClonedAddDeviceDraft(
      project,
      sourceDevice,
      createSequentialAddDeviceLocalIdFactory('clone'),
    );

    expect(draft.device).toEqual({
      name: 'Router 1',
      code: 'RTR1',
      manufacturer: 'Example Systems',
      model: 'XR-16',
      categoryId: 'category-video',
      locationId: 'location-machine-room',
      subLocationId: 'folder-mcr',
      role: '',
      labelPrefix: '',
      mountType: 'virtual',
      rackId: null,
      rackSizeRu: 2,
      rackBottomRu: null,
      notes: '',
    });
    expect(draft.portGroups).toEqual([
      {
        localId: 'clone-1',
        name: 'OUT',
        direction: 'output',
        categoryId: 'category-video',
        connectorTypeId: 'connector-bnc',
        count: 4,
        portLabelPattern: '{I/O NAME}-{000}',
        devicePortLabelPattern: '{0}',
        devicePortLabels: ['Body 1', 'Body 2', 'Body 3', 'Body 4'],
        cablePrefix: 'V',
        firstCableNumber: 9,
        createPlannedCables: true,
        colorOverride: '#123456',
      },
    ]);
    expect(project.portGroups[0].firstCableNumber).toBe(1);
    expect(project.numberingLedgers[0].nextSuggested).toBe(9);
  });
});
