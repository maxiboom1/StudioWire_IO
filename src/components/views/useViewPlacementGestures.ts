import { useEffect, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewPlacement } from '../../domain/types';
import { getPlacementNaturalSize } from '../../domain/viewGeometry';
import {
  clampViewLayoutPosition,
  getViewLayoutScale,
  moveViewLayoutPosition,
  snapViewLayoutPosition,
} from '../../domain/viewLayoutGrid';
import { clampPlacementPosition, getPlacementPage } from '../../domain/viewPlacement';
import type { ViewPlacementUpdates } from '../../state/projectContextTypes';
import type { ViewPlacementPreview } from './viewEditorTypes';
import { VIEW_PIXELS_PER_MM } from './viewViewport';

interface GestureDraft {
  placement: ViewPlacement;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  preview: ViewPlacementPreview;
}

export function useViewPlacementGestures({
  project,
  view,
  zoom,
  commitPlacement,
  removePlacement,
  selectPlacement,
}: {
  project: ProjectRoot;
  view: ProjectView;
  zoom: number;
  commitPlacement: (placementId: string, updates: ViewPlacementUpdates) => void;
  removePlacement: (placementId: string) => void;
  selectPlacement: (placementId: string | null) => void;
}) {
  const [gesture, setGesture] = useState<GestureDraft | null>(null);
  const page = getPlacementPage(project, view);
  const layoutScale = getViewLayoutScale(view);

  useEffect(() => setGesture(null), [view.id]);
  useEffect(() => {
    if (!gesture) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setGesture(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [gesture]);

  function beginGesture(event: PointerEvent<HTMLElement>, placement: ViewPlacement) {
    if (event.button !== 0 && event.button !== undefined) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.closest<HTMLElement>('[data-view-placement-id]')?.focus();
    selectPlacement(placement.id);
    setGesture({
      placement,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      preview: {
        placementId: placement.id,
        xMm: placement.xMm,
        yMm: placement.yMm,
        scale: placement.scale,
      },
    });
  }

  function updateGesture(event: PointerEvent<HTMLElement>) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const deltaX = (event.clientX - gesture.startClientX) / zoom / VIEW_PIXELS_PER_MM;
    const deltaY = (event.clientY - gesture.startClientY) / zoom / VIEW_PIXELS_PER_MM;
    const position = {
      xMm: gesture.placement.xMm + deltaX,
      yMm: gesture.placement.yMm + deltaY,
    };
    const preview = event.altKey ? position : snapViewLayoutPosition(position, layoutScale);
    setGesture({
      ...gesture,
      preview: {
        placementId: gesture.placement.id,
        xMm: preview.xMm,
        yMm: preview.yMm,
        scale: gesture.placement.scale,
      },
    });
  }

  function finishGesture(event: PointerEvent<HTMLElement>) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;

    const position = { xMm: gesture.preview.xMm, yMm: gesture.preview.yMm };
    const natural = getPlacementNaturalSize(project, gesture.placement);
    const size = {
      widthMm: natural.widthMm * gesture.placement.scale,
      heightMm: natural.heightMm * gesture.placement.scale,
    };
    const clamped = event.altKey
      ? clampPlacementPosition(position, size, page)
      : clampViewLayoutPosition(position, size, page, layoutScale);
    if (clamped.xMm !== gesture.placement.xMm || clamped.yMm !== gesture.placement.yMm) {
      commitPlacement(gesture.placement.id, clamped);
    }
    setGesture(null);
  }

  function handlePlacementKeyDown(event: KeyboardEvent<HTMLElement>, placement: ViewPlacement) {
    if (event.key === 'Delete') {
      event.preventDefault();
      removePlacement(placement.id);
      return;
    }
    if (event.key === 'Escape' && gesture) {
      event.preventDefault();
      setGesture(null);
      return;
    }

    let direction: readonly [number, number] | undefined;
    if (event.key === 'ArrowLeft') direction = [-1, 0];
    if (event.key === 'ArrowRight') direction = [1, 0];
    if (event.key === 'ArrowUp') direction = [0, -1];
    if (event.key === 'ArrowDown') direction = [0, 1];
    if (!direction) return;

    event.preventDefault();
    const natural = getPlacementNaturalSize(project, placement);
    const size = {
      widthMm: natural.widthMm * placement.scale,
      heightMm: natural.heightMm * placement.scale,
    };
    commitPlacement(
      placement.id,
      clampViewLayoutPosition(
        moveViewLayoutPosition(placement, direction, layoutScale, event.shiftKey ? 5 : 1),
        size,
        page,
        layoutScale,
      ),
    );
  }

  return {
    preview: gesture?.preview ?? null,
    beginGesture,
    updateGesture,
    finishGesture,
    cancelGesture: () => setGesture(null),
    handlePlacementKeyDown,
  };
}
