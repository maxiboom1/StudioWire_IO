import { describe, expect, it } from 'vitest';
import type { ProjectView, ViewPlacement } from './types';
import { clampPlacementPosition, findExistingPlacement, pointToViewPosition } from './viewPlacement';

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
  it('converts zoomed pointers, snaps unless bypassed, clamps, and finds duplicates', () => {
    expect(pointToViewPosition(75, 45, { left: 15, top: 15 }, 2, 3, false)).toEqual({
      xMm: 10,
      yMm: 10,
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
