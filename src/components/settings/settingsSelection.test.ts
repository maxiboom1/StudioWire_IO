import { describe, expect, it } from 'vitest';
import { resolveSelectedCategoryId, resolveSelectedGroupId } from './settingsSelection';

describe('settings selection transitions', () => {
  const categories = [{ id: 'category-video' }, { id: 'category-audio' }];
  const groups = [{ id: 'group-video' }, { id: 'group-audio' }];

  it('keeps a valid selected category or falls back to the first current category', () => {
    expect(resolveSelectedCategoryId(categories, 'category-audio')).toBe('category-audio');
    expect(resolveSelectedCategoryId(categories, 'category-missing')).toBe('category-video');
  });

  it('clears category selection when no categories exist', () => {
    expect(resolveSelectedCategoryId([], 'category-audio')).toBe('');
  });

  it('keeps a valid selected group or falls back to the first current group', () => {
    expect(resolveSelectedGroupId(groups, 'group-audio')).toBe('group-audio');
    expect(resolveSelectedGroupId(groups, 'group-missing')).toBe('group-video');
  });

  it('clears group selection when no groups exist', () => {
    expect(resolveSelectedGroupId([], 'group-audio')).toBe('');
  });
});
