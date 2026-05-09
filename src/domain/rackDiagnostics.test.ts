import { describe, expect, it } from 'vitest';
import type { Device, ProjectRoot } from './types';
import { sampleProject } from './sampleProject';
import { analyzeRackPlacements } from './rackDiagnostics';

const baseProject = structuredClone(sampleProject);
const rackMountedDevice = baseProject.devices.find((device) => device.id === 'device-router-1') as Device;
const virtualDevice = baseProject.devices.find((device) => device.id === 'device-multiviewer-1') as Device;

function withDevices(devices: Device[]): ProjectRoot {
  return {
    ...structuredClone(baseProject),
    devices,
  };
}

describe('analyzeRackPlacements', () => {
  it('does not flag virtual or unassigned devices without rack placement', () => {
    const project = withDevices([
      {
        ...virtualDevice,
        id: 'device-virtual-clean',
        locationId: null,
        mountType: 'virtual',
        rackId: null,
        rackSizeRu: null,
        rackBottomRu: null,
      },
    ]);

    expect(analyzeRackPlacements(project)).toHaveLength(0);
  });

  it('detects rack-mounted devices without rack assignment', () => {
    const project = withDevices([
      {
        ...rackMountedDevice,
        rackId: null,
      },
    ]);

    expect(analyzeRackPlacements(project)).toMatchObject([
      {
        code: 'rack-mounted-device-without-rack',
        deviceId: rackMountedDevice.id,
        rackId: null,
      },
    ]);
  });

  it('detects missing rack references', () => {
    const project = withDevices([
      {
        ...rackMountedDevice,
        rackId: 'rack-missing',
      },
    ]);

    expect(analyzeRackPlacements(project)[0]).toMatchObject({
      code: 'device-references-missing-rack',
      rackId: 'rack-missing',
    });
  });

  it('detects invalid rack size and bottom RU', () => {
    const project = withDevices([
      {
        ...rackMountedDevice,
        id: 'device-invalid-size',
        rackSizeRu: null,
      },
      {
        ...rackMountedDevice,
        id: 'device-invalid-bottom',
        rackBottomRu: null,
      },
    ]);
    const diagnostics = analyzeRackPlacements(project);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'rack-mounted-device-invalid-size-ru',
      'rack-mounted-device-invalid-bottom-ru',
    ]);
  });

  it('detects placement below RU 1 and above rack height', () => {
    const project = withDevices([
      {
        ...rackMountedDevice,
        id: 'device-below',
        rackBottomRu: 0,
      },
      {
        ...rackMountedDevice,
        id: 'device-above',
        rackBottomRu: 42,
      },
    ]);
    const diagnostics = analyzeRackPlacements(project);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'rack-mounted-device-below-ru-one',
      'rack-mounted-device-exceeds-rack-height',
    ]);
  });

  it('detects rack location mismatch and overlaps', () => {
    const project = withDevices([
      {
        ...rackMountedDevice,
        id: 'device-left',
        locationId: 'location-control-room',
        rackBottomRu: 20,
      },
      {
        ...rackMountedDevice,
        id: 'device-right',
        name: 'Right Device',
        rackBottomRu: 21,
      },
    ]);
    const diagnostics = analyzeRackPlacements(project);

    expect(diagnostics.some((diagnostic) => diagnostic.code === 'rack-location-device-location-mismatch')).toBe(true);
    expect(diagnostics.filter((diagnostic) => diagnostic.code === 'rack-ru-overlap')).toHaveLength(2);
  });
});
