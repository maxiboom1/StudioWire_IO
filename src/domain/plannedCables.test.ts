import { describe, expect, it } from 'vitest';
import { createPlannedCableForPort } from './plannedCables';
import type { Port } from './types';

function makePort(direction: Port['direction']): Port {
  return {
    id: `port-${direction}`,
    deviceId: 'device-1',
    portGroupId: 'group-1',
    index: 1,
    name: `${direction} 1`,
    label: `${direction.toUpperCase()}-001`,
    direction,
    categoryId: 'category-video',
    connectorTypeId: 'connector-bnc',
    plannedCableId: null,
    notes: '',
  };
}

describe('createPlannedCableForPort', () => {
  it('labels output planned cables with the device port as source', () => {
    const cable = createPlannedCableForPort(makePort('output'), 'V', 1);

    expect(cable.sourceEndpoint).toMatchObject({ type: 'device_port', id: 'port-output' });
    expect(cable.destinationEndpoint).toMatchObject({ type: 'unknown', id: null });
    expect(cable.labelTop).toBe('OUTPUT-001');
    expect(cable.labelMiddle).toBe('V-0001');
    expect(cable.labelBottom).toBe('');
  });

  it('labels input planned cables with the device port as destination', () => {
    const cable = createPlannedCableForPort(makePort('input'), 'V', 2);

    expect(cable.sourceEndpoint).toMatchObject({ type: 'unknown', id: null });
    expect(cable.destinationEndpoint).toMatchObject({ type: 'device_port', id: 'port-input' });
    expect(cable.labelTop).toBe('');
    expect(cable.labelMiddle).toBe('V-0002');
    expect(cable.labelBottom).toBe('INPUT-001');
  });
});
