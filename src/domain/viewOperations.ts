import { VIEW_PLACEMENT_MAX_SCALE, VIEW_PLACEMENT_MIN_SCALE } from './viewGeometry';
import type {
  ProjectRoot,
  ProjectView,
  ViewAnnotation,
  ViewLine,
  ViewOrientation,
  ViewPageSize,
  ViewPlacement,
  ViewSourceType,
} from './types';

export interface ProjectViewInput {
  id: string;
  name: string;
  description?: string;
  pageSize?: ViewPageSize;
  orientation?: ViewOrientation;
}

export interface ViewPlacementInput extends Omit<ViewPlacement, 'labelOverride' | 'scale'> {
  scale?: number;
  labelOverride?: string | null;
}

export interface ViewSourceImpact {
  viewId: string;
  viewName: string;
  placementCount: number;
  attachedLineCount: number;
}

export type ViewOperationResult = { ok: true; project: ProjectRoot } | { ok: false; error: string };

export function normalizeViewName(name: string): string {
  return name.trim().toLowerCase();
}

export function findViewNameConflict(
  project: ProjectRoot,
  name: string,
  excludedViewId?: string,
): ProjectView | null {
  const normalized = normalizeViewName(name);

  return (
    project.views.find((view) => view.id !== excludedViewId && normalizeViewName(view.name) === normalized) ??
    null
  );
}

export function createProjectView(input: ProjectViewInput): ProjectView {
  return {
    id: input.id,
    name: input.name.trim(),
    description: input.description ?? '',
    pageSize: input.pageSize ?? 'a3',
    orientation: input.orientation ?? 'portrait',
    placements: [],
    lines: [],
    annotations: [],
  };
}

export function createViewPlacement(input: ViewPlacementInput): ViewPlacement {
  return {
    id: input.id,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    xMm: input.xMm,
    yMm: input.yMm,
    scale: input.scale ?? 1,
    labelOverride: input.labelOverride ?? null,
  };
}

export function addProjectView(project: ProjectRoot, view: ProjectView): ViewOperationResult {
  const nameError = validateViewName(project, view.name);

  if (nameError) {
    return failure(nameError);
  }

  return success(project, [...project.views, { ...view, name: view.name.trim() }]);
}

export function updateProjectView(
  project: ProjectRoot,
  viewId: string,
  updates: Partial<Pick<ProjectView, 'name' | 'description' | 'pageSize' | 'orientation'>>,
): ViewOperationResult {
  const current = project.views.find((view) => view.id === viewId);

  if (!current) {
    return failure('View update blocked: selected View no longer exists.');
  }

  if (updates.name !== undefined) {
    const nameError = validateViewName(project, updates.name, viewId);

    if (nameError) {
      return failure(nameError);
    }
  }

  return replaceView(project, {
    ...current,
    ...updates,
    name: updates.name === undefined ? current.name : updates.name.trim(),
  });
}

export function deleteProjectView(project: ProjectRoot, viewId: string): ViewOperationResult {
  if (!project.views.some((view) => view.id === viewId)) {
    return failure('View deletion blocked: selected View no longer exists.');
  }

  return success(
    project,
    project.views.filter((view) => view.id !== viewId),
  );
}

export function addViewPlacement(
  project: ProjectRoot,
  viewId: string,
  placement: ViewPlacement,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view) {
    return failure('View placement blocked: selected View no longer exists.');
  }

  if (!sourceExists(project, placement.sourceType, placement.sourceId)) {
    return failure(`View placement blocked: selected ${placement.sourceType} no longer exists.`);
  }

  if (
    view.placements.some(
      (candidate) =>
        candidate.sourceType === placement.sourceType && candidate.sourceId === placement.sourceId,
    )
  ) {
    return failure('View placement blocked: this source is already placed in the View.');
  }

  if (!isPlacementGeometryValid(placement)) {
    return failure('View placement blocked: placement geometry is invalid.');
  }

  return replaceView(project, { ...view, placements: [...view.placements, placement] });
}

export function updateViewPlacement(
  project: ProjectRoot,
  viewId: string,
  placementId: string,
  updates: Partial<Pick<ViewPlacement, 'xMm' | 'yMm' | 'scale' | 'labelOverride'>>,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);
  const placement = view?.placements.find((candidate) => candidate.id === placementId);

  if (!view || !placement) {
    return failure('View placement update blocked: selected placement no longer exists.');
  }

  const updatedPlacement = { ...placement, ...updates };

  if (!isPlacementGeometryValid(updatedPlacement)) {
    return failure('View placement update blocked: placement geometry is invalid.');
  }

  return replaceView(project, {
    ...view,
    placements: view.placements.map((candidate) =>
      candidate.id === placementId ? updatedPlacement : candidate,
    ),
  });
}

export function removeViewPlacement(
  project: ProjectRoot,
  viewId: string,
  placementId: string,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view?.placements.some((placement) => placement.id === placementId)) {
    return failure('View placement removal blocked: selected placement no longer exists.');
  }

  return replaceView(project, removePlacementAndAttachedLines(view, new Set([placementId])));
}

export function addViewLine(project: ProjectRoot, viewId: string, line: ViewLine): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view) {
    return failure('View line creation blocked: selected View no longer exists.');
  }

  const lineError = validateLine(view, line);

  if (lineError) {
    return failure(lineError);
  }

  return replaceView(project, { ...view, lines: [...view.lines, line] });
}

export function updateViewLine(
  project: ProjectRoot,
  viewId: string,
  lineId: string,
  updates: Partial<Pick<ViewLine, 'from' | 'to' | 'label' | 'waypoints'>>,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);
  const line = view?.lines.find((candidate) => candidate.id === lineId);

  if (!view || !line) {
    return failure('View line update blocked: selected line no longer exists.');
  }

  const updatedLine = { ...line, ...updates };
  const lineError = validateLine(view, updatedLine);

  if (lineError) {
    return failure(lineError);
  }

  return replaceView(project, {
    ...view,
    lines: view.lines.map((candidate) => (candidate.id === lineId ? updatedLine : candidate)),
  });
}

export function removeViewLine(project: ProjectRoot, viewId: string, lineId: string): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view?.lines.some((line) => line.id === lineId)) {
    return failure('View line removal blocked: selected line no longer exists.');
  }

  return replaceView(project, { ...view, lines: view.lines.filter((line) => line.id !== lineId) });
}

export function addViewAnnotation(
  project: ProjectRoot,
  viewId: string,
  annotation: ViewAnnotation,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view) {
    return failure('View annotation creation blocked: selected View no longer exists.');
  }

  if (!isAnnotationGeometryValid(annotation)) {
    return failure('View annotation creation blocked: annotation geometry is invalid.');
  }

  return replaceView(project, { ...view, annotations: [...view.annotations, annotation] });
}

export function updateViewAnnotation(
  project: ProjectRoot,
  viewId: string,
  annotationId: string,
  annotation: ViewAnnotation,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view?.annotations.some((candidate) => candidate.id === annotationId)) {
    return failure('View annotation update blocked: selected annotation no longer exists.');
  }

  if (annotation.id !== annotationId || !isAnnotationGeometryValid(annotation)) {
    return failure('View annotation update blocked: annotation data is invalid.');
  }

  return replaceView(project, {
    ...view,
    annotations: view.annotations.map((candidate) =>
      candidate.id === annotationId ? annotation : candidate,
    ),
  });
}

export function removeViewAnnotation(
  project: ProjectRoot,
  viewId: string,
  annotationId: string,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view?.annotations.some((annotation) => annotation.id === annotationId)) {
    return failure('View annotation removal blocked: selected annotation no longer exists.');
  }

  return replaceView(project, {
    ...view,
    annotations: view.annotations.filter((annotation) => annotation.id !== annotationId),
  });
}

export function replaceViewCanvas(
  project: ProjectRoot,
  viewId: string,
  canvas: Pick<ProjectView, 'placements' | 'lines' | 'annotations'>,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view) {
    return failure('View canvas replacement blocked: selected View no longer exists.');
  }

  return replaceView(project, { ...view, ...canvas });
}

export function getViewSourceImpact(
  project: ProjectRoot,
  sourceType: ViewSourceType,
  sourceId: string,
): ViewSourceImpact[] {
  return project.views.flatMap((view) => {
    const placementIds = new Set(
      view.placements
        .filter((placement) => placement.sourceType === sourceType && placement.sourceId === sourceId)
        .map((placement) => placement.id),
    );

    if (placementIds.size === 0) {
      return [];
    }

    return [
      {
        viewId: view.id,
        viewName: view.name,
        placementCount: placementIds.size,
        attachedLineCount: view.lines.filter(
          (line) => placementIds.has(line.from.placementId) || placementIds.has(line.to.placementId),
        ).length,
      },
    ];
  });
}

export function removeViewSourceReferences(
  project: ProjectRoot,
  sourceType: ViewSourceType,
  sourceId: string,
): ProjectRoot {
  let changed = false;
  const views = project.views.map((view) => {
    const placementIds = new Set(
      view.placements
        .filter((placement) => placement.sourceType === sourceType && placement.sourceId === sourceId)
        .map((placement) => placement.id),
    );

    if (placementIds.size === 0) {
      return view;
    }

    changed = true;
    return removePlacementAndAttachedLines(view, placementIds);
  });

  return changed ? { ...project, views } : project;
}

function validateViewName(project: ProjectRoot, name: string, excludedViewId?: string): string | null {
  if (!name.trim()) {
    return 'View operation blocked: View name is required.';
  }

  const conflict = findViewNameConflict(project, name, excludedViewId);
  return conflict ? `View operation blocked: View name "${name.trim()}" is already used.` : null;
}

function validateLine(view: ProjectView, line: ViewLine): string | null {
  const placementIds = new Set(view.placements.map((placement) => placement.id));

  if (!placementIds.has(line.from.placementId) || !placementIds.has(line.to.placementId)) {
    return 'View line operation blocked: both endpoints must reference placements in this View.';
  }

  if (line.from.placementId === line.to.placementId) {
    return 'View line operation blocked: a line must connect two different placements.';
  }

  if (
    !isFiniteNumber(line.from.offset) ||
    line.from.offset < 0 ||
    line.from.offset > 1 ||
    !isFiniteNumber(line.to.offset) ||
    line.to.offset < 0 ||
    line.to.offset > 1 ||
    line.waypoints.some((point) => !isFiniteNumber(point.xMm) || !isFiniteNumber(point.yMm))
  ) {
    return 'View line operation blocked: line geometry is invalid.';
  }

  return null;
}

function isPlacementGeometryValid(placement: ViewPlacement): boolean {
  return (
    isFiniteNumber(placement.xMm) &&
    isFiniteNumber(placement.yMm) &&
    isFiniteNumber(placement.scale) &&
    placement.scale >= VIEW_PLACEMENT_MIN_SCALE &&
    placement.scale <= VIEW_PLACEMENT_MAX_SCALE
  );
}

function isAnnotationGeometryValid(annotation: ViewAnnotation): boolean {
  return (
    isFiniteNumber(annotation.xMm) &&
    isFiniteNumber(annotation.yMm) &&
    isFiniteNumber(annotation.widthMm) &&
    annotation.widthMm > 0 &&
    (annotation.kind === 'text' || (isFiniteNumber(annotation.heightMm) && annotation.heightMm > 0))
  );
}

function sourceExists(project: ProjectRoot, sourceType: ViewSourceType, sourceId: string): boolean {
  return sourceType === 'device'
    ? project.devices.some((device) => device.id === sourceId)
    : project.racks.some((rack) => rack.id === sourceId);
}

function removePlacementAndAttachedLines(view: ProjectView, placementIds: Set<string>): ProjectView {
  return {
    ...view,
    placements: view.placements.filter((placement) => !placementIds.has(placement.id)),
    lines: view.lines.filter(
      (line) => !placementIds.has(line.from.placementId) && !placementIds.has(line.to.placementId),
    ),
  };
}

function replaceView(project: ProjectRoot, view: ProjectView): ViewOperationResult {
  return success(
    project,
    project.views.map((candidate) => (candidate.id === view.id ? view : candidate)),
  );
}

function success(project: ProjectRoot, views: ProjectView[]): ViewOperationResult {
  return { ok: true, project: { ...project, views } };
}

function failure(error: string): ViewOperationResult {
  return { ok: false, error };
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}
