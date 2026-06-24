import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import { scheduleProjectAutosave, type TimerApi } from './projectAutosave';
import type { BrowserStorageLike } from './projectStorage';

class MemoryStorage implements BrowserStorageLike {
  values = new Map<string, string>();

  constructor(private readonly failWrites = false) {}

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error('quota exceeded');
    }

    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function createManualTimers() {
  let callback: (() => void) | null = null;
  const timers: TimerApi = {
    setTimeout: (nextCallback) => {
      callback = nextCallback;
      return 1;
    },
    clearTimeout: () => {
      callback = null;
    },
  };

  return {
    timers,
    flush: () => callback?.(),
    hasPendingTimer: () => callback !== null,
  };
}

describe('project autosave scheduler', () => {
  it('delays writes until the timer fires and supports deterministic cleanup', () => {
    const storage = new MemoryStorage();
    const manualTimers = createManualTimers();
    const results: Array<{ ok: boolean }> = [];

    const cancel = scheduleProjectAutosave({
      storage,
      project: structuredClone(sampleProject),
      timers: manualTimers.timers,
      onComplete: (result) => results.push(result),
    });

    expect(storage.values.size).toBe(0);
    expect(manualTimers.hasPendingTimer()).toBe(true);
    cancel();
    expect(manualTimers.hasPendingTimer()).toBe(false);
    manualTimers.flush();
    expect(results).toEqual([]);
  });

  it('reports failed writes without claiming success', () => {
    const manualTimers = createManualTimers();
    const results: Array<{ ok: boolean; message?: string }> = [];

    scheduleProjectAutosave({
      storage: new MemoryStorage(true),
      project: structuredClone(sampleProject),
      timers: manualTimers.timers,
      onComplete: (result) => results.push(result),
    });
    manualTimers.flush();

    expect(results).toEqual([{ ok: false, message: 'quota exceeded' }]);
  });
});
