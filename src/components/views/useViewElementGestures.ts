import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewAnnotation } from '../../domain/types';
import { makeLineRouteManual, removeLineWaypoint } from '../../domain/viewRouteEditing';
import { snapViewLayoutPosition, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import { getViewPortRangeAttachedLineCount } from '../../domain/viewOperations';
import { createViewMovableSelection } from '../../domain/viewSelection';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { useOptionalConfirmation } from '../common/ConfirmationDialog';
import { useViewLineGestures } from './useViewLineGestures';
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
  setNotice: (notice: string) => void;
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
    setNotice,
  } = options;
  const [annotationGesture, setAnnotationGesture] = useState<AnnotationGesture | null>(null);
  const [annotationPreview, setAnnotationPreview] = useState<FreeAnnotation | null>(null);
  const annotationCaptureRef = useRef<{ target: Element; pointerId: number } | null>(null);
  const lineGestures = useViewLineGestures({
    project,
    view,
    zoom,
    layoutScale,
    selectCanvas,
    updateViewLine,
    setNotice,
  });

  useEffect(() => {
    cancel();
  }, [view.id]);

  useEffect(
    () => () => {
      const capture = annotationCaptureRef.current;
      if (capture) releasePointerCaptureSafely(capture.target, capture.pointerId);
      lineGestures.cleanupCapture();
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
          const manual = makeLineRouteManual(project, view, line);
          const withoutSelected = removeLineWaypoint(manual, canvasSelection.bendIndex);
          updateViewLine(view.id, line.id, {
            waypoints: withoutSelected.length
              ? makeLineRouteManual(project, view, { ...manual, waypoints: withoutSelected }).waypoints
              : [],
          });
        } else {
          removeViewLine(view.id, canvasSelection.id);
        }
        selectCanvas(null);
        return;
      }
      if (canvasSelection?.kind === 'portRange') void removePortRange(canvasSelection.id);
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
    annotationCaptureRef.current = { target: event.currentTarget, pointerId: event.pointerId };
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

  function updatePointer(event: PointerEvent<HTMLElement>): boolean {
    if (annotationGesture && annotationGesture.pointerId === event.pointerId) {
      const dx = (event.clientX - annotationGesture.startClientX) / zoom / VIEW_PIXELS_PER_MM;
      const dy = (event.clientY - annotationGesture.startClientY) / zoom / VIEW_PIXELS_PER_MM;
      const source = annotationGesture.annotation;
      if (source.kind === 'text') {
        const raw = { xMm: source.xMm + source.widthMm + dx, yMm: source.yMm };
        const point = event.altKey ? raw : snapViewLayoutPosition(raw, layoutScale);
        setAnnotationPreview({ ...source, widthMm: Math.max(10, point.xMm - source.xMm) });
      } else {
        const raw = {
          xMm: source.xMm + source.widthMm + dx,
          yMm: source.yMm + source.heightMm + dy,
        };
        const point = event.altKey ? raw : snapViewLayoutPosition(raw, layoutScale);
        setAnnotationPreview({
          ...source,
          widthMm: Math.max(20, point.xMm - source.xMm),
          heightMm: Math.max(15, point.yMm - source.yMm),
        });
      }
      return true;
    }
    return lineGestures.updatePointer(event);
  }

  function finishPointer(event: PointerEvent<HTMLElement>): boolean {
    if (annotationGesture && annotationGesture.pointerId === event.pointerId) {
      releasePointerCaptureSafely(annotationGesture.captureTarget, annotationGesture.pointerId);
      annotationCaptureRef.current = null;
      if (annotationGesture.viewId === view.id && annotationPreview) {
        updateViewAnnotation(view.id, annotationPreview.id, annotationPreview);
      }
      setAnnotationGesture(null);
      setAnnotationPreview(null);
      return true;
    }
    return lineGestures.finishPointer(event);
  }

  function cancel(): boolean {
    if (annotationGesture)
      releasePointerCaptureSafely(annotationGesture.captureTarget, annotationGesture.pointerId);
    annotationCaptureRef.current = null;
    const lineActive = lineGestures.cancel();
    const active = Boolean(annotationGesture || annotationPreview || lineActive);
    setAnnotationGesture(null);
    setAnnotationPreview(null);
    return active;
  }

  return {
    annotationPreview,
    linePreview: lineGestures.linePreview,
    flexPathPreview: lineGestures.flexPathPreview,
    beginAnnotationResize,
    beginWaypointGesture: lineGestures.beginWaypointGesture,
    beginSegmentGesture: lineGestures.beginSegmentGesture,
    beginLabelGesture: lineGestures.beginLabelGesture,
    beginEndpointReconnect: lineGestures.beginEndpointReconnect,
    endpointReconnect: lineGestures.endpointReconnect,
    updatePointer,
    finishPointer,
    cancel,
  };
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
