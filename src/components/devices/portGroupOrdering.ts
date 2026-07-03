export function reorderById<T>(
  items: T[],
  activeId: string,
  targetId: string,
  getId: (item: T) => string,
): T[] {
  if (activeId === targetId) {
    return items;
  }

  const fromIndex = items.findIndex((item) => getId(item) === activeId);
  const toIndex = items.findIndex((item) => getId(item) === targetId);

  if (fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);

  next.splice(toIndex, 0, moved);

  return next;
}

export function moveByOffset<T>(
  items: T[],
  activeId: string,
  offset: -1 | 1,
  getId: (item: T) => string,
): T[] {
  const fromIndex = items.findIndex((item) => getId(item) === activeId);
  const toIndex = fromIndex + offset;

  if (fromIndex < 0 || toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);

  next.splice(toIndex, 0, moved);

  return next;
}
