import { describe, expect, it } from 'vitest';
import { beginEndpointDrag, endEndpointDrag, idleDragState, updateEndpointDragPointer } from './canvasDrag';
import type { Endpoint } from './types';

const endpoint: Endpoint = {
  type: 'device_port',
  id: 'port-1',
  label: 'RTR1-OUT-001',
};

describe('canvas endpoint drag state helpers', () => {
  it('starts a drag with anchor endpoint metadata', () => {
    const state = beginEndpointDrag(
      {
        endpoint,
        cableId: 'cable-v-0001',
        side: 'destination',
        label: 'V-0001 from RTR1-OUT-001',
      },
      { x: 12, y: 34 },
    );

    expect(state).toMatchObject({
      active: true,
      anchorCableId: 'cable-v-0001',
      anchorSide: 'destination',
      pointerPosition: { x: 12, y: 34 },
    });
    expect(state.anchorEndpointMeta?.endpoint).toEqual(endpoint);
  });

  it('updates the pointer only while active', () => {
    const active = beginEndpointDrag({ endpoint, label: 'New cable from RTR1-OUT-001' }, { x: 1, y: 2 });

    expect(updateEndpointDragPointer(active, { x: 10, y: 20 }).pointerPosition).toEqual({ x: 10, y: 20 });
    expect(updateEndpointDragPointer(idleDragState, { x: 10, y: 20 })).toBe(idleDragState);
  });

  it('ends a drag back to the idle state', () => {
    expect(endEndpointDrag()).toEqual(idleDragState);
  });
});
