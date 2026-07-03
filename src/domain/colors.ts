export const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const normalized = withHash.toUpperCase();

  return HEX_COLOR_PATTERN.test(normalized) ? normalized : null;
}

export function isHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.toUpperCase());
}
