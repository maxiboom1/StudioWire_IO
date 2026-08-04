import { describe, expect, it } from 'vitest';
import type { ProjectView } from './types';
import {
  clampViewLayoutPosition,
  getViewDeviceScaleState,
  getViewLayoutMetrics,
  moveViewLayoutPosition,
  remapViewLayoutPosition,
  snapViewLayoutPosition,
} from './viewLayoutGrid';

function view(scales: number[]): ProjectView {
  return {
    id: 'view-main',
    name: 'Main',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: scales.map((scale, index) => ({
      id: `placement-${index}`,
      sourceType: 'device',
      sourceId: `device-${index}`,
      xMm: 10,
      yMm: 10,
      scale,
      labelOverride: null,
    })),
    lines: [],
    annotations: [],
  };
}

describe('View alignment grid', () => {
  it('uses the scaled source I/O pitch at the same resolution on both axes', () => {
    expect(getViewLayoutMetrics(1)).toEqual({
      originMm: 10,
      columnPitchMm: 4.893617,
      rowPitchMm: 4.893617,
    });
    expect(getViewLayoutMetrics(0.7)).toEqual({
      originMm: 10,
      columnPitchMm: 3.425532,
      rowPitchMm: 3.425532,
    });
  });

  it('reports empty, uniform preset, and imported mixed device scales', () => {
    expect(getViewDeviceScaleState(view([]))).toEqual({ kind: 'empty', scale: 1 });
    expect(getViewDeviceScaleState(view([0.8, 0.8]))).toEqual({ kind: 'uniform', scale: 0.8 });
    expect(getViewDeviceScaleState(view([0.8, 1]))).toEqual({ kind: 'mixed', scale: null });
    expect(getViewDeviceScaleState(view([0.75]))).toEqual({ kind: 'mixed', scale: null });
  });

  it('snaps, clamps, and keyboard-moves through the same grid cells', () => {
    expect(snapViewLayoutPosition({ xMm: 107, yMm: 20.2 }, 1)).toEqual({
      xMm: 107.87234,
      yMm: 19.787234,
    });
    expect(
      clampViewLayoutPosition(
        { xMm: 999, yMm: 999 },
        { widthMm: 92, heightMm: 30 },
        { widthMm: 297, heightMm: 210 },
        1,
      ),
    ).toEqual({ xMm: 200.851063, yMm: 176.382978 });
    expect(moveViewLayoutPosition({ xMm: 10, yMm: 10 }, [1, 1], 0.8)).toEqual({
      xMm: 13.914894,
      yMm: 13.914894,
    });
  });

  it('preserves logical column and row when the View device size changes', () => {
    const atFullSize = moveViewLayoutPosition({ xMm: 10, yMm: 10 }, [1, 1], 1, 2);
    expect(remapViewLayoutPosition(atFullSize, 1, 0.7)).toEqual(
      moveViewLayoutPosition({ xMm: 10, yMm: 10 }, [1, 1], 0.7, 2),
    );
  });
});
