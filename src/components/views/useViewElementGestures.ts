import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type {
  ProjectRoot,
  ProjectView,
  ViewAnnotation,
  ViewLine,
  ViewLineEndpoint,
  ViewPoint,
} from '../../domain/types';
import {
  insertLineWaypoint,
  insertLineWaypointWithIndex,
  makeLineRouteManual,
  moveLineWaypoint,
  removeLineWaypoint,
} from '../../domain/viewRouteEditing';
import { projectViewLineLabelToRoute } from '../../domain/viewLineLabelGeometry';
import { getRenderedLinePoints } from '../../domain/viewRouting';
import { snapViewLayoutPosition, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import { createViewMovableSelection } from '../../domain/viewSelection';
import { getViewPortRangeAttachedLineCount } from '../../domain/viewOperations';
import { isValidViewLineReconnectTarget, type ViewLineEndpointRole } from '../../domain/viewLineReconnection';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { useOptionalConfirmation } from '../common/ConfirmationDialog';
import { VIEW_PIXELS_PER_MM } from './viewViewport';
import type { ViewCanvasSelection } from './viewEditorTypes';

type FreeAnnotation = Exclude<ViewAnnotation, { kind: 'port_range' }>;

interface AnnotationGesture {
  viewId: string;
  pointerId: number;
  captureTarget: HTMLElement;
  startClientX: number;
  startClientY: number;
  annotation: FreeAnnotation;
}

interface WaypointGesture {
  viewId: string;
  pointerId: number;
  captureTarget: SVGElement;
  startClientX: number;
  startClientY: number;
  line: ViewLine;
  waypointIndex: number;
  origin: ViewPoint;
}

interface LabelGesture {
  viewId: string;
  pointerId: number;
  captureTarget: SVGElement;
  line: ViewLine;
}

interface EndpointReconnectGesture {
  viewId: string;
  pointerId: number;
  captureTarget: HTMLElement;
  line: ViewLine;
  role: ViewLineEndpointRole;
  candidate: ViewLineEndpoint | null;
}

interface ViewElementGestureOptions {
  project: ProjectRoot;
  view: ProjectView;
  zoom: number;
  layoutScale: ViewDeviceScale;
  canvasSelection: ViewCanvasSelection | null;
  selectCanvas: (selection: ViewCanvasSelection | null) => void;
  updateViewLine: ProjectContextValue['updateViewLine'];
  removeViewLine: ProjectContextValue['removeViewLine'];
  updateViewAnnotation: ProjectContextValue['updateViewAnnotation'];
  removeViewAnnotation: ProjectContextValue['removeViewAnnotation'];
}

export function useViewElementGestures(options: ViewElementGestureOptions) {
  const confirm = useOptionalConfirmation();
  const {
    project,
    view,
    zoom,
    layoutScale,
    canvasSelection,
    selectCanvas,
    updateViewLine,
    removeViewLine,
    updateViewAnnotation,
    removeViewAnnotation,
  } = options;
  const [annotationGesture, setAnnotationGesture] = useState<AnnotationGesture | null>(null);
  const [annotationPreview, setAnnotationPreview] = useState<FreeAnnotation | null>(null);
  const [waypointGesture, setWaypointGesture] = useState<WaypointGesture | null>(null);
  const [linePreview, setLinePreview] = useState<ViewLine | null>(null);
  const [labelGesture, setLabelGesture] = useState<LabelGesture | null>(null);
  const [endpointReconnect, setEndpointReconnect] = useState<EndpointReconnectGesture | null>(null);
  const captureRef = useRef<{ target: Element; pointerId: number } | null>(null);

  useEffect(() => {
    cancel();
  }, [view.id]);

  useEffect(
    () => () => {
      const capture = captureRef.current;
      if (capture) releasePointerCaptureSafely(capture.target, capture.pointerId);
    },
    [],
  );

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        (event.key !== 'Delete' && event.key !== 'Backspace') ||
        isEditingTarget(event.target) ||
        !(event.target instanceof Element && event.target.closest('.view-page'))
      )
        return;
      if (canvasSelection?.kind === 'line') {
        const line = view.lines.find((candidate) => candidate.id === canvasSelection.id);
        if (line && canvasSelection.bendIndex !== undefined) {
          updateViewLine(view.id, line.id, {
            waypoints: removeLineWaypoint(line, canvasSelection.bendIndex),
          });
        } else {
          removeViewLine(view.id, canvasSelection.id);
        }
      }
      if (canvasSelection?.kind === 'portRange') {
        void removePortRange(canvasSelection.id);
        return;
      }
      if (canvasSelection?.kind === 'line') selectCanvas(null);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [canvasSelection, removeViewLine, selectCanvas, updateViewLine, view]);

  async function removePortRange(annotationId: string) {
    const attached = getViewPortRangeAttachedLineCount(view, annotationId);
    if (
      attached > 0 &&
      !(await confirm({
        title: 'Remove I/O Range?',
        message: `This I/O Range has ${attached} attached View line(s). Removing it will also remove those lines.`,
        confirmLabel: 'Remove',
        tone: 'danger',
      }))
    ) {
      return;
    }
    removeViewAnnotation(view.id, annotationId);
    selectCanvas(null);
  }

  function beginAnnotationResize(event: PointerEvent<HTMLElement>, annotation: FreeAnnotation) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    captureRef.current = { target: event.currentTarget, pointerId: event.pointerId };
    const selection = createViewMovableSelection([{ kind: annotation.kind, id: annotation.id }]);
    if (selection) selectCanvas({ kind: 'movable', value: selection });
    setAnnotationGesture({
      viewId: view.id,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startClientX: event.clientX,
      startClientY: event.clientY,
      annotation,
    });
    setAnnotationPreview(annotation);
  }

  function updatePointer(event: PointerEvent<HTMLElement>) {
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
    if (annotationGesture && annotationGesture.pointerId === event.pointerId) {
      const dx = (event.clientX - annotationGesture.startClientX) / zoom / VIEW_PIXELS_PER_MM;
      const dy = (event.clientY - annotationGesture.startClientY) / zoom / VIEW_PIXELS_PER_MM;
      const source = annotationGesture.annotation;
      if (source.kind === 'text') {
        setAnnotationPreview({ ...source, widthMm: Math.max(10, source.widthMm + dx) });
      } else {
        setAnnotationPreview({
          ...source,
          widthMm: Math.max(20, source.widthMm + dx),
          heightMm: Math.max(15, source.heightMm + dy),
        });
      }
      return true;
    }
    if (waypointGesture && waypointGesture.pointerId === event.pointerId) {
      const raw = {
        xMm:
          waypointGesture.origin.xMm +
          (event.clientX - waypointGesture.startClientX) / zoom / VIEW_PIXELS_PER_MM,
        yMm:
          waypointGesture.origin.yMm +
          (event.clientY - waypointGesture.startClientY) / zoom / VIEW_PIXELS_PER_MM,
      };
      const point = event.altKey ? raw : snapViewLayoutPosition(raw, layoutScale);
      setLinePreview({
        ...waypointGesture.line,
        waypoints: moveLineWaypoint(
          project,
          view,
          waypointGesture.line,
          waypointGesture.waypointIndex,
          point,
        ),
      });
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
      if (projected) setLinePreview({ ...labelGesture.line, labelPosition: projected.labelPosition });
      return true;
    }
    return false;
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (endpointReconnect && endpointReconnect.pointerId === event.pointerId) {
      releasePointerCaptureSafely(endpointReconnect.captureTarget, endpointReconnect.pointerId);
      captureRef.current = null;
      const dropped = readViewLineEndpointAt(event.clientX, event.clientY);
      const candidate =
        dropped &&
        isValidViewLineReconnectTarget(project, view, endpointReconnect.line, endpointReconnect.role, dropped)
          ? dropped
          : null;
      if (endpointReconnect.viewId === view.id && candidate) {
        updateViewLine(view.id, endpointReconnect.line.id, {
          [endpointReconnect.role]: candidate,
        });
      }
      setEndpointReconnect(null);
      setLinePreview(null);
      return true;
    }
    if (annotationGesture && annotationGesture.pointerId === event.pointerId && annotationPreview) {
      if (annotationGesture.viewId !== view.id) {
        cancel();
        return true;
      }
      releasePointerCaptureSafely(annotationGesture.captureTarget, annotationGesture.pointerId);
      captureRef.current = null;
      updateViewAnnotation(view.id, annotationPreview.id, annotationPreview);
      setAnnotationGesture(null);
      setAnnotationPreview(null);
      return true;
    }
    if (waypointGesture && waypointGesture.pointerId === event.pointerId && linePreview) {
      if (waypointGesture.viewId !== view.id) {
        cancel();
        return true;
      }
      releasePointerCaptureSafely(waypointGesture.captureTarget, waypointGesture.pointerId);
      captureRef.current = null;
      updateViewLine(view.id, linePreview.id, { waypoints: linePreview.waypoints });
      setWaypointGesture(null);
      setLinePreview(null);
      return true;
    }
    if (labelGesture && labelGesture.pointerId === event.pointerId && linePreview) {
      if (labelGesture.viewId !== view.id) {
        cancel();
        return true;
      }
      releasePointerCaptureSafely(labelGesture.captureTarget, labelGesture.pointerId);
      captureRef.current = null;
      updateViewLine(view.id, linePreview.id, { labelPosition: linePreview.labelPosition });
      setLabelGesture(null);
      setLinePreview(null);
      return true;
    }
    return false;
  }

  function beginWaypointGesture(
    event: PointerEvent<SVGCircleElement>,
    line: ViewLine,
    waypointIndex: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    captureRef.current = { target: event.currentTarget, pointerId: event.pointerId };
    const manual = makeLineRouteManual(project, view, line);
    const origin = manual.waypoints[waypointIndex];
    if (!origin) return;
    selectCanvas({ kind: 'line', id: line.id, bendIndex: waypointIndex });
    setWaypointGesture({
      viewId: view.id,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startClientX: event.clientX,
      startClientY: event.clientY,
      line: manual,
      waypointIndex,
      origin,
    });
    setLinePreview(manual);
  }

  function beginInsertedWaypointGesture(event: PointerEvent<SVGElement>, line: ViewLine, point: ViewPoint) {
    event.preventDefault();
    event.stopPropagation();
    const inserted = insertLineWaypointWithIndex(project, view, line, point);
    const manual = { ...line, waypoints: inserted.waypoints };
    const origin = manual.waypoints[inserted.waypointIndex];
    if (!origin) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    captureRef.current = { target: event.currentTarget, pointerId: event.pointerId };
    selectCanvas({ kind: 'line', id: line.id, bendIndex: inserted.waypointIndex });
    setWaypointGesture({
      viewId: view.id,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startClientX: event.clientX,
      startClientY: event.clientY,
      line: manual,
      waypointIndex: inserted.waypointIndex,
      origin,
    });
    setLinePreview(manual);
  }

  function addWaypoint(line: ViewLine, point: ViewPoint) {
    updateViewLine(view.id, line.id, { waypoints: insertLineWaypoint(project, view, line, point) });
    selectCanvas({ kind: 'line', id: line.id });
  }

  function beginLabelGesture(event: PointerEvent<SVGElement>, line: ViewLine) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    captureRef.current = { target: event.currentTarget, pointerId: event.pointerId };
    selectCanvas({ kind: 'line', id: line.id });
    setLabelGesture({
      viewId: view.id,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      line,
    });
    setLinePreview(line);
  }

  function beginEndpointReconnect(
    event: PointerEvent<HTMLElement>,
    line: ViewLine,
    role: ViewLineEndpointRole,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    captureRef.current = { target: event.currentTarget, pointerId: event.pointerId };
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

  function cancel() {
    if (annotationGesture)
      releasePointerCaptureSafely(annotationGesture.captureTarget, annotationGesture.pointerId);
    if (waypointGesture)
      releasePointerCaptureSafely(waypointGesture.captureTarget, waypointGesture.pointerId);
    if (labelGesture) releasePointerCaptureSafely(labelGesture.captureTarget, labelGesture.pointerId);
    if (endpointReconnect)
      releasePointerCaptureSafely(endpointReconnect.captureTarget, endpointReconnect.pointerId);
    const capture = captureRef.current;
    if (capture) releasePointerCaptureSafely(capture.target, capture.pointerId);
    captureRef.current = null;
    const active = Boolean(
      annotationGesture || waypointGesture || labelGesture || endpointReconnect || linePreview,
    );
    setAnnotationGesture(null);
    setAnnotationPreview(null);
    setWaypointGesture(null);
    setLabelGesture(null);
    setEndpointReconnect(null);
    setLinePreview(null);
    return active;
  }

  return {
    annotationPreview,
    linePreview,
    beginAnnotationResize,
    beginWaypointGesture,
    beginInsertedWaypointGesture,
    beginLabelGesture,
    beginEndpointReconnect,
    endpointReconnect,
    addWaypoint,
    updatePointer,
    finishPointer,
    cancel,
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

function releasePointerCaptureSafely(target: Element, pointerId: number) {
  if (
    'hasPointerCapture' in target &&
    'releasePointerCapture' in target &&
    typeof target.hasPointerCapture === 'function' &&
    typeof target.releasePointerCapture === 'function' &&
    target.hasPointerCapture(pointerId)
  ) {
    target.releasePointerCapture(pointerId);
  }
}

function isEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
