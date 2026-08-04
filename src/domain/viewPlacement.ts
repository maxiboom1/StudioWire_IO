import type { ProjectRoot, ProjectView, ViewPlacement, ViewSourceType } from './types';
import {
  getPlacementBounds,
  getViewPageDimensions,
  isBoundsOutsidePage,
  VIEW_GRID_MM,
  VIEW_PLACEMENT_MAX_SCALE,
  VIEW_PLACEMENT_MIN_SCALE,
  type ViewBounds,
  type ViewSizeMm,
} from './viewGeometry';

export const VIEW_PICKER_MARGIN_MM = 10;
export const VIEW_PICKER_SCAN_STEP_MM = 5;

export interface ViewSourceOption {
  sourceType: ViewSourceType;
  sourceId: string;
  name: string;
  secondary: string;
  locationId: string;
  locationName: string;
  folderId: string | null;
  folderName: string;
  alreadyPlaced: boolean;
}

export interface ViewSourceGroup {
  key: string;
  locationName: string;
  folderName: string;
  items: ViewSourceOption[];
}

export interface PlacementPositionResult {
  xMm: number;
  yMm: number;
  overlaps: boolean;
}

export interface PageClientRect {
  left: number;
  top: number;
}

export function buildViewSourceGroups(
  project: ProjectRoot,
  view: ProjectView,
  query = '',
): ViewSourceGroup[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const placed = new Set(view.placements.map((placement) => `${placement.sourceType}:${placement.sourceId}`));
  const locationIndex = new Map(project.locations.map((location, index) => [location.id, index]));
  const folderIndex = new Map(project.subLocations.map((folder, index) => [folder.id, index]));
  const options: ViewSourceOption[] = [
    ...project.devices.map((device) => {
      const location = project.locations.find((candidate) => candidate.id === device.locationId);
      const folder = project.subLocations.find((candidate) => candidate.id === device.subLocationId);
      return {
        sourceType: 'device' as const,
        sourceId: device.id,
        name: device.name,
        secondary: [device.kind === 'terminal_block' ? 'Terminal block' : 'Device', device.code, device.model]
          .filter(Boolean)
          .join(' · '),
        locationId: device.locationId,
        locationName: location?.name ?? 'Missing location',
        folderId: device.subLocationId,
        folderName: folder?.name ?? '',
        alreadyPlaced: placed.has(`device:${device.id}`),
      };
    }),
    ...project.racks.map((rack) => {
      const location = project.locations.find((candidate) => candidate.id === rack.locationId);
      const folder = project.subLocations.find((candidate) => candidate.id === rack.subLocationId);
      return {
        sourceType: 'rack' as const,
        sourceId: rack.id,
        name: rack.name,
        secondary: `Rack · ${rack.heightRu} RU`,
        locationId: rack.locationId,
        locationName: location?.name ?? 'Missing location',
        folderId: rack.subLocationId,
        folderName: folder?.name ?? '',
        alreadyPlaced: placed.has(`rack:${rack.id}`),
      };
    }),
  ].filter((option) =>
    [option.name, option.secondary, option.locationName, option.folderName]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  );

  options.sort((left, right) => {
    const locationOrder =
      (locationIndex.get(left.locationId) ?? Number.MAX_SAFE_INTEGER) -
      (locationIndex.get(right.locationId) ?? Number.MAX_SAFE_INTEGER);
    if (locationOrder !== 0) return locationOrder;
    const folderOrder =
      (left.folderId ? (folderIndex.get(left.folderId) ?? Number.MAX_SAFE_INTEGER) : -1) -
      (right.folderId ? (folderIndex.get(right.folderId) ?? Number.MAX_SAFE_INTEGER) : -1);
    if (folderOrder !== 0) return folderOrder;
    if (left.sourceType !== right.sourceType) return left.sourceType === 'device' ? -1 : 1;
    return left.name.localeCompare(right.name, undefined, { numeric: true });
  });

  const groups = new Map<string, ViewSourceGroup>();
  for (const option of options) {
    const key = `${option.locationId}:${option.folderId ?? ''}`;
    const group = groups.get(key) ?? {
      key,
      locationName: option.locationName,
      folderName: option.folderName,
      items: [],
    };
    group.items.push(option);
    groups.set(key, group);
  }

  return [...groups.values()];
}

export function findExistingPlacement(
  view: ProjectView,
  sourceType: ViewSourceType,
  sourceId: string,
): ViewPlacement | null {
  return (
    view.placements.find(
      (placement) => placement.sourceType === sourceType && placement.sourceId === sourceId,
    ) ?? null
  );
}

export function findFirstPlacementPosition(
  project: ProjectRoot,
  view: ProjectView,
  sourceType: ViewSourceType,
  sourceId: string,
): PlacementPositionResult {
  const page = getViewPageDimensions(view.pageSize, view.orientation);
  const existingBounds = view.placements.map((placement) => getPlacementBounds(project, placement));
  const draft: ViewPlacement = {
    id: '__view-placement-draft__',
    sourceType,
    sourceId,
    xMm: VIEW_PICKER_MARGIN_MM,
    yMm: VIEW_PICKER_MARGIN_MM,
    scale: 1,
    labelOverride: null,
  };

  for (let yMm = VIEW_PICKER_MARGIN_MM; yMm <= page.heightMm; yMm += VIEW_PICKER_SCAN_STEP_MM) {
    for (let xMm = VIEW_PICKER_MARGIN_MM; xMm <= page.widthMm; xMm += VIEW_PICKER_SCAN_STEP_MM) {
      const bounds = getPlacementBounds(project, { ...draft, xMm, yMm });
      if (
        !isBoundsOutsidePage(bounds, page) &&
        !existingBounds.some((other) => boundsOverlap(bounds, other))
      ) {
        return { xMm, yMm, overlaps: false };
      }
    }
  }

  const cascadeIndex = view.placements.length;
  return {
    xMm: VIEW_PICKER_MARGIN_MM + cascadeIndex * VIEW_GRID_MM,
    yMm: VIEW_PICKER_MARGIN_MM + cascadeIndex * VIEW_GRID_MM,
    overlaps: true,
  };
}

export function pointToViewPosition(
  clientX: number,
  clientY: number,
  pageRect: PageClientRect,
  zoom: number,
  pixelsPerMm: number,
  bypassSnap: boolean,
): { xMm: number; yMm: number } {
  const raw = {
    xMm: (clientX - pageRect.left) / zoom / pixelsPerMm,
    yMm: (clientY - pageRect.top) / zoom / pixelsPerMm,
  };
  return bypassSnap ? raw : snapViewPosition(raw);
}

export function snapViewPosition(position: { xMm: number; yMm: number }) {
  return {
    xMm: snapMm(position.xMm),
    yMm: snapMm(position.yMm),
  };
}

export function clampPlacementPosition(
  position: { xMm: number; yMm: number },
  size: ViewSizeMm,
  page: ViewSizeMm,
) {
  return {
    xMm: clamp(position.xMm, 0, Math.max(0, page.widthMm - size.widthMm)),
    yMm: clamp(position.yMm, 0, Math.max(0, page.heightMm - size.heightMm)),
  };
}

export function clampPlacementScale(scale: number): number {
  return clamp(scale, VIEW_PLACEMENT_MIN_SCALE, VIEW_PLACEMENT_MAX_SCALE);
}

export function getPlacementPage(project: ProjectRoot, view: ProjectView) {
  return getViewPageDimensions(view.pageSize, view.orientation);
}

export function isPlacementOutsidePage(
  project: ProjectRoot,
  view: ProjectView,
  placement: ViewPlacement,
): boolean {
  return isBoundsOutsidePage(getPlacementBounds(project, placement), getPlacementPage(project, view));
}

export function boundsOverlap(left: ViewBounds, right: ViewBounds): boolean {
  return (
    left.xMm < right.xMm + right.widthMm &&
    left.xMm + left.widthMm > right.xMm &&
    left.yMm < right.yMm + right.heightMm &&
    left.yMm + left.heightMm > right.yMm
  );
}

function snapMm(value: number): number {
  return Math.round(value / VIEW_GRID_MM) * VIEW_GRID_MM;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
