import type { Category, ConnectorCompatibilityGroup } from '../../domain/types';

export function resolveSelectedCategoryId(categories: Pick<Category, 'id'>[], currentId: string): string {
  if (currentId && categories.some((category) => category.id === currentId)) {
    return currentId;
  }

  return categories[0]?.id ?? '';
}

export function resolveSelectedGroupId(
  groups: Pick<ConnectorCompatibilityGroup, 'id'>[],
  currentId: string,
): string {
  if (currentId && groups.some((group) => group.id === currentId)) {
    return currentId;
  }

  return groups[0]?.id ?? '';
}
