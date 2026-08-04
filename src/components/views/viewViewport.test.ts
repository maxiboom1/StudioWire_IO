import { describe, expect, it } from 'vitest';
import {
  clampViewZoom,
  getFitPageZoom,
  getFitWidthZoom,
  getViewPageDimensions,
  VIEW_MAX_ZOOM,
  VIEW_MIN_ZOOM,
} from './viewViewport';

describe('View viewport math', () => {
  it('uses exact ISO dimensions and swaps them for landscape', () => {
    expect(getViewPageDimensions('a4', 'portrait')).toEqual({ widthMm: 210, heightMm: 297 });
    expect(getViewPageDimensions('a4', 'landscape')).toEqual({ widthMm: 297, heightMm: 210 });
    expect(getViewPageDimensions('a3', 'portrait')).toEqual({ widthMm: 297, heightMm: 420 });
    expect(getViewPageDimensions('a3', 'landscape')).toEqual({ widthMm: 420, heightMm: 297 });
  });

  it('clamps zoom to the supported range', () => {
    expect(clampViewZoom(0)).toBe(VIEW_MIN_ZOOM);
    expect(clampViewZoom(1.25)).toBe(1.25);
    expect(clampViewZoom(10)).toBe(VIEW_MAX_ZOOM);
  });

  it('calculates padding-aware fit page and fit width zoom', () => {
    const page = getViewPageDimensions('a4', 'portrait');
    const viewport = { width: 694, height: 955 };

    expect(getFitWidthZoom(viewport, page)).toBe(1);
    expect(getFitPageZoom(viewport, page)).toBe(1);
    expect(getFitPageZoom({ width: 379, height: 509.5 }, page)).toBe(0.5);
  });
});
