import { describe, expect, it } from 'vitest';
import type { Device, ProjectRoot, Rack } from './types';
import { sampleProject } from './sampleProject';
import { validateRackPlacement } from './rackPlacement';

const baseProject = structuredClone(sampleProject);
const mountedDevice = baseProject.devices.find((device) => device.id === 'device-router-1') as Device;

function withProject(overrides: Partial<ProjectRoot>): ProjectRoot {
  return {
    ...structuredClone(baseProject),
    ...overrides,
  };
}

describe('validateRackPlacement', () => {
  it('allows moving a mounted device to empty cells in the same rack', () => {
    const result = validateRackPlacement(baseProject, {
      deviceId: mountedDevice.id,
      targetRackId: 'rack-mcr-a',
      targetBottomRu: 10,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.targetTopRu).toBe(11);
    }
  });

  it('allows moving a mounted device into another rack and location', () => {
    const targetRack: Rack = {
      id: 'rack-control-a',
      locationId: 'location-control-room',
      name: 'Control Rack A',
      heightRu: 24,
      numberingDirection: 'bottom_to_top',
    };
    const project = withProject({
      racks: [...baseProject.racks, targetRack],
    });
    const result = validateRackPlacement(project, {
      deviceId: mountedDevice.id,
      targetRackId: targetRack.id,
      targetBottomRu: 4,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.targetRack.locationId).toBe('location-control-room');
    }
  });

  it('allows assigning an eligible virtual device to a rack', () => {
    const virtualDevice: Device = {
      ...mountedDevice,
      id: 'device-virtual-eligible',
      name: 'Virtual Eligible',
      locationId: null,
      mountType: 'virtual',
      rackId: null,
      rackSizeRu: 1,
      rackBottomRu: null,
    };
    const project = withProject({
      devices: [...baseProject.devices, virtualDevice],
    });
    const result = validateRackPlacement(project, {
      deviceId: virtualDevice.id,
      targetRackId: 'rack-mcr-a',
      targetBottomRu: 1,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.targetBottomRu).toBe(1);
      expect(result.targetRack.locationId).toBe('location-machine-room');
    }
  });

  it('rejects placement that overlaps another device', () => {
    const blocker: Device = {
      ...mountedDevice,
      id: 'device-blocker',
      name: 'Blocker',
      rackBottomRu: 10,
    };
    const project = withProject({
      devices: [...baseProject.devices, blocker],
    });

    expect(
      validateRackPlacement(project, {
        deviceId: mountedDevice.id,
        targetRackId: 'rack-mcr-a',
        targetBottomRu: 10,
      }),
    ).toEqual({
      ok: false,
      message: 'Target RU range overlaps Blocker.',
    });
  });

  it('rejects placement outside rack capacity', () => {
    const result = validateRackPlacement(baseProject, {
      deviceId: mountedDevice.id,
      targetRackId: 'rack-mcr-a',
      targetBottomRu: 42,
    });

    expect(result.ok).toBe(false);
  });

  it('rejects devices without a positive rack size', () => {
    const project = withProject({
      devices: [
        {
          ...mountedDevice,
          rackSizeRu: null,
        },
      ],
    });

    expect(
      validateRackPlacement(project, {
        deviceId: mountedDevice.id,
        targetRackId: 'rack-mcr-a',
        targetBottomRu: 1,
      }),
    ).toEqual({
      ok: false,
      message: 'Set rack size before assigning to a rack.',
    });
  });
});
