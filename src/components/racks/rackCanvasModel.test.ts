import { describe, expect, it } from 'vitest';
import type { RackPlacementDiagnostic } from '../../domain/rackDiagnostics';
import { sampleProject } from '../../domain/sampleProject';
import type { Device, ProjectRoot, Rack } from '../../domain/types';
import {
  MAX_VIEWED_RACKS,
  buildRackCanvasModel,
  getAddableRacks,
  getDisplayRus,
  getMountedDeviceRows,
  getPreviewRows,
  getRackOptionLabel,
  getViewedRacks,
} from './rackCanvasModel';

function projectFixture(): ProjectRoot {
  return structuredClone(sampleProject);
}

function rack(overrides: Partial<Rack> = {}): Rack {
  return {
    id: 'rack-a',
    locationId: 'location-machine-room',
    name: 'Rack A',
    heightRu: 6,
    numberingDirection: 'bottom_to_top',
    ...overrides,
  };
}

function device(overrides: Partial<Device> = {}): Device {
  return {
    id: 'device-a',
    name: 'Device A',
    kind: 'device',
    code: 'A',
    manufacturer: '',
    model: '',
    categoryId: 'category-video',
    locationId: 'location-machine-room',
    subLocationId: null,
    role: '',
    labelPrefix: 'A',
    mountType: 'rack',
    rackId: 'rack-a',
    rackSizeRu: 2,
    rackBottomRu: 2,
    status: 'planned',
    notes: '',
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('rackCanvasModel', () => {
  it('calculates displayed RU order for both numbering directions', () => {
    expect(getDisplayRus(rack({ heightRu: 4, numberingDirection: 'bottom_to_top' }))).toEqual([4, 3, 2, 1]);
    expect(getDisplayRus(rack({ heightRu: 4, numberingDirection: 'top_to_bottom' }))).toEqual([1, 2, 3, 4]);
    expect(getDisplayRus(rack({ heightRu: -1 }))).toEqual([]);
  });

  it('calculates mounted-device rows for different sizes, positions, and directions', () => {
    const bottomToTop = rack({ heightRu: 6, numberingDirection: 'bottom_to_top' });
    const topToBottom = rack({ heightRu: 6, numberingDirection: 'top_to_bottom' });

    expect(getMountedDeviceRows(bottomToTop, device({ rackBottomRu: 2, rackSizeRu: 3 }), [])).toMatchObject({
      bottomRu: 2,
      topRu: 4,
      rowStart: 3,
      rowEnd: 6,
    });
    expect(getMountedDeviceRows(topToBottom, device({ rackBottomRu: 2, rackSizeRu: 3 }), [])).toMatchObject({
      bottomRu: 2,
      topRu: 4,
      rowStart: 2,
      rowEnd: 5,
    });
  });

  it('attaches diagnostics to the correct mounted device and skips blocking placements', () => {
    const warning: RackPlacementDiagnostic = {
      code: 'rack-location-device-location-mismatch',
      deviceId: 'device-a',
      deviceName: 'Device A',
      message: 'Location mismatch.',
      rackId: 'rack-a',
      severity: 'error',
    };
    const blocking: RackPlacementDiagnostic = {
      code: 'rack-mounted-device-exceeds-rack-height',
      deviceId: 'device-b',
      deviceName: 'Device B',
      message: 'Too tall.',
      rackId: 'rack-a',
      severity: 'error',
    };
    const model = buildRackCanvasModel(
      rack(),
      [device(), device({ id: 'device-b', name: 'Device B', rackBottomRu: 6 })],
      [warning, blocking],
    );

    expect(model.mountedDevices).toHaveLength(1);
    expect(model.mountedDevices[0].device.id).toBe('device-a');
    expect(model.mountedDevices[0].diagnostics).toEqual([warning]);
    expect(model.diagnostics).toEqual([warning, blocking]);
  });

  it('calculates preview rows with range and bottom-RU fallback behavior', () => {
    expect(getPreviewRows([6, 5, 4, 3, 2, 1], 2, 4)).toEqual({ rowStart: 3, rowEnd: 6 });
    expect(getPreviewRows([1, 2, 3, 4, 5, 6], 2, 4)).toEqual({ rowStart: 2, rowEnd: 5 });
    expect(getPreviewRows([6, 5, 4], 2, 2)).toBeNull();
    expect(getPreviewRows([6, 5, 4], 4, 2)).toEqual({ rowStart: 3, rowEnd: 4 });
  });

  it('filters viewed/addable racks and preserves current rack option labels', () => {
    const project = projectFixture();
    const racks = [
      ...project.racks,
      rack({ id: 'rack-control', locationId: 'location-control-room', name: 'Control Rack' }),
      rack({ id: 'rack-missing-location', locationId: 'missing', name: 'Loose Rack' }),
    ];

    expect(MAX_VIEWED_RACKS).toBe(4);
    expect(getViewedRacks(['rack-mcr-a', 'missing', 'rack-control'], racks).map((item) => item.id)).toEqual([
      'rack-mcr-a',
      'rack-control',
    ]);
    expect(getAddableRacks(racks, ['rack-mcr-a']).map((item) => item.id)).toEqual([
      'rack-control',
      'rack-missing-location',
    ]);
    expect(getRackOptionLabel(racks[1], project.locations)).toBe('Control Room / Control Rack');
    expect(getRackOptionLabel(racks[2], project.locations)).toBe('Loose Rack');
  });
});
