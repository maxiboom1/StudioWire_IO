import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import type { ProjectRoot } from '../domain/types';
import type { ProjectAction } from './projectTypes';
import { createProjectAutosaveController } from './useProjectAutosave';

function createHarness() {
  const actions: ProjectAction[] = [];
  const scheduled: Array<{
    project: ProjectRoot;
    onComplete: (result: { ok: true } | { ok: false; message: string }) => void;
    canceled: boolean;
  }> = [];
  const controller = createProjectAutosaveController({
    dispatch: (action) => actions.push(action),
    getStorage: () => ({
      ok: true,
      storage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    }),
    timers: {
      setTimeout: () => 1,
      clearTimeout: () => undefined,
    },
    scheduleAutosave: ({ project, onComplete }) => {
      const entry = { project, onComplete, canceled: false };
      scheduled.push(entry);
      return () => {
        entry.canceled = true;
      };
    },
  });

  return { actions, controller, scheduled };
}

describe('project autosave lifecycle controller', () => {
  it('reports unavailable storage without scheduling autosave', () => {
    const actions: ProjectAction[] = [];
    const controller = createProjectAutosaveController({
      dispatch: (action) => actions.push(action),
      getStorage: () => ({ ok: false, message: 'blocked' }),
      timers: {
        setTimeout: () => 1,
        clearTimeout: () => undefined,
      },
      scheduleAutosave: () => {
        throw new Error('should not schedule');
      },
    });

    controller.initializeStorage();
    controller.scheduleProject(structuredClone(sampleProject));

    expect(actions).toEqual([
      {
        type: 'SET_PERSISTENCE_STATE',
        payload: { persistenceState: 'failed', message: 'Autosave unavailable: blocked' },
      },
    ]);
  });

  it('dispatches saving and saved for a successful write', () => {
    const { actions, controller, scheduled } = createHarness();

    controller.initializeStorage();
    controller.scheduleProject(structuredClone(sampleProject));
    scheduled[0].onComplete({ ok: true });

    expect(actions).toEqual([
      { type: 'SET_PERSISTENCE_STATE', payload: { persistenceState: 'saving' } },
      {
        type: 'SET_PERSISTENCE_STATE',
        payload: { persistenceState: 'saved', message: 'Project autosaved' },
      },
    ]);
  });

  it('dispatches failed for a failed write and does not mark it saved later', () => {
    const { actions, controller, scheduled } = createHarness();

    controller.initializeStorage();
    controller.scheduleProject(structuredClone(sampleProject));
    scheduled[0].onComplete({ ok: false, message: 'quota' });

    expect(actions.at(-1)).toEqual({
      type: 'SET_PERSISTENCE_STATE',
      payload: { persistenceState: 'failed', message: 'Autosave failed: quota' },
    });
  });

  it('coalesces rapid changes by cancelling and ignoring stale saves', () => {
    const { actions, controller, scheduled } = createHarness();
    const first = structuredClone(sampleProject);
    const latest = {
      ...structuredClone(sampleProject),
      project: { ...sampleProject.project, name: 'Latest' },
    };

    controller.initializeStorage();
    const cancelFirst = controller.scheduleProject(first);
    cancelFirst();
    controller.scheduleProject(latest);
    scheduled[0].onComplete({ ok: true });
    scheduled[1].onComplete({ ok: true });

    expect(scheduled[0].canceled).toBe(true);
    expect(scheduled[1].project.project.name).toBe('Latest');
    expect(
      actions.filter(
        (action) => action.type === 'SET_PERSISTENCE_STATE' && action.payload.persistenceState === 'saved',
      ),
    ).toHaveLength(1);
  });

  it('cancels pending work on unmount cleanup', () => {
    const { controller, scheduled } = createHarness();

    controller.initializeStorage();
    const cancel = controller.scheduleProject(structuredClone(sampleProject));
    cancel();

    expect(scheduled[0].canceled).toBe(true);
  });
});
