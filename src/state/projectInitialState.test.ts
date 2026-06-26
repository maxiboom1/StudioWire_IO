import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import { STUDIOWIRE_CURRENT_VERSION } from '../domain/version';
import { ACTIVE_STORAGE_KEY, type BrowserStorageLike } from './projectStorage';
import { loadInitialProjectState } from './projectInitialState';
import type { ProjectState } from './projectTypes';

class MemoryStorage implements BrowserStorageLike {
  values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function emptyState(): ProjectState {
  return {
    project: { ...structuredClone(sampleProject), project: { ...sampleProject.project, name: 'Empty' } },
    statusMessage: 'New project ready',
    importError: null,
    persistenceState: 'unsaved',
  };
}

describe('initial project state restore', () => {
  it('returns an empty state when storage is unavailable', () => {
    const state = loadInitialProjectState({
      getStorage: () => ({ ok: false, message: 'blocked' }),
      restoreProject: () => {
        throw new Error('should not restore');
      },
      createEmptyState: emptyState,
    });

    expect(state.project.project.name).toBe('Empty');
    expect(state.persistenceState).toBe('unsaved');
  });

  it('returns an empty state when no storage record is valid', () => {
    const state = loadInitialProjectState({
      getStorage: () => ({ ok: true, storage: new MemoryStorage() }),
      restoreProject: () => ({ project: null, key: null, errors: [] }),
      createEmptyState: emptyState,
    });

    expect(state.project.project.name).toBe('Empty');
  });

  it('restores a current record with the preserved status message', () => {
    const storage = new MemoryStorage();
    const project = structuredClone(sampleProject);
    storage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(project));
    const state = loadInitialProjectState({
      getStorage: () => ({ ok: true, storage }),
      restoreProject: () => ({ project, key: ACTIVE_STORAGE_KEY, errors: [] }),
      createEmptyState: emptyState,
    });

    expect(state.project).toBe(project);
    expect(state.statusMessage).toBe(`Project restored from ${ACTIVE_STORAGE_KEY}`);
    expect(state.persistenceState).toBe('saved');
  });

  it('restores a fallback legacy record migrated by the canonical storage service', () => {
    const storage = new MemoryStorage();
    const legacyProject = structuredClone(sampleProject) as any;
    legacyProject.schemaVersion = '0.2.8.3';
    const migratedProject = { ...structuredClone(sampleProject), schemaVersion: STUDIOWIRE_CURRENT_VERSION };

    const state = loadInitialProjectState({
      getStorage: () => ({ ok: true, storage }),
      restoreProject: () => ({
        project: migratedProject,
        key: 'studiowire.io.project.v0.2.7',
        errors: [{ key: ACTIVE_STORAGE_KEY, message: 'bad current' }],
      }),
      createEmptyState: emptyState,
    });

    expect(state.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
    expect(state.statusMessage).toBe('Project restored from studiowire.io.project.v0.2.7');
  });
});
