import { describe, expect, it } from 'vitest';
import type { ViewLineWaypoint } from './types';
import {
  getViewFlexPathGroups,
  getViewFlexPathValidationError,
  moveViewFlexPathWaypoint,
  removeViewFlexPath,
} from './viewFlexPaths';

function horizontalFlex(id = 'flex-a'): ViewLineWaypoint[] {
  return [
    { xMm: 10, yMm: 20, flexPathId: id },
    { xMm: 10, yMm: 30, flexPathId: id },
    { xMm: 20, yMm: 30, flexPathId: id },
    { xMm: 20, yMm: 20, flexPathId: id },
  ];
}

describe('View Flex path domain rules', () => {
  it('resolves four consecutive U-shaped points and supports multiple independent groups', () => {
    const waypoints = [
      ...horizontalFlex(),
      { xMm: 25, yMm: 20, flexPathId: null },
      ...horizontalFlex('flex-b').map((point) => ({ ...point, xMm: point.xMm + 30 })),
    ];
    expect(getViewFlexPathValidationError(waypoints)).toBeNull();
    expect(getViewFlexPathGroups(waypoints).map((group) => group.id)).toEqual(['flex-a', 'flex-b']);
  });

  it('rejects empty, incomplete, non-consecutive, and collapsed groups', () => {
    expect(getViewFlexPathValidationError([{ xMm: 1, yMm: 1, flexPathId: ' ' }])).toMatch(/text/);
    expect(getViewFlexPathValidationError(horizontalFlex().slice(0, 3))).toMatch(/four consecutive/);
    expect(
      getViewFlexPathValidationError([
        ...horizontalFlex().slice(0, 2),
        { xMm: 15, yMm: 15, flexPathId: null },
        ...horizontalFlex().slice(2),
      ]),
    ).toMatch(/four consecutive/);
    expect(
      getViewFlexPathValidationError(
        horizontalFlex().map((point, index) => (index < 2 ? { ...point, yMm: 20 } : point)),
      ),
    ).toMatch(/U-shaped/);
  });

  it('reshapes grouped corners without breaking the U and removes the group atomically', () => {
    const waypoints = horizontalFlex();
    const moved = moveViewFlexPathWaypoint(waypoints, 1, 8, 35)!;
    expect(moved[0]).toMatchObject({ xMm: 8, yMm: 20 });
    expect(moved[1]).toMatchObject({ xMm: 8, yMm: 35 });
    expect(moved[2].yMm).toBe(35);
    expect(getViewFlexPathValidationError(moved)).toBeNull();
    expect(removeViewFlexPath(moved, 'flex-a')).toEqual([]);
  });
});
