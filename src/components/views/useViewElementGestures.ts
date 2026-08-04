import { useEffect, useState, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewAnnotation, ViewLine, ViewPoint } from '../../domain/types';
import {
  insertLineWaypoint,
  makeLineRouteManual,
  moveLineWaypoint,
  removeLineWaypoint,
} from '../../domain/viewRouteEditing';
import { projectViewLineLabelToRoute } from '../../domain/viewLineLabelGeometry';
import { getRenderedLinePoints } from '../../domain/viewRouting';
import { snapViewLayoutPosition, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import { createViewMovableSelection } from '../../domain/viewSelection';
import { getViewPortRangeAttachedLineCount } from '../../domain/viewOperations';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { useOptionalConfirmation } from '../common/ConfirmationDialog';
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

interface LabelGesture {
  pointerId: number;
  line: ViewLine;
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
    if (labelGesture && labelGesture.pointerId === event.pointerId) {
      const point = {
        xMm:
          (event.clientX - event.currentTarget.getBoundingClientRect().left) /
          zoom /
          VIEW_PIXELS_PER_MM,
        yMm:
          (event.clientY - event.currentTarget.getBoundingClientRect().top) /
          zoom /
          VIEW_PIXELS_PER_MM,
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
    if (labelGesture && labelGesture.pointerId === event.pointerId && linePreview) {
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

  function beginLabelGesture(event: PointerEvent<SVGElement>, line: ViewLine) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectCanvas({ kind: 'line', id: line.id });
    setLabelGesture({ pointerId: event.pointerId, line });
    setLinePreview(line);
  }

  function toggleLineLabelOrientation(line: ViewLine) {
    updateViewLine(view.id, line.id, {
      labelOrientation: line.labelOrientation === 'horizontal' ? 'vertical' : 'horizontal',
    });
  }

  function cancel() {
    setAnnotationGesture(null);
    setAnnotationPreview(null);
    setWaypointGesture(null);
    setLabelGesture(null);
    setLinePreview(null);
  }

  return {
    annotationPreview,
    linePreview,
    beginAnnotationResize,
    beginWaypointGesture,
    beginLabelGesture,
    toggleLineLabelOrientation,
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
