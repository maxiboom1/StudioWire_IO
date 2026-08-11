import type { ViewLineWaypoint } from './types';

export interface ViewFlexPathGroup {
  id: string;
  startIndex: number;
  waypoints: [ViewLineWaypoint, ViewLineWaypoint, ViewLineWaypoint, ViewLineWaypoint];
  orientation: 'horizontal' | 'vertical';
}

export function getViewFlexPathGroups(waypoints: ViewLineWaypoint[]): ViewFlexPathGroup[] {
  const ids = [...new Set(waypoints.flatMap((point) => (point.flexPathId ? [point.flexPathId] : [])))];
  return ids.flatMap((id) => {
    const indices = waypoints.flatMap((point, index) => (point.flexPathId === id ? [index] : []));
    if (indices.length !== 4 || !indices.every((index, offset) => index === indices[0] + offset)) return [];
    const points = indices.map((index) => waypoints[index]) as ViewFlexPathGroup['waypoints'];
    const orientation = getFlexPathOrientation(points);
    return orientation ? [{ id, startIndex: indices[0], waypoints: points, orientation }] : [];
  });
}

export function getViewFlexPathValidationError(waypoints: ViewLineWaypoint[]): string | null {
  const grouped = new Map<string, number[]>();
  for (const [index, point] of waypoints.entries()) {
    if (point.flexPathId === null) continue;
    if (!point.flexPathId.trim()) return 'Flex path IDs must contain non-whitespace text.';
    const indices = grouped.get(point.flexPathId) ?? [];
    indices.push(index);
    grouped.set(point.flexPathId, indices);
  }

  for (const [id, indices] of grouped) {
    if (indices.length !== 4 || !indices.every((index, offset) => index === indices[0] + offset)) {
      return `Flex path ${id} must contain exactly four consecutive waypoints.`;
    }
    const points = indices.map((index) => waypoints[index]) as ViewFlexPathGroup['waypoints'];
    if (!getFlexPathOrientation(points)) {
      return `Flex path ${id} must be a non-zero orthogonal U-shaped detour.`;
    }
  }
  return null;
}

export function getFlexPathIdAtWaypoint(waypoints: ViewLineWaypoint[], waypointIndex: number): string | null {
  return waypoints[waypointIndex]?.flexPathId ?? null;
}

export function removeViewFlexPath(waypoints: ViewLineWaypoint[], flexPathId: string): ViewLineWaypoint[] {
  return waypoints.filter((point) => point.flexPathId !== flexPathId);
}

export function moveViewFlexPathWaypoint(
  waypoints: ViewLineWaypoint[],
  waypointIndex: number,
  xMm: number,
  yMm: number,
): ViewLineWaypoint[] | null {
  const flexPathId = getFlexPathIdAtWaypoint(waypoints, waypointIndex);
  if (!flexPathId) return null;
  const group = getViewFlexPathGroups(waypoints).find((candidate) => candidate.id === flexPathId);
  if (!group) return null;
  const localIndex = waypointIndex - group.startIndex;
  const next = waypoints.map((point) => ({ ...point }));
  const indices = [0, 1, 2, 3].map((offset) => group.startIndex + offset);

  if (group.orientation === 'horizontal') {
    if (localIndex === 0) {
      next[indices[0]].xMm = xMm;
      next[indices[1]].xMm = xMm;
    } else if (localIndex === 1) {
      next[indices[0]].xMm = xMm;
      next[indices[1]].xMm = xMm;
      next[indices[1]].yMm = yMm;
      next[indices[2]].yMm = yMm;
    } else if (localIndex === 2) {
      next[indices[2]].xMm = xMm;
      next[indices[3]].xMm = xMm;
      next[indices[1]].yMm = yMm;
      next[indices[2]].yMm = yMm;
    } else {
      next[indices[2]].xMm = xMm;
      next[indices[3]].xMm = xMm;
    }
  } else if (localIndex === 0) {
    next[indices[0]].yMm = yMm;
    next[indices[1]].yMm = yMm;
  } else if (localIndex === 1) {
    next[indices[0]].yMm = yMm;
    next[indices[1]].yMm = yMm;
    next[indices[1]].xMm = xMm;
    next[indices[2]].xMm = xMm;
  } else if (localIndex === 2) {
    next[indices[2]].yMm = yMm;
    next[indices[3]].yMm = yMm;
    next[indices[1]].xMm = xMm;
    next[indices[2]].xMm = xMm;
  } else {
    next[indices[2]].yMm = yMm;
    next[indices[3]].yMm = yMm;
  }

  return getViewFlexPathValidationError(next) ? waypoints : next;
}

function getFlexPathOrientation(
  points: ViewFlexPathGroup['waypoints'],
): ViewFlexPathGroup['orientation'] | null {
  const [first, second, third, fourth] = points;
  const horizontal =
    first.yMm === fourth.yMm &&
    first.xMm === second.xMm &&
    second.yMm === third.yMm &&
    third.xMm === fourth.xMm &&
    first.yMm !== second.yMm &&
    first.xMm !== fourth.xMm;
  if (horizontal) return 'horizontal';
  const vertical =
    first.xMm === fourth.xMm &&
    first.yMm === second.yMm &&
    second.xMm === third.xMm &&
    third.yMm === fourth.yMm &&
    first.xMm !== second.xMm &&
    first.yMm !== fourth.yMm;
  return vertical ? 'vertical' : null;
}
