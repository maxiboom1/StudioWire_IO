const ID_SAFE_PATTERN = /[^a-z0-9]+/g;

export function slugifyIdPart(value: string): string {
  const slug = value.trim().toLowerCase().replace(ID_SAFE_PATTERN, '-').replace(/^-|-$/g, '');

  return slug || 'item';
}

export function makeId(prefix: string, value: string): string {
  return `${slugifyIdPart(prefix)}-${slugifyIdPart(value)}`;
}

export function makeIndexedId(prefix: string, index: number): string {
  return `${slugifyIdPart(prefix)}-${String(index).padStart(4, '0')}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatCableNumber(prefix: string, index: number, padding = 4): string {
  return `${prefix}-${String(index).padStart(padding, '0')}`;
}
