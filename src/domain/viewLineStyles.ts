import type { ViewLineColor, ViewLineWidth } from './types';

export const VIEW_LINE_COLOR_MAP: Record<ViewLineColor, string> = {
  black: '#172B31',
  red: '#D83A34',
  blue: '#3465EB',
  green: '#0A8F5B',
  orange: '#C87019',
  purple: '#7A3CE0',
  gray: '#66757B',
  teal: '#087F7C',
};

export const VIEW_LINE_WIDTH_MAP: Record<ViewLineWidth, number> = {
  hairline: 1,
  thin: 2,
  medium: 3,
  wide: 5,
};

export const DEFAULT_VIEW_LINE_STYLE = {
  color: 'black',
  width: 'thin',
  labelOrientation: 'horizontal',
  labelPosition: 0.5,
} as const;
