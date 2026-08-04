import { importProjectJsonText, type ProjectImportResult } from '../domain/projectImport';
import type { ProjectRoot } from '../domain/types';

export const ACTIVE_STORAGE_KEY = 'studiowire.io.project.current';
export const LEGACY_STORAGE_KEYS = [
  'studiowire.io.project.v0.2.7',
  'studiowire.io.project.v0.2.6',
  'studiowire.io.project.v0.2.5',
  'studiowire.io.project.v0.1',
] as const;

export const STORAGE_RECOVERY_KEYS = [ACTIVE_STORAGE_KEY, ...LEGACY_STORAGE_KEYS] as const;

export interface BrowserStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageAccessResult = { ok: true; storage: BrowserStorageLike } | { ok: false; message: string };

export interface StorageRecoveryResult {
  project: ProjectRoot | null;
  key: string | null;
  errors: Array<{ key: string; message: string }>;
  removedViewLineCount: number;
}

export function getBrowserStorage(): StorageAccessResult {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ok: false, message: 'Local storage is unavailable.' };
    }

    return { ok: true, storage: window.localStorage };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Local storage is inaccessible.',
    };
  }
}

export function restoreStoredProject(storage: BrowserStorageLike): StorageRecoveryResult {
  const errors: Array<{ key: string; message: string }> = [];

  for (const key of STORAGE_RECOVERY_KEYS) {
    const readResult = safeGetItem(storage, key);

    if (!readResult.ok) {
      errors.push({ key, message: readResult.message });
      continue;
    }

    if (!readResult.value) {
      continue;
    }

    const importResult = importProjectJsonText(readResult.value);

    if (importResult.ok) {
      return {
        project: importResult.project,
        key,
        errors,
        removedViewLineCount: importResult.removedViewLineCount,
      };
    }

    errors.push({ key, message: importResult.error });
    safeRemoveItem(storage, key);
  }

  return { project: null, key: null, errors, removedViewLineCount: 0 };
}

export function saveStoredProject(
  storage: BrowserStorageLike,
  project: ProjectRoot,
): { ok: true } | { ok: false; message: string } {
  return safeSetItem(storage, ACTIVE_STORAGE_KEY, JSON.stringify(project));
}

export function removeStoredProject(
  storage: BrowserStorageLike,
  key: string,
): { ok: true } | { ok: false; message: string } {
  return safeRemoveItem(storage, key);
}

export function isSuccessfulImport(
  result: ProjectImportResult,
): result is Extract<ProjectImportResult, { ok: true }> {
  return result.ok;
}

function safeGetItem(
  storage: BrowserStorageLike,
  key: string,
): { ok: true; value: string | null } | { ok: false; message: string } {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Storage read failed.' };
  }
}

function safeSetItem(
  storage: BrowserStorageLike,
  key: string,
  value: string,
): { ok: true } | { ok: false; message: string } {
  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Storage write failed.' };
  }
}

function safeRemoveItem(
  storage: BrowserStorageLike,
  key: string,
): { ok: true } | { ok: false; message: string } {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Storage cleanup failed.' };
  }
}
