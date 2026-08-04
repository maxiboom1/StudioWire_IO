import { findViewNameConflict } from '../../domain/viewOperations';
import type { ProjectRoot, ProjectView, ViewOrientation, ViewPageSize } from '../../domain/types';

export interface ViewFormValues {
  name: string;
  description: string;
  pageSize: ViewPageSize;
  orientation: ViewOrientation;
}

export function createViewFormValues(view?: ProjectView): ViewFormValues {
  return {
    name: view?.name ?? '',
    description: view?.description ?? '',
    pageSize: view?.pageSize ?? 'a3',
    orientation: view?.orientation ?? 'portrait',
  };
}

export function getNextViewName(views: ProjectView[]): string {
  const usedNames = new Set(views.map((view) => view.name.trim().toLowerCase()));
  let index = 1;

  while (usedNames.has(`view ${index}`)) {
    index += 1;
  }

  return `View ${index}`;
}

export function getViewNameError(project: ProjectRoot, name: string, excludedViewId?: string): string | null {
  if (!name.trim()) {
    return 'View name is required.';
  }

  const conflict = findViewNameConflict(project, name, excludedViewId);
  return conflict ? `View name "${conflict.name}" is already used.` : null;
}

export function formatViewPageMeta(view: Pick<ProjectView, 'pageSize' | 'orientation'>): string {
  return `${view.pageSize.toUpperCase()} · ${capitalize(view.orientation)}`;
}

export function isViewPopulated(view: ProjectView): boolean {
  return view.placements.length + view.lines.length + view.annotations.length > 0;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
