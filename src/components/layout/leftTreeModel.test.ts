import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { Device, ProjectRoot } from '../../domain/types';
import {
  buildLeftTreeModel,
  getDeviceTreeMeta,
  getDeviceTreeTitle,
  getLocationKey,
  getSubLocationKey,
} from './leftTreeModel';
import { isTreeKeyOpen, toggleCollapsedKey } from './useCollapsedTree';

function projectFixture(): ProjectRoot {
  const project = structuredClone(sampleProject);

  project.subLocations = [
    {
      id: 'sub-location-front-table',
      locationId: 'location-machine-room',
      name: 'Front Table',
      description: '',
    },
  ];

  project.devices = [
    ...project.devices,
    device({ id: 'device-tb', name: 'TB 1', kind: 'terminal_block', locationId: 'location-machine-room' }),
    device({
      id: 'device-virtual',
      name: 'Virtual Device',
      locationId: 'location-machine-room',
      rackSizeRu: null,
    }),
    device({
      id: 'device-front-table',
      name: 'Front Table Device',
      locationId: 'location-machine-room',
      subLocationId: 'sub-location-front-table',
    }),
    device({ id: 'device-unknown-location', name: 'Unknown Location Device', locationId: 'missing' }),
  ];
  project.racks = project.racks.map((rack) => ({ ...rack, subLocationId: 'sub-location-front-table' }));

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
  it('builds location branches in project order with flat folder/item grouping', () => {
    const model = buildLeftTreeModel(projectFixture());

    expect(model.locations.map((branch) => branch.location.name)).toEqual(['Control Room', 'Machine Room']);
    expect(model.locations[0]).toMatchObject({
      key: 'location:location-control-room',
      count: 1,
    });
    expect(model.locations[0].items.map((item) => item.label)).toEqual(['Multiviewer 1']);
    expect(model.locations[1].subLocations[0]).toMatchObject({
      key: 'location:location-machine-room:folder:sub-location-front-table',
      count: 2,
    });
    expect(model.locations[1].subLocations[0].items.map((item) => item.label)).toEqual([
      'MCR Rack A',
      'Front Table Device',
    ]);
    expect(model.locations[1].items.map((item) => item.label)).toEqual([
      'Router 1',
      'TB 1',
      'Virtual Device',
    ]);
  });

  it('builds a flat View section in project array order with page metadata', () => {
    const project = projectFixture();
    project.views = [
      {
        id: 'view-first',
        name: 'Signal Overview',
        description: '',
        pageSize: 'a3',
        orientation: 'portrait',
        placements: [],
        lines: [],
        annotations: [],
      },
      {
        id: 'view-second',
        name: 'Rack Detail',
        description: '',
        pageSize: 'a4',
        orientation: 'landscape',
        placements: [],
        lines: [],
        annotations: [],
      },
    ];

    expect(buildLeftTreeModel(project).views.map(({ label, meta }) => ({ label, meta }))).toEqual([
      { label: 'Signal Overview', meta: 'A3 · Portrait' },
      { label: 'Rack Detail', meta: 'A4 · Landscape' },
    ]);
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
    expect(getSubLocationKey('location-a', 'sub-location-a')).toBe(
      'location:location-a:folder:sub-location-a',
    );
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
