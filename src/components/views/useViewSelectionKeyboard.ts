import { useEffect } from 'react';
import type { ProjectRoot, ProjectView } from '../../domain/types';
import { getViewLayoutMetrics, type ViewDeviceScale } from '../../domain/viewLayoutGrid';
import {
  clampViewSelectionDelta,
  translateViewMovableElements,
  type ViewMovableSelection,
} from '../../domain/viewSelection';
import type { ViewEditorTool } from './viewEditorTypes';

export function useViewSelectionKeyboard({
  tool,
  selection,
  project,
  view,
  page,
  layoutScale,
  commitView,
  removeSelected,
}: {
  tool: ViewEditorTool;
  selection: ViewMovableSelection | null;
  project: ProjectRoot;
  view: ProjectView;
  page: { widthMm: number; heightMm: number };
  layoutScale: ViewDeviceScale;
  commitView: (view: ProjectView) => void;
  removeSelected: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (
        tool !== 'select' ||
        !selection ||
        isEditingTarget(event.target) ||
        !isCanvasKeyboardTarget(event.target)
      )
        return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeSelected();
        return;
      }
      const direction = arrowDirection(event.key);
      if (!direction) return;
      event.preventDefault();
      const pitch = getViewLayoutMetrics(layoutScale).rowPitchMm * (event.shiftKey ? 5 : 1);
      const delta = clampViewSelectionDelta(
        project,
        view,
        selection.items,
        { xMm: direction[0] * pitch, yMm: direction[1] * pitch },
        page,
      );
      if (delta.xMm || delta.yMm) commitView(translateViewMovableElements(view, selection.items, delta));
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [commitView, layoutScale, page, project, removeSelected, selection, tool, view]);
}

function isCanvasKeyboardTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('.view-page'));
}

function arrowDirection(key: string): readonly [number, number] | null {
  if (key === 'ArrowLeft') return [-1, 0];
  if (key === 'ArrowRight') return [1, 0];
  if (key === 'ArrowUp') return [0, -1];
  if (key === 'ArrowDown') return [0, 1];
  return null;
}

function isEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
