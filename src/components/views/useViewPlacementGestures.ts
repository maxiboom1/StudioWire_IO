import { useEffect, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ProjectRoot, ProjectView, ViewPlacement } from '../../domain/types';
import { getPlacementNaturalSize } from '../../domain/viewGeometry';
import { clampPlacementPosition, getPlacementPage, snapViewPosition } from '../../domain/viewPlacement';
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
    setGesture({
      ...gesture,
      preview: {
        placementId: gesture.placement.id,
        xMm: gesture.placement.xMm + deltaX,
        yMm: gesture.placement.yMm + deltaY,
        scale: gesture.placement.scale,
      },
    });
  }

  function finishGesture(event: PointerEvent<HTMLElement>) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;

    const position = event.altKey
      ? { xMm: gesture.preview.xMm, yMm: gesture.preview.yMm }
      : snapViewPosition(gesture.preview);
    const natural = getPlacementNaturalSize(project, gesture.placement);
    const clamped = clampPlacementPosition(
      position,
      {
        widthMm: natural.widthMm * gesture.placement.scale,
        heightMm: natural.heightMm * gesture.placement.scale,
      },
      page,
    );
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

    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction) return;

    event.preventDefault();
    const amount = event.shiftKey ? 10 : 2.5;
    const natural = getPlacementNaturalSize(project, placement);
    commitPlacement(
      placement.id,
      clampPlacementPosition(
        {
          xMm: placement.xMm + direction[0] * amount,
          yMm: placement.yMm + direction[1] * amount,
        },
        {
          widthMm: natural.widthMm * placement.scale,
          heightMm: natural.heightMm * placement.scale,
        },
        page,
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
