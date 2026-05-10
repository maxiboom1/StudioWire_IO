import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { EndpointMeta } from '../../../domain/canvasDrag';
import { useCanvasInteraction } from '../../../state/CanvasInteractionContext';
import { cn } from '../../../lib/utils';

export function EndpointHandle({
  endpointMeta,
  side,
  warning = false,
}: {
  endpointMeta?: EndpointMeta;
  side: 'left' | 'right';
  warning?: boolean;
}) {
  const pointerIdRef = useRef<number | null>(null);
  const {
    cancelEndpointDrag,
    finishEndpointDrag,
    getEndpointDropState,
    startEndpointDrag,
    updateEndpointDrag,
  } = useCanvasInteraction();
  const dropState = endpointMeta ? getEndpointDropState(endpointMeta.endpoint) : 'idle';

  function handlePointerDown(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!endpointMeta || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    startEndpointDrag(endpointMeta, { x: event.clientX, y: event.clientY });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLSpanElement>) {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    updateEndpointDrag({ x: event.clientX, y: event.clientY });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLSpanElement>) {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    pointerIdRef.current = null;
    finishEndpointDrag({ x: event.clientX, y: event.clientY });
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLSpanElement>) {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    pointerIdRef.current = null;
    cancelEndpointDrag();
  }

  return (
    <span
      className={cn(
        'device-endpoint-handle',
        side === 'left' ? 'device-endpoint-handle-left' : 'device-endpoint-handle-right',
        warning ? 'device-endpoint-handle-warning' : null,
        endpointMeta ? 'device-endpoint-handle-draggable' : null,
        dropState !== 'idle' ? `device-endpoint-handle-${dropState}` : null,
      )}
      data-canvas-draggable={endpointMeta ? 'true' : undefined}
      data-crosspoint-endpoint-id={endpointMeta?.endpoint.id ?? undefined}
      data-crosspoint-endpoint-label={endpointMeta?.endpoint.label ?? undefined}
      data-crosspoint-endpoint-type={endpointMeta?.endpoint.type ?? undefined}
      aria-hidden="true"
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
