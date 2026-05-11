const ID_SAFE_PATTERN = /[^a-z0-9]+/g;

export function slugifyIdPart(value: string): string {
  const slug = value.trim().toLowerCase().replace(ID_SAFE_PATTERN, '-').replace(/^-|-$/g, '');

  return slug || 'item';
}

export function makeId(prefix: string, value: string): string {
  return `${slugifyIdPart(prefix)}-${slugifyIdPart(value)}`;
}

export function makeUniqueId(prefix: string, value: string): string {
  return `${makeId(prefix, value)}-${createRandomSuffix()}`;
}

export function makeIndexedId(prefix: string, index: number): string {
  return `${slugifyIdPart(prefix)}-${String(index).padStart(4, '0')}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function createRandomSuffix(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return randomUuid.slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}
