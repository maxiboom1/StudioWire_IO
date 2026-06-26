import { useEffect, useRef } from 'react';
import type { ProjectRoot } from '../domain/types';
import {
  createWindowTimerApi,
  scheduleProjectAutosave,
  type AutosaveResult,
  type TimerApi,
} from './projectAutosave';
import type { ProjectDispatch } from './projectCommands';
import { getBrowserStorage, type BrowserStorageLike } from './projectStorage';

export interface ProjectAutosaveDependencies {
  dispatch: ProjectDispatch;
  getStorage: typeof getBrowserStorage;
  scheduleAutosave: typeof scheduleProjectAutosave;
  timers: TimerApi;
}

export const defaultProjectAutosaveServices = {
  getStorage: getBrowserStorage,
  scheduleAutosave: scheduleProjectAutosave,
  createTimers: createWindowTimerApi,
};

export function useProjectAutosave(project: ProjectRoot, dispatch: ProjectDispatch): void {
  const controllerRef = useRef<ProjectAutosaveController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createProjectAutosaveController({
      dispatch,
      getStorage: defaultProjectAutosaveServices.getStorage,
      scheduleAutosave: defaultProjectAutosaveServices.scheduleAutosave,
      timers: defaultProjectAutosaveServices.createTimers(),
    });
  }

  useEffect(() => {
    controllerRef.current?.initializeStorage();
  }, []);

  useEffect(() => controllerRef.current?.scheduleProject(project), [project]);
}

export interface ProjectAutosaveController {
  initializeStorage: () => void;
  scheduleProject: (project: ProjectRoot) => () => void;
}

export function createProjectAutosaveController(
  dependencies: ProjectAutosaveDependencies,
): ProjectAutosaveController {
  let storage: BrowserStorageLike | null = null;
  let storageInitialized = false;
  let activeSaveId = 0;

  return {
    initializeStorage: () => {
      if (storageInitialized) {
        return;
      }

      storageInitialized = true;
      const storageResult = dependencies.getStorage();

      if (storageResult.ok) {
        storage = storageResult.storage;
        return;
      }

      dependencies.dispatch({
        type: 'SET_PERSISTENCE_STATE',
        payload: {
          persistenceState: 'failed',
          message: `Autosave unavailable: ${storageResult.message}`,
        },
      });
    },
    scheduleProject: (project) => {
      if (!storage) {
        return () => undefined;
      }

      const saveId = ++activeSaveId;

      dependencies.dispatch({ type: 'SET_PERSISTENCE_STATE', payload: { persistenceState: 'saving' } });
      const cancel = dependencies.scheduleAutosave({
        storage,
        project,
        timers: dependencies.timers,
        onComplete: (result) => {
          if (saveId !== activeSaveId) {
            return;
          }

          dependencies.dispatch({
            type: 'SET_PERSISTENCE_STATE',
            payload: formatAutosaveResult(result),
          });
        },
      });

      return () => {
        activeSaveId++;
        cancel();
      };
    },
  };
}

function formatAutosaveResult(result: AutosaveResult) {
  return result.ok
    ? { persistenceState: 'saved' as const, message: 'Project autosaved' }
    : { persistenceState: 'failed' as const, message: `Autosave failed: ${result.message}` };
}
