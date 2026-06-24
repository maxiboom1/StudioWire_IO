import type { ProjectRoot } from '../domain/types';
import { saveStoredProject, type BrowserStorageLike } from './projectStorage';

export interface TimerApi {
  setTimeout(callback: () => void, delayMs: number): TimerHandle;
  clearTimeout(timer: TimerHandle): void;
}

export type TimerHandle = number | ReturnType<typeof setTimeout>;
export type AutosaveResult = ReturnType<typeof saveStoredProject>;

export function createWindowTimerApi(): TimerApi {
  return {
    setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimeout: (timer) => window.clearTimeout(Number(timer)),
  };
}

export function scheduleProjectAutosave({
  storage,
  project,
  timers,
  delayMs = 350,
  onComplete,
}: {
  storage: BrowserStorageLike;
  project: ProjectRoot;
  timers: TimerApi;
  delayMs?: number;
  onComplete: (result: AutosaveResult) => void;
}): () => void {
  const timer = timers.setTimeout(() => {
    onComplete(saveStoredProject(storage, project));
  }, delayMs);

  return () => timers.clearTimeout(timer);
}
