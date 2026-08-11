import { useRef, useState, type PointerEvent } from 'react';
import { makeUniqueId } from '../../domain/id';
import type { ProjectRoot, ProjectView, ViewLine, ViewPoint } from '../../domain/types';
import {
  createLineFlexPath,
  isLineSegmentFlexEligible,
  makeLineRouteManual,
  moveLineSegment,
  moveLineWaypoint,
} from '../../domain/viewRouteEditing';
import { getViewLayoutMetrics, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import { snapViewLineSegmentCoordinate, snapViewLineWaypointPosition } from '../../domain/viewRouteSnapping';
import { getRenderedLineRoute, getViewLineSegments } from '../../domain/viewRouting';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import type { ViewCanvasSelection } from './viewEditorTypes';
import {
  captureViewPointer,
  cleanupViewPointerCapture,
  releaseViewPointer,
  type ViewPointerCapture,
} from './viewPointerCapture';
import { VIEW_PIXELS_PER_MM } from './viewViewport';

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

interface SegmentGesture {
  viewId: string;
  pointerId: number;
  captureTarget: SVGElement;
  startClientX: number;
  startClientY: number;
  line: ViewLine;
  segmentIndex: number;
  orientation: 'horizontal' | 'vertical';
  originCoordinateMm: number;
  midpoint: ViewPoint;
  mode: 'move' | 'flex';
  flexPathId: string | null;
  gridPitchMm: number;
}

export interface ViewFlexPathPreview {
  lineId: string;
  flexPathId: string;
  guideStart: ViewPoint;
  guideEnd: ViewPoint;
}

interface ViewLineRouteGestureOptions {
  project: ProjectRoot;
  view: ProjectView;
  zoom: number;
  layoutScale: ViewDeviceScale;
  selectCanvas: (selection: ViewCanvasSelection | null) => void;
  updateViewLine: ProjectContextValue['updateViewLine'];
  setNotice: (notice: string) => void;
}

export function useViewLineRouteGestures(options: ViewLineRouteGestureOptions) {
  const { project, view, zoom, layoutScale, selectCanvas, updateViewLine, setNotice } = options;
  const [waypointGesture, setWaypointGesture] = useState<WaypointGesture | null>(null);
  const [segmentGesture, setSegmentGesture] = useState<SegmentGesture | null>(null);
  const [linePreview, setLinePreview] = useState<ViewLine | null>(null);
  const [flexPathPreview, setFlexPathPreview] = useState<ViewFlexPathPreview | null>(null);
  const captureRef = useRef<ViewPointerCapture | null>(null);

  function beginWaypointGesture(
    event: PointerEvent<SVGCircleElement>,
    line: ViewLine,
    waypointIndex: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const manual = makeLineRouteManual(project, view, line);
    const origin = manual.waypoints[waypointIndex];
    if (!origin) return;
    captureViewPointer(event.currentTarget, event.pointerId, captureRef);
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
    setLinePreview(null);
  }

  function beginSegmentGesture(event: PointerEvent<SVGCircleElement>, line: ViewLine, segmentIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const manual = makeLineRouteManual(project, view, line);
    const segment = getViewLineSegments(getRenderedLineRoute(project, view, manual)).find(
      (candidate) => candidate.index === segmentIndex,
    );
    if (!segment) return;
    const gridPitchMm = getViewLayoutMetrics(layoutScale).rowPitchMm;
    if (event.shiftKey && !isLineSegmentFlexEligible(segment, gridPitchMm)) {
      setNotice(
        segment.flexPathId
          ? 'Flex paths cannot be nested; reshape the existing Flex path.'
          : 'Segment is too short for a Flex path.',
      );
      return;
    }
    captureViewPointer(event.currentTarget, event.pointerId, captureRef);
    selectCanvas({ kind: 'line', id: line.id });
    setNotice('');
    setSegmentGesture({
      viewId: view.id,
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startClientX: event.clientX,
      startClientY: event.clientY,
      line: manual,
      segmentIndex,
      orientation: segment.orientation,
      originCoordinateMm: segment.orientation === 'horizontal' ? segment.midpoint.yMm : segment.midpoint.xMm,
      midpoint: segment.midpoint,
      mode: event.shiftKey ? 'flex' : 'move',
      flexPathId: event.shiftKey ? makeUniqueId('view-flex-path', line.id) : null,
      gridPitchMm,
    });
    setLinePreview(null);
  }

  function updatePointer(event: PointerEvent<HTMLElement>): boolean {
    if (waypointGesture && waypointGesture.pointerId === event.pointerId) {
      const raw = {
        xMm:
          waypointGesture.origin.xMm +
          (event.clientX - waypointGesture.startClientX) / zoom / VIEW_PIXELS_PER_MM,
        yMm:
          waypointGesture.origin.yMm +
          (event.clientY - waypointGesture.startClientY) / zoom / VIEW_PIXELS_PER_MM,
      };
      const point = event.altKey
        ? raw
        : snapViewLineWaypointPosition(project, view, waypointGesture.line, raw, layoutScale);
      const waypoints = moveLineWaypoint(
        project,
        view,
        waypointGesture.line,
        waypointGesture.waypointIndex,
        point,
      );
      setLinePreview(
        areWaypointsEqual(waypoints, waypointGesture.line.waypoints)
          ? null
          : { ...waypointGesture.line, waypoints },
      );
      return true;
    }
    if (segmentGesture && segmentGesture.pointerId === event.pointerId) {
      updateSegmentPreview(event, segmentGesture);
      return true;
    }
    return false;
  }

  function finishPointer(event: PointerEvent<HTMLElement>): boolean {
    if (waypointGesture && waypointGesture.pointerId === event.pointerId) {
      releaseViewPointer(waypointGesture.captureTarget, waypointGesture.pointerId, captureRef);
      if (waypointGesture.viewId === view.id && linePreview) {
        updateViewLine(view.id, linePreview.id, { waypoints: linePreview.waypoints });
      }
      setWaypointGesture(null);
      setLinePreview(null);
      return true;
    }
    if (segmentGesture && segmentGesture.pointerId === event.pointerId) {
      releaseViewPointer(segmentGesture.captureTarget, segmentGesture.pointerId, captureRef);
      if (segmentGesture.viewId === view.id && linePreview) {
        updateViewLine(view.id, linePreview.id, { waypoints: linePreview.waypoints });
      }
      setSegmentGesture(null);
      setFlexPathPreview(null);
      setLinePreview(null);
      return true;
    }
    return false;
  }

  function cancel(): boolean {
    for (const gesture of [waypointGesture, segmentGesture]) {
      if (gesture) releaseViewPointer(gesture.captureTarget, gesture.pointerId, captureRef);
    }
    const active = Boolean(waypointGesture || segmentGesture || linePreview || flexPathPreview);
    setWaypointGesture(null);
    setSegmentGesture(null);
    setLinePreview(null);
    setFlexPathPreview(null);
    return active;
  }

  function updateSegmentPreview(event: PointerEvent<HTMLElement>, gesture: SegmentGesture) {
    const deltaPixels =
      gesture.orientation === 'horizontal'
        ? event.clientY - gesture.startClientY
        : event.clientX - gesture.startClientX;
    const rawDeltaMm = deltaPixels / zoom / VIEW_PIXELS_PER_MM;
    if (gesture.mode === 'flex') {
      updateFlexPreview(event, gesture, rawDeltaMm, deltaPixels);
      return;
    }

    const rawCoordinate = gesture.originCoordinateMm + rawDeltaMm;
    const coordinateMm = event.altKey
      ? rawCoordinate
      : snapViewLineSegmentCoordinate(
          project,
          view,
          gesture.line,
          gesture.segmentIndex,
          rawCoordinate,
          layoutScale,
        );
    const waypoints = moveLineSegment(project, view, gesture.line, gesture.segmentIndex, coordinateMm);
    setLinePreview(
      areWaypointsEqual(waypoints, gesture.line.waypoints) ? null : { ...gesture.line, waypoints },
    );
  }

  function updateFlexPreview(
    event: PointerEvent<HTMLElement>,
    gesture: SegmentGesture,
    rawDeltaMm: number,
    deltaPixels: number,
  ) {
    const depthMm = event.altKey
      ? rawDeltaMm
      : Math.round(rawDeltaMm / gesture.gridPitchMm) * gesture.gridPitchMm;
    const guideEnd =
      gesture.orientation === 'horizontal'
        ? { xMm: gesture.midpoint.xMm, yMm: gesture.midpoint.yMm + rawDeltaMm }
        : { xMm: gesture.midpoint.xMm + rawDeltaMm, yMm: gesture.midpoint.yMm };
    setFlexPathPreview({
      lineId: gesture.line.id,
      flexPathId: gesture.flexPathId!,
      guideStart: gesture.midpoint,
      guideEnd,
    });
    const minimum = event.altKey ? 1 : gesture.gridPitchMm;
    if (Math.abs(depthMm) < minimum || Math.abs(deltaPixels) < 3) {
      setLinePreview(null);
      return;
    }
    const result = createLineFlexPath(
      project,
      view,
      gesture.line,
      gesture.segmentIndex,
      gesture.gridPitchMm,
      depthMm,
      gesture.flexPathId!,
    );
    setLinePreview(result.ok ? { ...gesture.line, waypoints: result.waypoints } : null);
  }

  return {
    linePreview,
    flexPathPreview,
    beginWaypointGesture,
    beginSegmentGesture,
    updatePointer,
    finishPointer,
    cancel,
    cleanupCapture: () => cleanupViewPointerCapture(captureRef),
  };
}

function areWaypointsEqual(first: ViewLine['waypoints'], second: ViewLine['waypoints']) {
  return (
    first.length === second.length &&
    first.every(
      (point, index) =>
        point.xMm === second[index].xMm &&
        point.yMm === second[index].yMm &&
        point.flexPathId === second[index].flexPathId,
    )
  );
}
