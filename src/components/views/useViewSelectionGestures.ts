import { useCallback, useEffect, useMemo, useState, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewPoint } from '../../domain/types';
import type { ViewDeviceScale } from '../../domain/viewLayoutGrid';
import {
  addToViewMovableSelection,
  createViewMovableSelection,
  findViewMovableElementsInMarquee,
  getViewMovableBounds,
  getViewPointerTranslation,
  isViewMovablePrimary,
  isViewMovableSelected,
  normalizeViewMarquee,
  normalizeViewMovableSelection,
  removeViewMovableElements,
  setViewMovablePrimary,
  toggleViewMovableSelection,
  translateViewMovableElements,
  type ViewMovableElementRef,
  type ViewMovableSelection,
} from '../../domain/viewSelection';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import type { ViewCanvasSelection, ViewEditorTool } from './viewEditorTypes';
import { VIEW_PIXELS_PER_MM } from './viewViewport';
import { useViewSelectionKeyboard } from './useViewSelectionKeyboard';

interface MoveGesture {
  kind: 'move';
  pointerId: number;
  captureTarget: HTMLElement;
  startClientX: number;
  startClientY: number;
  startView: ProjectView;
  selection: ViewMovableSelection;
  selectionBefore: ViewCanvasSelection | null;
  primaryOrigin: ViewPoint;
  delta: ViewPoint;
}

interface MarqueeGesture {
  kind: 'marquee';
  pointerId: number;
  captureTarget: HTMLElement;
  start: ViewPoint;
  current: ViewPoint;
  additive: boolean;
  selectionBefore: ViewCanvasSelection | null;
}

type SelectionGesture = MoveGesture | MarqueeGesture;

export function useViewSelectionGestures({
  project,
  view,
  zoom,
  layoutScale,
  page,
  tool,
  canvasSelection,
  selectCanvas,
  replaceViewCanvas,
}: {
  project: ProjectRoot;
  view: ProjectView;
  zoom: number;
  layoutScale: ViewDeviceScale;
  page: { widthMm: number; heightMm: number };
  tool: ViewEditorTool;
  canvasSelection: ViewCanvasSelection | null;
  selectCanvas: (selection: ViewCanvasSelection | null) => void;
  replaceViewCanvas: ProjectContextValue['replaceViewCanvas'];
}) {
  const [gesture, setGesture] = useState<SelectionGesture | null>(null);
  const [previewView, setPreviewView] = useState<ProjectView | null>(null);
  const movableSelection = canvasSelection?.kind === 'movable' ? canvasSelection.value : null;

  const commitView = useCallback(
    (next: ProjectView) =>
      replaceViewCanvas(view.id, {
        placements: next.placements,
        lines: next.lines,
        annotations: next.annotations,
      }),
    [replaceViewCanvas, view.id],
  );

  const removeSelected = useCallback(() => {
    if (!movableSelection?.items.length) return;
    commitView(removeViewMovableElements(view, movableSelection.items));
    selectCanvas(null);
  }, [commitView, movableSelection, selectCanvas, view]);

  useEffect(() => {
    setGesture(null);
    setPreviewView(null);
  }, [view.id]);

  useEffect(() => {
    if (!movableSelection) return;
    const normalized = normalizeViewMovableSelection(view, movableSelection);
    if (!normalized) {
      selectCanvas(null);
      return;
    }
    if (JSON.stringify(normalized) !== JSON.stringify(movableSelection)) {
      selectCanvas({ kind: 'movable', value: normalized });
    }
  }, [movableSelection, selectCanvas, view]);

  useViewSelectionKeyboard({
    tool,
    selection: movableSelection,
    project,
    view,
    page,
    layoutScale,
    commitView,
    removeSelected,
  });

  useEffect(() => {
    if (!gesture) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      releaseCapture(gesture!);
      selectCanvas(gesture!.selectionBefore);
      setGesture(null);
      setPreviewView(null);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [gesture, selectCanvas]);

  const marqueeBounds = useMemo(
    () => (gesture?.kind === 'marquee' ? normalizeViewMarquee(gesture.start, gesture.current) : null),
    [gesture],
  );

  function selectMovable(item: ViewMovableElementRef, toggle = false) {
    const next = toggle
      ? toggleViewMovableSelection(movableSelection, item)
      : movableSelection && isViewMovableSelected(movableSelection, item)
        ? setViewMovablePrimary(movableSelection, item)
        : createViewMovableSelection([item], item);
    selectCanvas(next ? { kind: 'movable', value: next } : null);
    return next;
  }

  function beginMovableGesture(event: PointerEvent<HTMLElement>, item: ViewMovableElementRef) {
    if (tool !== 'select' || (event.button !== 0 && event.button !== undefined)) return;
    const toggle = event.ctrlKey || event.metaKey;
    if (toggle) return;
    event.preventDefault();
    event.stopPropagation();
    const next = selectMovable(item);
    if (!next || !isViewMovableSelected(next, item)) return;
    const primary = setViewMovablePrimary(next, item);
    selectCanvas({ kind: 'movable', value: primary });
    const bounds = getViewMovableBounds(project, view, primary.primary);
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.closest<HTMLElement>('[data-view-placement-id]')?.focus();
    setGesture({
      kind: 'move',
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startView: view,
      selection: primary,
      selectionBefore: canvasSelection,
      primaryOrigin: { xMm: bounds.xMm, yMm: bounds.yMm },
      delta: { xMm: 0, yMm: 0 },
    });
  }

  function handlePagePointerDown(event: PointerEvent<HTMLElement>) {
    if (tool !== 'select' || event.target !== event.currentTarget) return false;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = pagePoint(event, zoom);
    setGesture({
      kind: 'marquee',
      pointerId: event.pointerId,
      captureTarget: event.currentTarget,
      start,
      current: start,
      additive: event.shiftKey,
      selectionBefore: canvasSelection,
    });
    return true;
  }

  function updatePointer(event: PointerEvent<HTMLElement>) {
    if (!gesture || gesture.pointerId !== event.pointerId) return false;
    if (gesture.kind === 'marquee') {
      setGesture({ ...gesture, current: pagePoint(event, zoom) });
      return true;
    }
    const proposed = {
      xMm: gesture.primaryOrigin.xMm + (event.clientX - gesture.startClientX) / zoom / VIEW_PIXELS_PER_MM,
      yMm: gesture.primaryOrigin.yMm + (event.clientY - gesture.startClientY) / zoom / VIEW_PIXELS_PER_MM,
    };
    const delta = getViewPointerTranslation(
      project,
      gesture.startView,
      gesture.selection,
      proposed,
      page,
      layoutScale,
      !event.altKey,
    );
    setGesture({ ...gesture, delta });
    setPreviewView(translateViewMovableElements(gesture.startView, gesture.selection.items, delta));
    return true;
  }

  function finishPointer(event: PointerEvent<HTMLElement>) {
    if (!gesture || gesture.pointerId !== event.pointerId) return false;
    releaseCapture(gesture);
    if (gesture.kind === 'move') {
      if (gesture.delta.xMm || gesture.delta.yMm) {
        commitView(translateViewMovableElements(gesture.startView, gesture.selection.items, gesture.delta));
      }
    } else {
      const enclosed = findViewMovableElementsInMarquee(
        project,
        view,
        normalizeViewMarquee(gesture.start, pagePoint(event, zoom)),
      );
      const previous = gesture.selectionBefore?.kind === 'movable' ? gesture.selectionBefore.value : null;
      const next = gesture.additive
        ? addToViewMovableSelection(previous, enclosed)
        : createViewMovableSelection(enclosed);
      selectCanvas(next ? { kind: 'movable', value: next } : null);
    }
    setGesture(null);
    setPreviewView(null);
    return true;
  }

  function cancel() {
    if (gesture) releaseCapture(gesture);
    setGesture(null);
    setPreviewView(null);
  }

  return {
    renderedView: previewView ?? view,
    movableSelection,
    marqueeBounds,
    isSelected: (item: ViewMovableElementRef) => isViewMovableSelected(movableSelection, item),
    isPrimary: (item: ViewMovableElementRef) => isViewMovablePrimary(movableSelection, item),
    selectMovable,
    beginMovableGesture,
    handlePagePointerDown,
    updatePointer,
    finishPointer,
    removeSelected,
    cancel,
  };
}

function pagePoint(event: PointerEvent<HTMLElement>, zoom: number): ViewPoint {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    xMm: (event.clientX - bounds.left) / zoom / VIEW_PIXELS_PER_MM,
    yMm: (event.clientY - bounds.top) / zoom / VIEW_PIXELS_PER_MM,
  };
}

function releaseCapture(gesture: SelectionGesture) {
  if (
    typeof gesture.captureTarget.hasPointerCapture === 'function' &&
    typeof gesture.captureTarget.releasePointerCapture === 'function' &&
    gesture.captureTarget.hasPointerCapture(gesture.pointerId)
  ) {
    gesture.captureTarget.releasePointerCapture(gesture.pointerId);
  }
}
