import { describe, expect, it } from 'vitest';
import { formatPortLabel } from './portLabels';

describe('formatPortLabel', () => {
  it('formats device, interface name, and padded index tokens together', () => {
    expect(formatPortLabel('{DEVICE}-{NAME}-{00}-{000}', 'RTR1', 7, 'SDI OUT')).toBe('RTR1-SDI OUT-07-007');
  });

  it('keeps device-only patterns working when no interface name is supplied', () => {
    expect(formatPortLabel('{DEVICE}-{000}', 'MV1', 12)).toBe('MV1-012');
  });
});
