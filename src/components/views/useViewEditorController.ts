import { useCallback, useEffect, useState, type DragEvent } from 'react';
import type { ProjectView, ViewPlacement } from '../../domain/types';
import { getPlacementNaturalSize } from '../../domain/viewGeometry';
import { applyViewDeviceScale } from '../../domain/viewOperations';
import {
  clampViewLayoutPosition,
  getViewDeviceScaleState,
  getViewLayoutScale,
  type ViewDeviceScale,
} from '../../domain/viewLayoutGrid';
import {
  clampPlacementPosition,
  findExistingPlacement,
  getPlacementPage,
  pointToViewPosition,
} from '../../domain/viewPlacement';
import type { ViewPlacementUpdates } from '../../state/projectContextTypes';
import { useProject } from '../../state/ProjectContext';
import {
  clearNavigatorDragData,
  readNavigatorDragData,
  type NavigatorDragPayload,
} from '../common/deviceDrag';
import { VIEW_PIXELS_PER_MM } from './viewViewport';
import type { ViewDropPreview } from './viewEditorTypes';
import { useViewPlacementGestures } from './useViewPlacementGestures';

export function useViewEditorController({
  view,
  zoom,
  selectedPlacementId,
  onSelectPlacement,
}: {
  view: ProjectView;
  zoom: number;
  selectedPlacementId: string | null;
  onSelectPlacement: (placementId: string | null) => void;
}) {
  const { project, addViewPlacement, updateViewPlacement, removeViewPlacement, replaceViewCanvas } =
    useProject();
  const [dropPreview, setDropPreview] = useState<ViewDropPreview | null>(null);
  const [notice, setNotice] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const selectedPlacement = view.placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const page = getPlacementPage(project, view);
  const deviceScaleState = getViewDeviceScaleState(view);
  const layoutScale = getViewLayoutScale(view);

  const clearDragState = useCallback(() => {
    setDropPreview(null);
    clearNavigatorDragData();
  }, []);

  useEffect(() => {
    setNotice('');
    clearDragState();
  }, [clearDragState, view.id]);

  useEffect(() => {
    const handleDragEnd = () => clearDragState();
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragend', handleDragEnd);
      clearDragState();
    };
  }, [clearDragState]);

  function requestPlacementFocus() {
    setFocusRequest((current) => current + 1);
  }

  function selectExisting(placement: ViewPlacement) {
    onSelectPlacement(placement.id);
    setNotice('Object is already in this View');
    requestPlacementFocus();
  }

  function commitPlacement(placementId: string, updates: ViewPlacementUpdates) {
    updateViewPlacement(view.id, placementId, updates);
  }

  function removePlacement(placementId: string) {
    removeViewPlacement(view.id, placementId);
    if (selectedPlacementId === placementId) {
      onSelectPlacement(null);
    }
    setNotice('Placement removed; source object is unchanged.');
  }

  const gestures = useViewPlacementGestures({
    project,
    view,
    zoom,
    commitPlacement,
    removePlacement,
    selectPlacement: onSelectPlacement,
  });

  function buildDropPlacement(event: DragEvent<HTMLElement>, payload: NavigatorDragPayload): ViewPlacement {
    const raw = pointToViewPosition(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      zoom,
      VIEW_PIXELS_PER_MM,
      event.altKey,
      layoutScale,
    );
    const draft: ViewPlacement = {
      id: '__view-drop-preview__',
      sourceType: payload.type,
      sourceId: payload.id,
      xMm: raw.xMm,
      yMm: raw.yMm,
      scale: payload.type === 'device' ? layoutScale : 1,
      labelOverride: null,
    };
    const natural = getPlacementNaturalSize(project, draft);
    const size = {
      widthMm: natural.widthMm * draft.scale,
      heightMm: natural.heightMm * draft.scale,
    };
    const position = event.altKey
      ? clampPlacementPosition(raw, size, page)
      : clampViewLayoutPosition(raw, size, page, layoutScale);
    return { ...draft, ...position };
  }

  function handlePageDragOver(event: DragEvent<HTMLElement>) {
    const payload = readNavigatorDragData(event);
    if (!payload || !sourceExists(payload)) return;
    event.preventDefault();
    const existing = findExistingPlacement(view, payload.type, payload.id);
    setDropPreview({
      placement: buildDropPlacement(event, payload),
      duplicatePlacementId: existing?.id ?? null,
    });
    event.dataTransfer.dropEffect = existing ? 'none' : 'move';
  }

  function handlePageDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const payload = readNavigatorDragData(event);
    if (!payload || !sourceExists(payload)) {
      clearDragState();
      return;
    }
    const existing = findExistingPlacement(view, payload.type, payload.id);
    if (existing) {
      selectExisting(existing);
      clearDragState();
      return;
    }
    const placement = buildDropPlacement(event, payload);
    const id = addViewPlacement(view.id, {
      sourceType: placement.sourceType,
      sourceId: placement.sourceId,
      xMm: placement.xMm,
      yMm: placement.yMm,
      scale: placement.scale,
    });
    onSelectPlacement(id);
    setNotice('Object added to View');
    requestPlacementFocus();
    clearDragState();
  }

  function sourceExists(payload: NavigatorDragPayload) {
    return payload.type === 'device'
      ? project.devices.some((device) => device.id === payload.id)
      : project.racks.some((rack) => rack.id === payload.id);
  }

  function changeDeviceScale(scale: ViewDeviceScale) {
    if (deviceScaleState.kind === 'uniform' && deviceScaleState.scale === scale) return;
    const updated = applyViewDeviceScale(view, scale);
    replaceViewCanvas(view.id, {
      placements: updated.placements,
      lines: updated.lines,
      annotations: updated.annotations,
    });
    setNotice('');
  }

  return {
    project,
    selectedPlacement,
    preview: gestures.preview,
    dropPreview,
    notice,
    deviceScaleState,
    layoutScale,
    focusRequest,
    commitPlacement,
    removePlacement,
    changeDeviceScale,
    selectPlacement: onSelectPlacement,
    beginGesture: gestures.beginGesture,
    updateGesture: gestures.updateGesture,
    finishGesture: gestures.finishGesture,
    cancelGesture: gestures.cancelGesture,
    handlePlacementKeyDown: gestures.handlePlacementKeyDown,
    handlePageDragOver,
    handlePageDrop,
    clearDropPreview: () => setDropPreview(null),
  };
}

export type ViewEditorController = ReturnType<typeof useViewEditorController>;
