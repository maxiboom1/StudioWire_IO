import { describe, expect, it } from 'vitest';
import { makeId, makeUniqueId } from './id';

describe('makeId', () => {
  it('keeps deterministic IDs for stable generated objects', () => {
    expect(makeId('cable', 'V-0001')).toBe('cable-v-0001');
    expect(makeId('cable', 'V-0001')).toBe('cable-v-0001');
  });
});

describe('makeUniqueId', () => {
  it('adds a random suffix for user-created objects with the same name', () => {
    const first = makeUniqueId('device', 'Router');
    const second = makeUniqueId('device', 'Router');

    expect(first).toMatch(/^device-router-[a-z0-9-]+$/);
    expect(second).toMatch(/^device-router-[a-z0-9-]+$/);
    expect(first).not.toBe(second);
  });
});
