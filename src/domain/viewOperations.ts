import { VIEW_PLACEMENT_MAX_SCALE, VIEW_PLACEMENT_MIN_SCALE } from './viewGeometry';
import { resolveViewLineEndpoint } from './viewLineEndpoints';
import { getViewFlexPathValidationError } from './viewFlexPaths';
import { getRenderedLinePoints } from './viewRouting';
import {
  getViewLayoutScale,
  isViewDeviceScale,
  remapViewLayoutPosition,
  type ViewDeviceScale,
} from './viewLayoutGrid';
import { VIEW_LINE_COLOR_VALUES, VIEW_LINE_LABEL_ORIENTATION_VALUES, VIEW_LINE_WIDTH_VALUES } from './types';
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
import { normalizeViewPortRange, resolveViewPortRange, viewPortRangesOverlap } from './viewPortRanges';

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
  attachedPortRangeCount: number;
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

export function setViewDeviceScale(
  project: ProjectRoot,
  viewId: string,
  scale: ViewDeviceScale,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);

  if (!view) {
    return failure('View device size update blocked: selected View no longer exists.');
  }

  if (!isViewDeviceScale(scale)) {
    return failure('View device size update blocked: size must be 70%, 80%, 90%, or 100%.');
  }

  if (!view.placements.some((placement) => placement.sourceType === 'device')) {
    return failure('View device size update blocked: add a device to the View first.');
  }

  return replaceView(project, applyViewDeviceScale(view, scale));
}

export function applyViewDeviceScale(view: ProjectView, scale: ViewDeviceScale): ProjectView {
  const currentScale = getViewLayoutScale(view);
  return {
    ...view,
    placements: view.placements.map((placement) => ({
      ...placement,
      ...remapViewLayoutPosition(placement, currentScale, scale),
      scale: placement.sourceType === 'device' ? scale : placement.scale,
    })),
  };
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

  const lineError = validateLine(project, view, line);

  if (lineError) {
    return failure(lineError);
  }

  return replaceView(project, { ...view, lines: [...view.lines, line] });
}

export function updateViewLine(
  project: ProjectRoot,
  viewId: string,
  lineId: string,
  updates: Partial<
    Pick<
      ViewLine,
      'from' | 'to' | 'label' | 'waypoints' | 'color' | 'width' | 'labelOrientation' | 'labelPosition'
    >
  >,
): ViewOperationResult {
  const view = project.views.find((candidate) => candidate.id === viewId);
  const line = view?.lines.find((candidate) => candidate.id === lineId);

  if (!view || !line) {
    return failure('View line update blocked: selected line no longer exists.');
  }

  const updatedLine = { ...line, ...updates };
  const lineError = validateLine(project, view, updatedLine);

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

  const annotationError = validateAnnotation(project, view, annotation);
  if (annotationError) {
    return failure(annotationError);
  }
  const normalized =
    annotation.kind === 'port_range' ? normalizeViewPortRange(project, view, annotation)! : annotation;
  return replaceView(project, { ...view, annotations: [...view.annotations, normalized] });
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

  const annotationError = validateAnnotation(project, view, annotation, annotationId);
  if (annotation.id !== annotationId || annotationError) {
    return failure(annotationError ?? 'View annotation update blocked: annotation data is invalid.');
  }

  const normalized =
    annotation.kind === 'port_range' ? normalizeViewPortRange(project, view, annotation)! : annotation;

  return replaceView(project, {
    ...view,
    annotations: view.annotations.map((candidate) =>
      candidate.id === annotationId ? normalized : candidate,
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
    lines: view.lines.filter(
      (line) =>
        !(
          (line.from.kind === 'port_range' && line.from.annotationId === annotationId) ||
          (line.to.kind === 'port_range' && line.to.annotationId === annotationId)
        ),
    ),
  });
}

export function getViewPortRangeAttachedLineCount(view: ProjectView, annotationId: string): number {
  return view.lines.filter(
    (line) =>
      (line.from.kind === 'port_range' && line.from.annotationId === annotationId) ||
      (line.to.kind === 'port_range' && line.to.annotationId === annotationId),
  ).length;
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
        attachedPortRangeCount: view.annotations.filter(
          (annotation) => annotation.kind === 'port_range' && placementIds.has(annotation.placementId),
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

function validateLine(project: ProjectRoot, view: ProjectView, line: ViewLine): string | null {
  const placementIds = new Set(view.placements.map((placement) => placement.id));

  if (!placementIds.has(line.from.placementId) || !placementIds.has(line.to.placementId)) {
    return 'View line operation blocked: both endpoints must reference placements in this View.';
  }

  if (line.from.placementId === line.to.placementId) {
    return 'View line operation blocked: a line must connect two different placements.';
  }

  if (
    !resolveViewLineEndpoint(project, view, line.from) ||
    !resolveViewLineEndpoint(project, view, line.to)
  ) {
    return 'View line operation blocked: choose a valid standard-device I/O or I/O Range anchor.';
  }

  if (
    !VIEW_LINE_COLOR_VALUES.includes(line.color) ||
    !VIEW_LINE_WIDTH_VALUES.includes(line.width) ||
    !VIEW_LINE_LABEL_ORIENTATION_VALUES.includes(line.labelOrientation) ||
    !isFiniteNumber(line.labelPosition) ||
    line.labelPosition < 0 ||
    line.labelPosition > 1 ||
    line.waypoints.some(
      (point) =>
        !isFiniteNumber(point.xMm) ||
        !isFiniteNumber(point.yMm) ||
        (point.flexPathId !== null && typeof point.flexPathId !== 'string'),
    )
  ) {
    return 'View line operation blocked: line geometry is invalid.';
  }

  const flexError = getViewFlexPathValidationError(line.waypoints);
  if (flexError) return `View line operation blocked: ${flexError}`;

  const renderedPoints = getRenderedLinePoints(project, view, line);
  if (
    line.waypoints
      .slice(1)
      .some(
        (point, index) =>
          (point.xMm !== line.waypoints[index].xMm && point.yMm !== line.waypoints[index].yMm) ||
          (point.xMm === line.waypoints[index].xMm && point.yMm === line.waypoints[index].yMm),
      ) ||
    renderedPoints
      .slice(1)
      .some(
        (point, index) => point.xMm !== renderedPoints[index].xMm && point.yMm !== renderedPoints[index].yMm,
      )
  ) {
    return 'View line operation blocked: manual routes must remain orthogonal.';
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
  if (annotation.kind === 'port_range') return true;
  return (
    isFiniteNumber(annotation.xMm) &&
    isFiniteNumber(annotation.yMm) &&
    isFiniteNumber(annotation.widthMm) &&
    annotation.widthMm > 0 &&
    (annotation.kind === 'text' || (isFiniteNumber(annotation.heightMm) && annotation.heightMm > 0))
  );
}

function validateAnnotation(
  project: ProjectRoot,
  view: ProjectView,
  annotation: ViewAnnotation,
  excludedId?: string,
): string | null {
  if (!isAnnotationGeometryValid(annotation)) {
    return 'View annotation operation blocked: annotation geometry is invalid.';
  }
  if (annotation.kind !== 'port_range') return null;
  if (!resolveViewPortRange(project, view, annotation)) {
    return 'I/O Range blocked: choose two rows on the same side of one standard device.';
  }
  if (viewPortRangesOverlap(project, view, annotation, excludedId)) {
    return 'I/O Range blocked: rows on this side are already included in another range.';
  }
  return null;
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
    annotations: view.annotations.filter(
      (annotation) => annotation.kind !== 'port_range' || !placementIds.has(annotation.placementId),
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
