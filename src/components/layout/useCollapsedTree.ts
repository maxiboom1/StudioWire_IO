import { useState } from 'react';

export function toggleCollapsedKey(current: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(current);

  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }

  return next;
}

export function isTreeKeyOpen(collapsedKeys: ReadonlySet<string>, key: string): boolean {
  return !collapsedKeys.has(key);
}

export function useCollapsedTree() {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set());

  function toggle(key: string) {
    setCollapsedKeys((current) => toggleCollapsedKey(current, key));
  }

  return {
    collapsedKeys,
    isOpen: (key: string) => isTreeKeyOpen(collapsedKeys, key),
    toggle,
  };
}
