import { describe, expect, it } from 'vitest';
import { formatPortLabel } from './portLabels';

describe('formatPortLabel', () => {
  it('formats device, canonical I/O name, and padded index tokens together', () => {
    expect(formatPortLabel('{DEVICE}-{I/O NAME}-{00}-{000}', 'RTR1', 7, 'SDI OUT')).toBe(
      'RTR1-SDI OUT-07-007',
    );
  });

  it('keeps NAME as an alias for existing interface patterns', () => {
    expect(formatPortLabel('{NAME}-{000}', 'RTR1', 7, 'SDI OUT')).toBe('SDI OUT-007');
  });

  it('keeps device-only patterns working when no interface name is supplied', () => {
    expect(formatPortLabel('{DEVICE}-{000}', 'MV1', 12)).toBe('MV1-012');
  });

  it('does not fall back to the device prefix for an omitted interface name', () => {
    expect(formatPortLabel('{I/O NAME}-{000}', 'MV1', 12)).toBe('-012');
  });

  it('supports unpadded row numbering with the {0} token', () => {
    expect(formatPortLabel('{0}', 'RTR1', 7, 'SDI OUT')).toBe('7');
    expect(formatPortLabel('{0}', 'RTR1', 1234, 'SDI OUT')).toBe('1234');
  });
});
