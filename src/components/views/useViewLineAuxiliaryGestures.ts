import { useRef, useState, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewLine, ViewLineEndpoint } from '../../domain/types';
import { projectViewLineLabelToRoute } from '../../domain/viewLineLabelGeometry';
import { isValidViewLineReconnectTarget, type ViewLineEndpointRole } from '../../domain/viewLineReconnection';
import { getRenderedLinePoints } from '../../domain/viewRouting';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import type { ViewCanvasSelection } from './viewEditorTypes';
import {
  captureViewPointer,
  cleanupViewPointerCapture,
  releaseViewPointer,
  type ViewPointerCapture,
} from './viewPointerCapture';
import { VIEW_PIXELS_PER_MM } from './viewViewport';

interface LabelGesture {
  viewId: string;
  pointerId: number;
  captureTarget: SVGElement;
  line: ViewLine;
}

export interface EndpointReconnectGesture {
  viewId: string;
  pointerId: number;
  captureTarget: HTMLElement;
  line: ViewLine;
  role: ViewLineEndpointRole;
  candidate: ViewLineEndpoint | null;
}

interface ViewLineAuxiliaryGestureOptions {
  project: ProjectRoot;
  view: ProjectView;
  zoom: number;
  selectCanvas: (selection: ViewCanvasSelection | null) => void;
  updateViewLine: ProjectContextValue['updateViewLine'];
}

export function useViewLineAuxiliaryGestures(options: ViewLineAuxiliaryGestureOptions) {
  const { project, view, zoom, selectCanvas, updateViewLine } = options;
  const [linePreview, setLinePreview] = useState<ViewLine | null>(null);
  const [labelGesture, setLabelGesture] = useState<LabelGesture | null>(null);
  const [endpointReconnect, setEndpointReconnect] = useState<EndpointReconnectGesture | null>(null);
  const captureRef = useRef<ViewPointerCapture | null>(null);

  function beginLabelGesture(event: PointerEvent<SVGElement>, line: ViewLine) {
    event.preventDefault();
    event.stopPropagation();
    captureViewPointer(event.currentTarget, event.pointerId, captureRef);
    selectCanvas({ kind: 'line', id: line.id });
    setLabelGesture({
      viewId: view.id,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      line,
    });
    setLinePreview(null);
  }

  function beginEndpointReconnect(
    event: PointerEvent<HTMLElement>,
    line: ViewLine,
    role: ViewLineEndpointRole,
  ) {
    event.preventDefault();
    event.stopPropagation();
    captureViewPointer(event.currentTarget, event.pointerId, captureRef);
    selectCanvas({ kind: 'line', id: line.id });
    setEndpointReconnect({
      viewId: view.id,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      line,
      role,
      candidate: null,
    });
    setLinePreview(line);
  }

  function updatePointer(event: PointerEvent<HTMLElement>): boolean {
    if (endpointReconnect && endpointReconnect.pointerId === event.pointerId) {
      const candidate = readViewLineEndpointAt(event.clientX, event.clientY);
      const valid =
        candidate &&
        isValidViewLineReconnectTarget(
          project,
          view,
          endpointReconnect.line,
          endpointReconnect.role,
          candidate,
        )
          ? candidate
          : null;
      setEndpointReconnect({ ...endpointReconnect, candidate: valid });
      setLinePreview(
        valid ? { ...endpointReconnect.line, [endpointReconnect.role]: valid } : endpointReconnect.line,
      );
      return true;
    }
    if (labelGesture && labelGesture.pointerId === event.pointerId) {
      const point = {
        xMm: (event.clientX - event.currentTarget.getBoundingClientRect().left) / zoom / VIEW_PIXELS_PER_MM,
        yMm: (event.clientY - event.currentTarget.getBoundingClientRect().top) / zoom / VIEW_PIXELS_PER_MM,
      };
      const projected = projectViewLineLabelToRoute(
        getRenderedLinePoints(project, view, labelGesture.line),
        point,
      );
      if (projected) {
        setLinePreview(
          projected.labelPosition === labelGesture.line.labelPosition
            ? null
            : { ...labelGesture.line, labelPosition: projected.labelPosition },
        );
      }
      return true;
    }
    return false;
  }

  function finishPointer(event: PointerEvent<HTMLElement>): boolean {
    if (endpointReconnect && endpointReconnect.pointerId === event.pointerId) {
      releaseViewPointer(endpointReconnect.captureTarget, endpointReconnect.pointerId, captureRef);
      const dropped = readViewLineEndpointAt(event.clientX, event.clientY);
      const candidate =
        dropped &&
        isValidViewLineReconnectTarget(project, view, endpointReconnect.line, endpointReconnect.role, dropped)
          ? dropped
          : null;
      if (endpointReconnect.viewId === view.id && candidate) {
        updateViewLine(view.id, endpointReconnect.line.id, { [endpointReconnect.role]: candidate });
      }
      setEndpointReconnect(null);
      setLinePreview(null);
      return true;
    }
    if (labelGesture && labelGesture.pointerId === event.pointerId) {
      releaseViewPointer(labelGesture.captureTarget, labelGesture.pointerId, captureRef);
      if (labelGesture.viewId === view.id && linePreview) {
        updateViewLine(view.id, linePreview.id, { labelPosition: linePreview.labelPosition });
      }
      setLabelGesture(null);
      setLinePreview(null);
      return true;
    }
    return false;
  }

  function cancel(): boolean {
    for (const gesture of [labelGesture, endpointReconnect]) {
      if (gesture) releaseViewPointer(gesture.captureTarget, gesture.pointerId, captureRef);
    }
    const active = Boolean(labelGesture || endpointReconnect || linePreview);
    setLabelGesture(null);
    setEndpointReconnect(null);
    setLinePreview(null);
    return active;
  }

  return {
    linePreview,
    endpointReconnect,
    beginLabelGesture,
    beginEndpointReconnect,
    updatePointer,
    finishPointer,
    cancel,
    cleanupCapture: () => cleanupViewPointerCapture(captureRef),
  };
}

function readViewLineEndpointAt(clientX: number, clientY: number): ViewLineEndpoint | null {
  const element = document
    .elementFromPoint(clientX, clientY)
    ?.closest<HTMLElement>('[data-view-line-endpoint-kind]');
  if (!element) return null;
  const kind = element.dataset.viewLineEndpointKind;
  const placementId = element.dataset.viewLineEndpointPlacementId;
  const endpointId = element.dataset.viewLineEndpointId;
  if (!placementId || !endpointId) return null;
  return kind === 'port'
    ? { kind, placementId, portId: endpointId }
    : kind === 'port_range'
      ? { kind, placementId, annotationId: endpointId }
      : null;
}
