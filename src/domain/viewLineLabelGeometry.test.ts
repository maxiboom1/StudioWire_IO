import { describe, expect, it } from 'vitest';
import {
  getOrthogonalPolylineLength,
  getViewLineLabelPoint,
  projectViewLineLabelToRoute,
} from './viewLineLabelGeometry';

const route = [
  { xMm: 0, yMm: 0 },
  { xMm: 10, yMm: 0 },
  { xMm: 10, yMm: 30 },
  { xMm: 30, yMm: 30 },
];

describe('View line label geometry', () => {
  it('uses Manhattan arc length for normalized label placement', () => {
    expect(getOrthogonalPolylineLength(route)).toBe(60);
    expect(getViewLineLabelPoint(route, 0.5)).toEqual({ xMm: 10, yMm: 20 });
    expect(getViewLineLabelPoint(route, 0.75)).toEqual({ xMm: 15, yMm: 30 });
  });

  it('projects to the closest route segment and reports normalized total distance', () => {
    const projected = projectViewLineLabelToRoute(route, { xMm: 14, yMm: 18 })!;
    expect(projected.point).toEqual({ xMm: 10, yMm: 18 });
    expect(projected.labelPosition).toBeCloseTo(28 / 60);
  });

  it('handles degenerate routes without NaN', () => {
    expect(getViewLineLabelPoint([{ xMm: 2, yMm: 3 }], 0.5)).toEqual({ xMm: 2, yMm: 3 });
    expect(
      projectViewLineLabelToRoute(
        [
          { xMm: 2, yMm: 3 },
          { xMm: 2, yMm: 3 },
        ],
        { xMm: 9, yMm: 9 },
      )?.labelPosition,
    ).toBe(0);
  });
});
