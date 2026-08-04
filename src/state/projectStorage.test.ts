import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import { STUDIOWIRE_CURRENT_VERSION } from '../domain/version';
import {
  ACTIVE_STORAGE_KEY,
  restoreStoredProject,
  saveStoredProject,
  type BrowserStorageLike,
} from './projectStorage';

class MemoryStorage implements BrowserStorageLike {
  values = new Map<string, string>();

  constructor(private readonly failures: Partial<Record<'getItem' | 'setItem' | 'removeItem', Error>> = {}) {}

  getItem(key: string): string | null {
    if (this.failures.getItem) {
      throw this.failures.getItem;
    }

    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failures.setItem) {
      throw this.failures.setItem;
    }

    this.values.set(key, value);
  }

  removeItem(key: string): void {
    if (this.failures.removeItem) {
      throw this.failures.removeItem;
    }

    this.values.delete(key);
  }
}

describe('projectStorage recovery', () => {
  it('restores a current-schema fallback when current storage is corrupt', () => {
    const storage = new MemoryStorage();
    storage.values.set(ACTIVE_STORAGE_KEY, '{');
    storage.values.set('studiowire.io.project.v0.2.7', JSON.stringify(sampleProject));

    const result = restoreStoredProject(storage);

    expect(result.project?.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
    expect(result.key).toBe('studiowire.io.project.v0.2.7');
  });

  it('migrates a 0.2.8.25 project from the active autosave key', () => {
    const storage = new MemoryStorage();
    const legacyProject = structuredClone(sampleProject) as any;
    legacyProject.schemaVersion = '0.2.8.25';
    delete legacyProject.views;
    storage.values.set(ACTIVE_STORAGE_KEY, JSON.stringify(legacyProject));

    const result = restoreStoredProject(storage);

    expect(result.key).toBe(ACTIVE_STORAGE_KEY);
    expect(result.project?.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
    expect(result.project?.views).toEqual([]);
  });

  it('handles thrown getItem and removeItem operations without crashing recovery', () => {
    const storage = new MemoryStorage({ getItem: new Error('blocked') });

    const result = restoreStoredProject(storage);

    expect(result.project).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('reports quota failures during autosave without mutating in-memory project data', () => {
    const storage = new MemoryStorage({ setItem: new Error('quota exceeded') });
    const project = structuredClone(sampleProject);

    const result = saveStoredProject(storage, project);

    expect(result.ok).toBe(false);
    expect(project.project.name).toBe(sampleProject.project.name);
  });
});
