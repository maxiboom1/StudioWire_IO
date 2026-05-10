import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  checkEndpointCompatibility,
  classifyEndpointOccupancy,
  getCompatibleTargetEndpointCandidatesForObject,
  type CrosspointObjectTarget,
} from '../domain/crosspointing';
import {
  beginEndpointDrag,
  endEndpointDrag,
  idleDragState,
  updateEndpointDragPointer,
  type DragState,
  type EndpointMeta,
} from '../domain/canvasDrag';
import type { Endpoint } from '../domain/types';
import { useProject } from './ProjectContext';

export type EndpointDropState = 'idle' | 'compatible' | 'incompatible' | 'self';
export type ObjectDropState = 'idle' | 'compatible' | 'incompatible';

export interface CanvasObjectTarget extends CrosspointObjectTarget {
  label: string;
}

export interface ObjectDropPickerState {
  anchor: EndpointMeta;
  target: CanvasObjectTarget;
}

interface CanvasInteractionContextValue {
  dragState: DragState;
  dragMessage: string | null;
  objectDropPicker: ObjectDropPickerState | null;
  startEndpointDrag: (meta: EndpointMeta, pointerPosition: { x: number; y: number }) => void;
  updateEndpointDrag: (pointerPosition: { x: number; y: number }) => void;
  finishEndpointDrag: (pointerPosition: { x: number; y: number }) => void;
  cancelEndpointDrag: () => void;
  clearObjectDropPicker: () => void;
  getEndpointDropState: (endpoint: Endpoint) => EndpointDropState;
  getObjectDropState: (target: CanvasObjectTarget) => ObjectDropState;
}

const CanvasInteractionContext = createContext<CanvasInteractionContextValue | null>(null);

export function CanvasInteractionProvider({ children }: { children: ReactNode }) {
  const { project, connectCableEndpoint } = useProject();
  const [dragState, setDragState] = useState<DragState>(idleDragState);
  const [dragMessage, setDragMessage] = useState<string | null>(null);
  const [objectDropPicker, setObjectDropPicker] = useState<ObjectDropPickerState | null>(null);

  const startEndpointDrag = useCallback((meta: EndpointMeta, pointerPosition: { x: number; y: number }) => {
    setDragMessage(null);
    setObjectDropPicker(null);
    setDragState(beginEndpointDrag(meta, pointerPosition));
  }, []);

  const updateEndpointDrag = useCallback((pointerPosition: { x: number; y: number }) => {
    setDragState((current) => updateEndpointDragPointer(current, pointerPosition));
  }, []);

  const cancelEndpointDrag = useCallback(() => {
    setDragState(endEndpointDrag());
  }, []);

  const clearObjectDropPicker = useCallback(() => {
    setObjectDropPicker(null);
  }, []);

  const getEndpointDropState = useCallback(
    (endpoint: Endpoint): EndpointDropState => {
      const anchor = dragState.anchorEndpointMeta?.endpoint;

      if (!dragState.active || !anchor) {
        return 'idle';
      }

      if (endpointKey(anchor) === endpointKey(endpoint)) {
        return 'self';
      }

      const compatibility = checkEndpointCompatibility(project, anchor, endpoint);

      if (!compatibility.ok || classifyEndpointOccupancy(project, endpoint) === 'active_connected') {
        return 'incompatible';
      }

      return 'compatible';
    },
    [dragState, project],
  );

  const getObjectDropState = useCallback(
    (target: CanvasObjectTarget): ObjectDropState => {
      const anchor = dragState.anchorEndpointMeta?.endpoint;

      if (!dragState.active || !anchor) {
        return 'idle';
      }

      const candidates = getCompatibleTargetEndpointCandidatesForObject(project, anchor, target);

      return candidates.length > 0 ? 'compatible' : 'incompatible';
    },
    [dragState, project],
  );

  const finishEndpointDrag = useCallback(
    (pointerPosition: { x: number; y: number }) => {
      const anchor = dragState.anchorEndpointMeta;

      setDragState(endEndpointDrag());

      if (!dragState.active || !anchor) {
        return;
      }

      const targetElement = document.elementFromPoint(pointerPosition.x, pointerPosition.y);
      const targetEndpoint = readEndpointFromElement(targetElement);

      if (targetEndpoint) {
        connectCableEndpoint({
          anchorEndpoint: anchor.endpoint,
          anchorCableId: dragState.anchorCableId ?? undefined,
          anchorSide: dragState.anchorSide ?? undefined,
          targetEndpoint,
        });
        return;
      }

      const targetObject = readObjectTargetFromElement(targetElement);

      if (targetObject) {
        const candidates = getCompatibleTargetEndpointCandidatesForObject(project, anchor.endpoint, targetObject);

        if (candidates.length > 0) {
          setObjectDropPicker({ anchor, target: targetObject });
          setDragMessage(`Choose a target endpoint on ${targetObject.label}.`);
        } else {
          setDragMessage(`No compatible available endpoints on ${targetObject.label}.`);
        }
        return;
      }

      setDragMessage('Drop on a compatible endpoint or object to connect.');
    },
    [connectCableEndpoint, dragState, project],
  );

  const value = useMemo<CanvasInteractionContextValue>(
    () => ({
      dragState,
      dragMessage,
      objectDropPicker,
      startEndpointDrag,
      updateEndpointDrag,
      finishEndpointDrag,
      cancelEndpointDrag,
      clearObjectDropPicker,
      getEndpointDropState,
      getObjectDropState,
    }),
    [
      dragState,
      dragMessage,
      objectDropPicker,
      startEndpointDrag,
      updateEndpointDrag,
      finishEndpointDrag,
      cancelEndpointDrag,
      clearObjectDropPicker,
      getEndpointDropState,
      getObjectDropState,
    ],
  );

  return <CanvasInteractionContext.Provider value={value}>{children}</CanvasInteractionContext.Provider>;
}

export function useCanvasInteraction() {
  const context = useContext(CanvasInteractionContext);

  if (!context) {
    throw new Error('useCanvasInteraction must be used inside CanvasInteractionProvider');
  }

  return context;
}

export function CanvasInteractionOverlay() {
  const { dragMessage, dragState } = useCanvasInteraction();

  if (!dragState.active && !dragMessage) {
    return null;
  }

  return (
    <div
      className="canvas-drag-overlay"
      style={
        dragState.pointerPosition
          ? {
              left: dragState.pointerPosition.x,
              top: dragState.pointerPosition.y,
            }
          : undefined
      }
    >
      {dragState.active ? dragState.anchorEndpointMeta?.label ?? 'Endpoint drag' : dragMessage}
    </div>
  );
}

function readEndpointFromElement(element: Element | null): Endpoint | null {
  const target =
    element instanceof HTMLElement
      ? element.closest<HTMLElement>('[data-crosspoint-endpoint-type][data-crosspoint-endpoint-id]')
      : null;

  if (!target) {
    return null;
  }

  const type = target.dataset.crosspointEndpointType as Endpoint['type'] | undefined;
  const id = target.dataset.crosspointEndpointId;
  const label = target.dataset.crosspointEndpointLabel ?? '';

  if (!type || !id || type === 'unknown') {
    return null;
  }

  return {
    type,
    id,
    label,
  };
}

function readObjectTargetFromElement(element: Element | null): CanvasObjectTarget | null {
  const target =
    element instanceof HTMLElement
      ? element.closest<HTMLElement>('[data-crosspoint-object-type][data-crosspoint-object-id]')
      : null;

  if (!target) {
    return null;
  }

  const objectType = target.dataset.crosspointObjectType;
  const objectId = target.dataset.crosspointObjectId;
  const label = target.dataset.crosspointObjectLabel ?? 'target object';

  if ((objectType !== 'device' && objectType !== 'terminalBlock') || !objectId) {
    return null;
  }

  return {
    objectType,
    objectId,
    label,
  };
}

function endpointKey(endpoint: Endpoint): string {
  return `${endpoint.type}:${endpoint.id ?? ''}`;
}
