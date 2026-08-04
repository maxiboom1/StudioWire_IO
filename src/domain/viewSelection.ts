import type { ProjectRoot, ProjectView, ViewPoint } from './types';
import {
  getAnnotationBounds,
  getPlacementBounds,
  isBoundsOutsidePage,
  type ViewBounds,
  type ViewSizeMm,
} from './viewGeometry';
import { snapViewLayoutPosition, type ViewDeviceScale } from './viewLayoutGrid';

export type ViewMovableElementKind = 'placement' | 'text' | 'group';

export interface ViewMovableElementRef {
  kind: ViewMovableElementKind;
  id: string;
}

export interface ViewMovableSelection {
  primary: ViewMovableElementRef;
  items: ViewMovableElementRef[];
}

export function getViewMovableElements(view: ProjectView): ViewMovableElementRef[] {
  return [
    ...view.placements.map((placement) => ({ kind: 'placement' as const, id: placement.id })),
    ...view.annotations.flatMap((annotation) =>
      annotation.kind === 'text' || annotation.kind === 'group'
        ? [{ kind: annotation.kind, id: annotation.id }]
        : [],
    ),
  ];
}

export function createViewMovableSelection(
  items: readonly ViewMovableElementRef[],
  primary = items[0],
): ViewMovableSelection | null {
  const unique = uniqueElements(items);
  if (!unique.length) return null;
  const resolvedPrimary = primary && unique.some((item) => sameElement(item, primary)) ? primary : unique[0];
  return { primary: resolvedPrimary, items: unique };
}

export function normalizeViewMovableSelection(
  view: ProjectView,
  selection: ViewMovableSelection,
): ViewMovableSelection | null {
  const available = new Set(getViewMovableElements(view).map(elementKey));
  return createViewMovableSelection(
    selection.items.filter((item) => available.has(elementKey(item))),
    available.has(elementKey(selection.primary)) ? selection.primary : undefined,
  );
}

export function toggleViewMovableSelection(
  selection: ViewMovableSelection | null,
  item: ViewMovableElementRef,
): ViewMovableSelection | null {
  if (!selection) return createViewMovableSelection([item], item);
  const contains = selection.items.some((candidate) => sameElement(candidate, item));
  if (!contains) return createViewMovableSelection([...selection.items, item], item);
  return createViewMovableSelection(
    selection.items.filter((candidate) => !sameElement(candidate, item)),
    sameElement(selection.primary, item) ? undefined : selection.primary,
  );
}

export function addToViewMovableSelection(
  selection: ViewMovableSelection | null,
  items: readonly ViewMovableElementRef[],
): ViewMovableSelection | null {
  if (!selection) return createViewMovableSelection(items);
  return createViewMovableSelection([...selection.items, ...items], selection.primary);
}

export function setViewMovablePrimary(
  selection: ViewMovableSelection,
  primary: ViewMovableElementRef,
): ViewMovableSelection {
  return createViewMovableSelection(selection.items, primary) ?? selection;
}

export function isViewMovableSelected(
  selection: ViewMovableSelection | null,
  item: ViewMovableElementRef,
): boolean {
  return Boolean(selection?.items.some((candidate) => sameElement(candidate, item)));
}

export function isViewMovablePrimary(
  selection: ViewMovableSelection | null,
  item: ViewMovableElementRef,
): boolean {
  return Boolean(selection && sameElement(selection.primary, item));
}

export function getViewMovableBounds(
  project: ProjectRoot,
  view: ProjectView,
  item: ViewMovableElementRef,
): ViewBounds | null {
  if (item.kind === 'placement') {
    const placement = view.placements.find((candidate) => candidate.id === item.id);
    return placement ? getPlacementBounds(project, placement) : null;
  }
  const annotation = view.annotations.find(
    (candidate) => candidate.id === item.id && candidate.kind === item.kind,
  );
  return annotation ? getAnnotationBounds(annotation) : null;
}

export function getViewSelectionBounds(
  project: ProjectRoot,
  view: ProjectView,
  items: readonly ViewMovableElementRef[],
): ViewBounds | null {
  const bounds = items.flatMap((item) => {
    const resolved = getViewMovableBounds(project, view, item);
    return resolved ? [resolved] : [];
  });
  if (!bounds.length) return null;
  const left = Math.min(...bounds.map((item) => item.xMm));
  const top = Math.min(...bounds.map((item) => item.yMm));
  const right = Math.max(...bounds.map((item) => item.xMm + item.widthMm));
  const bottom = Math.max(...bounds.map((item) => item.yMm + item.heightMm));
  return { xMm: left, yMm: top, widthMm: right - left, heightMm: bottom - top };
}

export function findViewMovableElementsInMarquee(
  project: ProjectRoot,
  view: ProjectView,
  marquee: ViewBounds,
): ViewMovableElementRef[] {
  return getViewMovableElements(view).filter((item) => {
    const bounds = getViewMovableBounds(project, view, item);
    return Boolean(bounds && containsBounds(marquee, bounds));
  });
}

export function getViewPointerTranslation(
  project: ProjectRoot,
  view: ProjectView,
  selection: ViewMovableSelection,
  proposedPrimary: ViewPoint,
  page: ViewSizeMm,
  scale: ViewDeviceScale,
  snap: boolean,
): ViewPoint {
  const primaryBounds = getViewMovableBounds(project, view, selection.primary);
  if (!primaryBounds) return { xMm: 0, yMm: 0 };
  const target = snap ? snapViewLayoutPosition(proposedPrimary, scale) : proposedPrimary;
  return clampViewSelectionDelta(
    project,
    view,
    selection.items,
    {
      xMm: target.xMm - primaryBounds.xMm,
      yMm: target.yMm - primaryBounds.yMm,
    },
    page,
  );
}

export function clampViewSelectionDelta(
  project: ProjectRoot,
  view: ProjectView,
  items: readonly ViewMovableElementRef[],
  delta: ViewPoint,
  page: ViewSizeMm,
): ViewPoint {
  const bounds = getViewSelectionBounds(project, view, items);
  if (!bounds || isBoundsOutsidePage(bounds, page)) return roundPoint(delta);
  return roundPoint({
    xMm: Math.max(-bounds.xMm, Math.min(delta.xMm, page.widthMm - bounds.xMm - bounds.widthMm)),
    yMm: Math.max(-bounds.yMm, Math.min(delta.yMm, page.heightMm - bounds.yMm - bounds.heightMm)),
  });
}

export function translateViewMovableElements(
  view: ProjectView,
  items: readonly ViewMovableElementRef[],
  delta: ViewPoint,
): ProjectView {
  const placementIds = idsForKind(items, 'placement');
  const textIds = idsForKind(items, 'text');
  const groupIds = idsForKind(items, 'group');
  return {
    ...view,
    placements: view.placements.map((placement) =>
      placementIds.has(placement.id)
        ? { ...placement, xMm: roundMm(placement.xMm + delta.xMm), yMm: roundMm(placement.yMm + delta.yMm) }
        : placement,
    ),
    annotations: view.annotations.map((annotation) => {
      const selected =
        (annotation.kind === 'text' && textIds.has(annotation.id)) ||
        (annotation.kind === 'group' && groupIds.has(annotation.id));
      return selected
        ? { ...annotation, xMm: roundMm(annotation.xMm + delta.xMm), yMm: roundMm(annotation.yMm + delta.yMm) }
        : annotation;
    }),
  };
}

export function removeViewMovableElements(
  view: ProjectView,
  items: readonly ViewMovableElementRef[],
): ProjectView {
  const placementIds = idsForKind(items, 'placement');
  const textIds = idsForKind(items, 'text');
  const groupIds = idsForKind(items, 'group');
  return {
    ...view,
    placements: view.placements.filter((placement) => !placementIds.has(placement.id)),
    lines: view.lines.filter(
      (line) => !placementIds.has(line.from.placementId) && !placementIds.has(line.to.placementId),
    ),
    annotations: view.annotations.filter((annotation) => {
      if (annotation.kind === 'port_range') return !placementIds.has(annotation.placementId);
      if (annotation.kind === 'text') return !textIds.has(annotation.id);
      return !groupIds.has(annotation.id);
    }),
  };
}

export function normalizeViewMarquee(start: ViewPoint, end: ViewPoint): ViewBounds {
  return {
    xMm: Math.min(start.xMm, end.xMm),
    yMm: Math.min(start.yMm, end.yMm),
    widthMm: Math.abs(end.xMm - start.xMm),
    heightMm: Math.abs(end.yMm - start.yMm),
  };
}

function containsBounds(container: ViewBounds, item: ViewBounds): boolean {
  return (
    item.xMm >= container.xMm &&
    item.yMm >= container.yMm &&
    item.xMm + item.widthMm <= container.xMm + container.widthMm &&
    item.yMm + item.heightMm <= container.yMm + container.heightMm
  );
}

function uniqueElements(items: readonly ViewMovableElementRef[]): ViewMovableElementRef[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = elementKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameElement(left: ViewMovableElementRef, right: ViewMovableElementRef): boolean {
  return left.kind === right.kind && left.id === right.id;
}

function elementKey(item: ViewMovableElementRef): string {
  return `${item.kind}:${item.id}`;
}

function idsForKind(
  items: readonly ViewMovableElementRef[],
  kind: ViewMovableElementKind,
): Set<string> {
  return new Set(items.filter((item) => item.kind === kind).map((item) => item.id));
}

function roundPoint(point: ViewPoint): ViewPoint {
  return { xMm: roundMm(point.xMm), yMm: roundMm(point.yMm) };
}

function roundMm(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
