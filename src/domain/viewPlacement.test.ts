import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { ProjectView, ViewPlacement } from './types';
import {
  buildViewSourceGroups,
  clampPlacementPosition,
  findExistingPlacement,
  findFirstPlacementPosition,
  pointToViewPosition,
} from './viewPlacement';

function view(placements: ViewPlacement[] = []): ProjectView {
  return {
    id: 'view-test',
    name: 'Test View',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements,
    lines: [],
    annotations: [],
  };
}

describe('View placement helpers', () => {
  it('groups and searches live sources with duplicate status', () => {
    const project = structuredClone(sampleProject);
    project.subLocations.push({
      id: 'folder-core',
      locationId: 'location-machine-room',
      name: 'Core racks',
      description: '',
    });
    project.racks[0].subLocationId = 'folder-core';
    const currentView = view([
      {
        id: 'placement-router',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 10,
        yMm: 10,
        scale: 1,
        labelOverride: null,
      },
    ]);

    const modelGroups = buildViewSourceGroups(project, currentView, 'xr-16');
    expect(modelGroups).toHaveLength(1);
    expect(modelGroups[0].items[0]).toMatchObject({
      sourceId: 'device-router-1',
      alreadyPlaced: true,
      name: 'Router 1',
    });

    const rackGroups = buildViewSourceGroups(project, currentView, 'core racks');
    expect(rackGroups[0]).toMatchObject({
      locationName: 'Machine Room',
      folderName: 'Core racks',
    });
    expect(rackGroups[0].items[0].sourceType).toBe('rack');
  });

  it('uses deterministic first-fit scanning and an overlap cascade fallback', () => {
    const project = structuredClone(sampleProject);
    const first = findFirstPlacementPosition(project, view(), 'device', 'device-router-1');
    expect(first).toEqual({ xMm: 10, yMm: 10, overlaps: false });

    const occupied = view([
      {
        id: 'placement-first',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 10,
        yMm: 10,
        scale: 1,
        labelOverride: null,
      },
    ]);
    expect(findFirstPlacementPosition(project, occupied, 'device', 'device-multiviewer-1')).toEqual({
      xMm: 105,
      yMm: 10,
      overlaps: false,
    });

    const blocked = view([
      {
        id: 'placement-cover',
        sourceType: 'rack',
        sourceId: 'rack-mcr-a',
        xMm: 0,
        yMm: 0,
        scale: 3,
        labelOverride: null,
      },
    ]);
    blocked.pageSize = 'a4';
    expect(findFirstPlacementPosition(project, blocked, 'device', 'device-router-1')).toEqual({
      xMm: 12.5,
      yMm: 12.5,
      overlaps: true,
    });
  });

  it('converts zoomed pointers, snaps unless bypassed, clamps, and finds duplicates', () => {
    expect(pointToViewPosition(75, 45, { left: 15, top: 15 }, 2, 3, false)).toEqual({
      xMm: 10,
      yMm: 5,
    });
    expect(pointToViewPosition(76, 46, { left: 15, top: 15 }, 2, 3, true)).toEqual({
      xMm: 61 / 6,
      yMm: 31 / 6,
    });
    expect(
      clampPlacementPosition(
        { xMm: 195, yMm: -5 },
        { widthMm: 30, heightMm: 10 },
        { widthMm: 210, heightMm: 297 },
      ),
    ).toEqual({
      xMm: 180,
      yMm: 0,
    });

    const placement: ViewPlacement = {
      id: 'placement-router',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 0,
      yMm: 0,
      scale: 1,
      labelOverride: null,
    };
    expect(findExistingPlacement(view([placement]), 'device', 'device-router-1')).toBe(placement);
  });
});
