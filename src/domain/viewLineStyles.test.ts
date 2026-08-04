import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW_LINE_STYLE, VIEW_LINE_COLOR_MAP, VIEW_LINE_WIDTH_MAP } from './viewLineStyles';

describe('View line style presets', () => {
  it('exposes the fixed technical palette, widths, and creation defaults', () => {
    expect(VIEW_LINE_COLOR_MAP).toEqual({
      black: '#172B31',
      red: '#D83A34',
      blue: '#3465EB',
      green: '#0A8F5B',
      orange: '#C87019',
      purple: '#7A3CE0',
      gray: '#66757B',
      teal: '#087F7C',
    });
    expect(VIEW_LINE_WIDTH_MAP).toEqual({ hairline: 1, thin: 2, medium: 3, wide: 5 });
    expect(DEFAULT_VIEW_LINE_STYLE).toEqual({
      color: 'black',
      width: 'thin',
      labelOrientation: 'horizontal',
      labelPosition: 0.5,
    });
  });
});
