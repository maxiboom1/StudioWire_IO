import { describe, expect, it } from 'vitest';
import { createSequentialAddDeviceLocalIdFactory } from './addDeviceLocalIds';

describe('Add Device local ID factories', () => {
  it('creates deterministic local IDs per injected factory without sharing counters', () => {
    const first = createSequentialAddDeviceLocalIdFactory('local');
    const second = createSequentialAddDeviceLocalIdFactory('local');

    expect([first(), first(), second()]).toEqual(['local-1', 'local-2', 'local-1']);
  });
});
