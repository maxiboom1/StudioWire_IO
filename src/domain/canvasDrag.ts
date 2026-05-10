import type { CableEndpointSide } from './crosspointing';
import type { Endpoint } from './types';

export interface EndpointMeta {
  endpoint: Endpoint;
  cableId?: string;
  side?: CableEndpointSide;
  label: string;
}

export interface DragState {
  active: boolean;
  anchorCableId: string | null;
  anchorSide: CableEndpointSide | null;
  anchorEndpointMeta: EndpointMeta | null;
  pointerPosition: { x: number; y: number } | null;
}

export const idleDragState: DragState = {
  active: false,
  anchorCableId: null,
  anchorSide: null,
  anchorEndpointMeta: null,
  pointerPosition: null,
};

export function beginEndpointDrag(meta: EndpointMeta, pointerPosition: { x: number; y: number }): DragState {
  return {
    active: true,
    anchorCableId: meta.cableId ?? null,
    anchorSide: meta.side ?? null,
    anchorEndpointMeta: meta,
    pointerPosition,
  };
}

export function updateEndpointDragPointer(
  state: DragState,
  pointerPosition: { x: number; y: number },
): DragState {
  if (!state.active) {
    return state;
  }

  return {
    ...state,
    pointerPosition,
  };
}

export function endEndpointDrag(): DragState {
  return idleDragState;
}
