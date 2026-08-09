import { describe, expect, it } from 'vitest';
import type { ProjectView } from './types';
import {
  createEmptyViewCanvasHistory,
  createViewCanvasSnapshot,
  pushViewCanvasHistory,
  redoViewCanvasHistory,
  undoViewCanvasHistory,
  VIEW_CANVAS_HISTORY_LIMIT,
} from './viewCanvasHistory';

function view(xMm: number): ProjectView {
  return {
    id: 'view',
    name: 'View',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [
      {
        id: 'placement',
        sourceType: 'device',
        sourceId: 'device',
        xMm,
        yMm: 10,
        scale: 1,
        labelOverride: null,
      },
    ],
    lines: [],
    annotations: [],
  };
}

describe('View canvas history', () => {
  it('ignores no-ops, invalidates redo, and keeps the latest 50 snapshots', () => {
    let history = createEmptyViewCanvasHistory();
    history = pushViewCanvasHistory(
      history,
      createViewCanvasSnapshot(view(0)),
      createViewCanvasSnapshot(view(0)),
    );
    expect(history.past).toHaveLength(0);

    for (let index = 0; index < VIEW_CANVAS_HISTORY_LIMIT + 4; index += 1) {
      history = pushViewCanvasHistory(
        history,
        createViewCanvasSnapshot(view(index)),
        createViewCanvasSnapshot(view(index + 1)),
      );
    }
    expect(history.past).toHaveLength(VIEW_CANVAS_HISTORY_LIMIT);
    expect(history.past[0].placements[0].xMm).toBe(4);

    const undone = undoViewCanvasHistory(history, createViewCanvasSnapshot(view(54)))!;
    expect(undone.snapshot.placements[0].xMm).toBe(53);
    expect(undone.history.future).toHaveLength(1);
    const edited = pushViewCanvasHistory(undone.history, undone.snapshot, createViewCanvasSnapshot(view(70)));
    expect(edited.future).toHaveLength(0);
  });

  it('moves snapshots transactionally between past and future', () => {
    const first = createViewCanvasSnapshot(view(10));
    const second = createViewCanvasSnapshot(view(20));
    const history = pushViewCanvasHistory(createEmptyViewCanvasHistory(), first, second);
    const undo = undoViewCanvasHistory(history, second)!;
    expect(undo.snapshot).toBe(first);
    const redo = redoViewCanvasHistory(undo.history, first)!;
    expect(redo.snapshot).toBe(second);
    expect(redo.history.future).toHaveLength(0);
  });
});
