import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { Device, ProjectRoot, Rack } from '../../domain/types';
import { buildRackDropPreview, getTargetBottomRuFromPointer } from './rackDropTarget';

function projectFixture(): ProjectRoot {
  const project = structuredClone(sampleProject);

  project.racks = [
    project.racks[0],
    {
      id: 'rack-second',
      locationId: 'location-machine-room',
      name: 'MCR Rack B',
      heightRu: 10,
      numberingDirection: 'top_to_bottom',
    },
  ];
  project.devices = [
    {
      ...project.devices[0],
      rackSizeRu: 2,
      rackBottomRu: null,
      rackId: null,
      mountType: 'rack',
    } as Device,
    {
      ...project.devices[1],
      id: 'device-blocker',
      name: 'Blocker',
      locationId: 'location-machine-room',
      rackId: 'rack-second',
      rackSizeRu: 2,
      rackBottomRu: 4,
      mountType: 'rack',
    } as Device,
  ];

  return project;
}

describe('rackDropTarget', () => {
  it('translates pointer position into target bottom RU with clamped boundaries', () => {
    expect(getTargetBottomRuFromPointer({ top: 100, height: 40 }, 100, [4, 3, 2, 1])).toBe(4);
    expect(getTargetBottomRuFromPointer({ top: 100, height: 40 }, 139, [4, 3, 2, 1])).toBe(1);
    expect(getTargetBottomRuFromPointer({ top: 100, height: 40 }, 99, [4, 3, 2, 1])).toBe(4);
    expect(getTargetBottomRuFromPointer({ top: 100, height: 40 }, 200, [4, 3, 2, 1])).toBe(1);
    expect(getTargetBottomRuFromPointer({ top: 100, height: 0 }, 120, [4, 3, 2, 1])).toBeNull();
    expect(getTargetBottomRuFromPointer({ top: 100, height: 40 }, 120, [])).toBeNull();
  });

  it('builds valid and invalid drop previews through canonical rack placement validation', () => {
    const project = projectFixture();
    const targetRack = project.racks.find((rack): rack is Rack => rack.id === 'rack-second')!;

    expect(buildRackDropPreview(project, targetRack, 'device-router-1', 1)).toEqual({
      deviceId: 'device-router-1',
      rackId: 'rack-second',
      bottomRu: 1,
      topRu: 2,
      ok: true,
      message: 'Move to MCR Rack B RU 1-2',
    });
    expect(buildRackDropPreview(project, targetRack, 'device-router-1', 4)).toEqual({
      deviceId: 'device-router-1',
      rackId: 'rack-second',
      bottomRu: 4,
      topRu: 4,
      ok: false,
      message: 'Target RU range overlaps Blocker.',
    });
    expect(buildRackDropPreview(project, targetRack, 'missing-device', 1)).toMatchObject({
      ok: false,
      message: 'Device no longer exists.',
    });
  });
});
