import { useCallback, useEffect, useState, type DragEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewPlacement } from '../../domain/types';
import { getPlacementNaturalSize } from '../../domain/viewGeometry';
import { clampViewLayoutPosition, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import {
  clampPlacementPosition,
  findExistingPlacement,
  pointToViewPosition,
} from '../../domain/viewPlacement';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import {
  clearNavigatorDragData,
  readNavigatorDragData,
  type NavigatorDragPayload,
} from '../common/deviceDrag';
import type { ViewDropPreview } from './viewEditorTypes';
import { VIEW_PIXELS_PER_MM } from './viewViewport';

interface ViewDropOptions {
  project: ProjectRoot;
  view: ProjectView;
  zoom: number;
  layoutScale: ViewDeviceScale;
  page: { widthMm: number; heightMm: number };
  addViewPlacement: ProjectContextValue['addViewPlacement'];
  selectPlacement: (id: string | null) => void;
  requestFocus: () => void;
  setNotice: (notice: string) => void;
}

export function useViewDrop(options: ViewDropOptions) {
  const {
    project,
    view,
    zoom,
    layoutScale,
    page,
    addViewPlacement,
    selectPlacement,
    requestFocus,
    setNotice,
  } = options;
  const [dropPreview, setDropPreview] = useState<ViewDropPreview | null>(null);
  const clear = useCallback(() => {
    setDropPreview(null);
    clearNavigatorDragData();
  }, []);

  useEffect(() => clear(), [clear, view.id]);
  useEffect(() => {
    const end = () => clear();
    window.addEventListener('dragend', end);
    return () => {
      window.removeEventListener('dragend', end);
      clear();
    };
  }, [clear]);

  function buildPlacement(event: DragEvent<HTMLElement>, payload: NavigatorDragPayload): ViewPlacement {
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
    const size = { widthMm: natural.widthMm * draft.scale, heightMm: natural.heightMm * draft.scale };
    return {
      ...draft,
      ...(event.altKey
        ? clampPlacementPosition(raw, size, page)
        : clampViewLayoutPosition(raw, size, page, layoutScale)),
    };
  }

  function sourceExists(payload: NavigatorDragPayload) {
    return payload.type === 'device'
      ? project.devices.some((item) => item.id === payload.id)
      : project.racks.some((item) => item.id === payload.id);
  }

  function handlePageDragOver(event: DragEvent<HTMLElement>) {
    const payload = readNavigatorDragData(event);
    if (!payload || !sourceExists(payload)) return;
    event.preventDefault();
    const existing = findExistingPlacement(view, payload.type, payload.id);
    setDropPreview({
      placement: buildPlacement(event, payload),
      duplicatePlacementId: existing?.id ?? null,
    });
    event.dataTransfer.dropEffect = existing ? 'none' : 'move';
  }

  function handlePageDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const payload = readNavigatorDragData(event);
    if (!payload || !sourceExists(payload)) return clear();
    const existing = findExistingPlacement(view, payload.type, payload.id);
    if (existing) {
      selectPlacement(existing.id);
      setNotice('Object is already in this View');
      requestFocus();
      return clear();
    }
    const placement = buildPlacement(event, payload);
    const id = addViewPlacement(view.id, {
      sourceType: placement.sourceType,
      sourceId: placement.sourceId,
      xMm: placement.xMm,
      yMm: placement.yMm,
      scale: placement.scale,
    });
    selectPlacement(id);
    requestFocus();
    clear();
  }

  return {
    dropPreview,
    handlePageDragOver,
    handlePageDrop,
    clearDropPreview: () => setDropPreview(null),
  };
}
