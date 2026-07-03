import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { Device, ProjectRoot } from '../../domain/types';
import {
  buildLeftTreeModel,
  getDeviceTreeMeta,
  getDeviceTreeTitle,
  getLocationFolderKey,
  getLocationKey,
} from './leftTreeModel';
import { isTreeKeyOpen, toggleCollapsedKey } from './useCollapsedTree';

function projectFixture(): ProjectRoot {
  const project = structuredClone(sampleProject);

  project.devices = [
    ...project.devices,
    device({ id: 'device-tb', name: 'TB 1', kind: 'terminal_block', locationId: 'location-machine-room' }),
    device({ id: 'device-virtual', name: 'Virtual Device', locationId: 'location-machine-room', rackSizeRu: null }),
    device({ id: 'device-unknown-location', name: 'Unknown Location Device', locationId: 'missing' }),
  ];

  return project;
}

function device(overrides: Partial<Device>): Device {
  return {
    id: 'device-extra',
    name: 'Extra Device',
    kind: 'device',
    code: 'EX',
    manufacturer: '',
    model: '',
    categoryId: 'category-video',
    locationId: 'location-machine-room',
    subLocationId: null,
    role: 'Role',
    labelPrefix: 'EX',
    mountType: 'rack',
    rackId: null,
    rackSizeRu: 1,
    rackBottomRu: null,
    status: 'planned',
    notes: '',
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('leftTreeModel', () => {
  it('builds location branches in project order with current rack/device/TB grouping', () => {
    const model = buildLeftTreeModel(projectFixture());

    expect(model.locations.map((branch) => branch.location.name)).toEqual(['Control Room', 'Machine Room']);
    expect(model.locations[0]).toMatchObject({
      key: 'location:location-control-room',
      racksKey: 'location:location-control-room:racks',
      devicesKey: 'location:location-control-room:devices',
      terminalBlocksKey: 'location:location-control-room:terminal-blocks',
      count: 1,
    });
    expect(model.locations[0].devices.map((item) => item.name)).toEqual(['Multiviewer 1']);
    expect(model.locations[1].racks.map((item) => item.name)).toEqual(['MCR Rack A']);
    expect(model.locations[1].devices.map((item) => item.name)).toEqual(['Router 1', 'Virtual Device']);
    expect(model.locations[1].terminalBlocks.map((item) => item.name)).toEqual(['TB 1']);
  });

  it('detects empty navigator, creates stable keys, and formats device title/meta labels', () => {
    const emptyProject = {
      ...projectFixture(),
      locations: [],
      racks: [],
      devices: [],
    };

    expect(buildLeftTreeModel(emptyProject).isNavigatorEmpty).toBe(true);
    expect(getLocationKey('location-a')).toBe('location:location-a');
    expect(getLocationFolderKey('location-a', 'terminal-blocks')).toBe('location:location-a:terminal-blocks');
    expect(getDeviceTreeTitle(device({ rackSizeRu: 1 }))).toBe('Drag to a visible rack to assign or move');
    expect(getDeviceTreeTitle(device({ rackSizeRu: null }))).toBe('Set rack size before assigning to a rack');
    expect(getDeviceTreeMeta(device({ labelPrefix: 'CAM', role: 'Camera' }))).toBe('CAM');
    expect(getDeviceTreeMeta(device({ labelPrefix: '', role: 'Camera' }))).toBe('Camera');
    expect(getDeviceTreeMeta(device({ labelPrefix: '', role: '', kind: 'terminal_block' }))).toBe('TB');
  });

  it('toggles collapsed keys immutably and tolerates keys for removed objects', () => {
    const first = new Set<string>();
    const second = toggleCollapsedKey(first, 'location:missing');
    const third = toggleCollapsedKey(second, 'location:missing');

    expect(first.size).toBe(0);
    expect(second.has('location:missing')).toBe(true);
    expect(third.has('location:missing')).toBe(false);
    expect(isTreeKeyOpen(second, 'location:missing')).toBe(false);
    expect(isTreeKeyOpen(second, 'location:other')).toBe(true);
  });
});
