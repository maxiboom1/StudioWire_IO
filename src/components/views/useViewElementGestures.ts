import { useEffect, useState, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewAnnotation, ViewLine, ViewPoint } from '../../domain/types';
import {
  insertLineWaypoint,
  makeLineRouteManual,
  moveLineWaypoint,
  removeLineWaypoint,
} from '../../domain/viewRouteEditing';
import { snapViewLayoutPosition, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import { createViewMovableSelection } from '../../domain/viewSelection';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { VIEW_PIXELS_PER_MM } from './viewViewport';
import type { ViewCanvasSelection } from './viewEditorTypes';

type FreeAnnotation = Exclude<ViewAnnotation, { kind: 'port_range' }>;

interface AnnotationGesture {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  annotation: FreeAnnotation;
}

interface WaypointGesture {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  line: ViewLine;
  waypointIndex: number;
  origin: ViewPoint;
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

  useEffect(() => cancel(), [view.id]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' || isEditingTarget(event.target)) return;
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
      if (canvasSelection?.kind === 'portRange') removeViewAnnotation(view.id, canvasSelection.id);
      if (canvasSelection?.kind === 'line' || canvasSelection?.kind === 'portRange') selectCanvas(null);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [canvasSelection, removeViewAnnotation, removeViewLine, selectCanvas, updateViewLine, view]);

  function beginAnnotationResize(event: PointerEvent<HTMLElement>, annotation: FreeAnnotation) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const selection = createViewMovableSelection([{ kind: annotation.kind, id: annotation.id }]);
    if (selection) selectCanvas({ kind: 'movable', value: selection });
    setAnnotationGesture({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      annotation,
    });
    setAnnotationPreview(annotation);
  }

  function updatePointer(event: PointerEvent<HTMLElement>) {
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
    return false;
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (annotationGesture && annotationGesture.pointerId === event.pointerId && annotationPreview) {
      updateViewAnnotation(view.id, annotationPreview.id, annotationPreview);
      setAnnotationGesture(null);
      setAnnotationPreview(null);
      return true;
    }
    if (waypointGesture && waypointGesture.pointerId === event.pointerId && linePreview) {
      updateViewLine(view.id, linePreview.id, { waypoints: linePreview.waypoints });
      setWaypointGesture(null);
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
    const manual = makeLineRouteManual(project, view, line);
    const origin = manual.waypoints[waypointIndex];
    if (!origin) return;
    selectCanvas({ kind: 'line', id: line.id, bendIndex: waypointIndex });
    setWaypointGesture({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      line: manual,
      waypointIndex,
      origin,
    });
    setLinePreview(manual);
  }

  function addWaypoint(line: ViewLine, point: ViewPoint) {
    updateViewLine(view.id, line.id, { waypoints: insertLineWaypoint(project, view, line, point) });
    selectCanvas({ kind: 'line', id: line.id });
  }

  function cancel() {
    setAnnotationGesture(null);
    setAnnotationPreview(null);
    setWaypointGesture(null);
    setLinePreview(null);
  }

  return {
    annotationPreview,
    linePreview,
    beginAnnotationResize,
    beginWaypointGesture,
    addWaypoint,
    updatePointer,
    finishPointer,
    cancel,
  };
}

function isEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
