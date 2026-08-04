import { useCallback, useEffect, useState, type PointerEvent } from 'react';
import type { ProjectView, ViewPlacement } from '../../domain/types';
import { applyViewDeviceScale } from '../../domain/viewOperations';
import { getPortRangeRows } from '../../domain/viewPortRanges';
import {
  getViewDeviceScaleState,
  getViewLayoutScale,
  type ViewDeviceScale,
} from '../../domain/viewLayoutGrid';
import { getPlacementPage } from '../../domain/viewPlacement';
import { useProject } from '../../state/ProjectContext';
import { useViewCreationTools } from './useViewCreationTools';
import { useViewDrop } from './useViewDrop';
import { useViewElementGestures } from './useViewElementGestures';
import { useViewSelectionGestures } from './useViewSelectionGestures';
import type { ViewCanvasSelection } from './viewEditorTypes';

export function useViewEditorController({
  view,
  zoom,
  canvasSelection,
  onCanvasSelectionChange,
}: {
  view: ProjectView;
  zoom: number;
  canvasSelection: ViewCanvasSelection | null;
  onCanvasSelectionChange: (selection: ViewCanvasSelection | null) => void;
}) {
  const commands = useProject();
  const {
    project,
    addViewPlacement,
    replaceViewCanvas,
    addViewLine,
    updateViewLine,
    removeViewLine,
    addViewAnnotation,
    updateViewAnnotation,
    removeViewAnnotation,
  } = commands;
  const [notice, setNotice] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const selectedPlacementId =
    canvasSelection?.kind === 'movable' && canvasSelection.value.primary.kind === 'placement'
      ? canvasSelection.value.primary.id
      : null;
  const selectedPlacement = view.placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const page = getPlacementPage(project, view);
  const deviceScaleState = getViewDeviceScaleState(view);
  const layoutScale = getViewLayoutScale(view);

  const requestFocus = useCallback((inspector = false) => {
    setFocusRequest((current) => current + 1);
    if (inspector) window.setTimeout(() => document.getElementById('view-element-label')?.focus(), 0);
  }, []);
  const selectCanvas = useCallback(
    (selection: ViewCanvasSelection | null) => onCanvasSelectionChange(selection),
    [onCanvasSelectionChange],
  );

  const creation = useViewCreationTools({
    project,
    view,
    zoom,
    layoutScale,
    page,
    addViewLine,
    addViewAnnotation,
    selectCanvas,
    requestFocus,
    setNotice,
  });
  const elements = useViewElementGestures({
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
  });

  const selection = useViewSelectionGestures({
    project,
    view,
    zoom,
    layoutScale,
    page,
    tool: creation.tool,
    canvasSelection,
    selectCanvas,
    replaceViewCanvas,
  });

  function selectPlacement(id: string | null) {
    selectCanvas(
      id
        ? {
            kind: 'movable',
            value: { primary: { kind: 'placement', id }, items: [{ kind: 'placement', id }] },
          }
        : null,
    );
  }
  const drop = useViewDrop({
    project,
    view,
    zoom,
    layoutScale,
    page,
    addViewPlacement,
    selectPlacement,
    requestFocus,
    setNotice,
  });

  useEffect(() => {
    setNotice('');
  }, [view.id]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      creation.cancel();
      elements.cancel();
      setNotice('');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [creation, elements]);

  function updateGesture(event: PointerEvent<HTMLElement>) {
    if (creation.updatePointer(event)) return;
    if (elements.updatePointer(event)) return;
    selection.updatePointer(event);
  }

  function finishGesture(event: PointerEvent<HTMLElement>) {
    if (creation.finishPointer(event)) return;
    if (elements.finishPointer(event)) return;
    selection.finishPointer(event);
  }

  function cancelGesture() {
    creation.cancel();
    elements.cancel();
    selection.cancel();
  }

  function handlePagePointerDown(event: PointerEvent<HTMLElement>) {
    if (creation.tool === 'select') {
      selection.handlePagePointerDown(event);
      return;
    }
    creation.handlePagePointerDown(event);
  }

  function changeDeviceScale(scale: ViewDeviceScale) {
    if (deviceScaleState.kind === 'uniform' && deviceScaleState.scale === scale) return;
    const updated = applyViewDeviceScale(view, scale);
    replaceViewCanvas(view.id, {
      placements: updated.placements,
      lines: updated.lines,
      annotations: updated.annotations,
    });
  }

  return {
    project,
    zoom,
    tool: creation.tool,
    setTool: creation.setTool,
    canvasSelection,
    selectedPlacement,
    renderedView: selection.renderedView,
    movableSelection: selection.movableSelection,
    marqueeBounds: selection.marqueeBounds,
    annotationPreview: elements.annotationPreview,
    linePreview: elements.linePreview,
    linePointer: creation.linePointer,
    dropPreview: drop.dropPreview,
    notice,
    deviceScaleState,
    layoutScale,
    focusRequest,
    lineDraft: creation.lineDraft,
    portRangeDraft: creation.portRangeDraft,
    groupDraft: creation.groupDraft,
    getPortRangeRows: (placement: ViewPlacement, side: 'left' | 'right') =>
      getPortRangeRows(project, placement, side),
    changeDeviceScale,
    selectPlacement,
    selectCanvas,
    isMovableSelected: selection.isSelected,
    isMovablePrimary: selection.isPrimary,
    selectMovable: selection.selectMovable,
    beginMovableGesture: selection.beginMovableGesture,
    beginAnnotationResize: elements.beginAnnotationResize,
    beginWaypointGesture: elements.beginWaypointGesture,
    addWaypoint: elements.addWaypoint,
    updateGesture,
    finishGesture,
    cancelGesture,
    handlePagePointerDown,
    handleLineAnchor: creation.handleLineAnchor,
    handlePortRangeRow: creation.handlePortRangeRow,
    handlePageDragOver: drop.handlePageDragOver,
    handlePageDrop: drop.handlePageDrop,
    clearDropPreview: drop.clearDropPreview,
  };
}

export type ViewEditorController = ReturnType<typeof useViewEditorController>;
