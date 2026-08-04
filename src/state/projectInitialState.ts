import { createInitialProjectState } from './projectReducer';
import { getBrowserStorage, restoreStoredProject, type BrowserStorageLike } from './projectStorage';
import type { ProjectState } from './projectTypes';

export interface ProjectInitialStateDependencies {
  getStorage: typeof getBrowserStorage;
  restoreProject: typeof restoreStoredProject;
  createEmptyState: () => ProjectState;
}

export const defaultProjectInitialStateDependencies: ProjectInitialStateDependencies = {
  getStorage: getBrowserStorage,
  restoreProject: restoreStoredProject,
  createEmptyState: createInitialProjectState,
};

export function loadInitialProjectState(
  dependencies: ProjectInitialStateDependencies = defaultProjectInitialStateDependencies,
): ProjectState {
  const storageResult = dependencies.getStorage();

  if (!storageResult.ok) {
    return dependencies.createEmptyState();
  }

  return restoreProjectState(storageResult.storage, dependencies);
}

export function restoreProjectState(
  storage: BrowserStorageLike,
  dependencies: Pick<
    ProjectInitialStateDependencies,
    'restoreProject' | 'createEmptyState'
  > = defaultProjectInitialStateDependencies,
): ProjectState {
  const result = dependencies.restoreProject(storage);

  if (result.project) {
    return {
      project: result.project,
      statusMessage:
        result.removedViewLineCount > 0
          ? `Project restored from ${result.key}; removed ${result.removedViewLineCount} legacy View line(s)`
          : `Project restored from ${result.key}`,
      importError: null,
      persistenceState: 'saved',
    };
  }

  return dependencies.createEmptyState();
}
