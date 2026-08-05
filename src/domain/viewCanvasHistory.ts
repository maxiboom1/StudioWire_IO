import type { ProjectView } from './types';

export type ViewCanvasSnapshot = Pick<ProjectView, 'placements' | 'lines' | 'annotations'>;

export interface ViewCanvasHistoryState {
  past: ViewCanvasSnapshot[];
  future: ViewCanvasSnapshot[];
}

export const VIEW_CANVAS_HISTORY_LIMIT = 50;

export function createViewCanvasSnapshot(view: ProjectView): ViewCanvasSnapshot {
  return {
    placements: view.placements,
    lines: view.lines,
    annotations: view.annotations,
  };
}

export function createEmptyViewCanvasHistory(): ViewCanvasHistoryState {
  return { past: [], future: [] };
}

export function getViewCanvasSignature(canvas: ViewCanvasSnapshot): string {
  return JSON.stringify(canvas);
}

export function pushViewCanvasHistory(
  history: ViewCanvasHistoryState,
  previous: ViewCanvasSnapshot,
  next: ViewCanvasSnapshot,
): ViewCanvasHistoryState {
  if (getViewCanvasSignature(previous) === getViewCanvasSignature(next)) return history;
  return {
    past: [...history.past, previous].slice(-VIEW_CANVAS_HISTORY_LIMIT),
    future: [],
  };
}

export function undoViewCanvasHistory(
  history: ViewCanvasHistoryState,
  current: ViewCanvasSnapshot,
): { history: ViewCanvasHistoryState; snapshot: ViewCanvasSnapshot } | null {
  const snapshot = history.past.at(-1);
  if (!snapshot) return null;
  return {
    snapshot,
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future],
    },
  };
}

export function redoViewCanvasHistory(
  history: ViewCanvasHistoryState,
  current: ViewCanvasSnapshot,
): { history: ViewCanvasHistoryState; snapshot: ViewCanvasSnapshot } | null {
  const [snapshot, ...future] = history.future;
  if (!snapshot) return null;
  return {
    snapshot,
    history: {
      past: [...history.past, current].slice(-VIEW_CANVAS_HISTORY_LIMIT),
      future,
    },
  };
}
