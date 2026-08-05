import type { ProjectRoot, ProjectView, ViewOrientation, ViewPageSize } from './types';
import {
  getAnnotationBounds,
  getPlacementBounds,
  getViewPageDimensions,
  isBoundsOutsidePage,
  isPointOutsidePage,
} from './viewGeometry';
import { getViewLineLabelBounds, getViewLineLabelPoint } from './viewLineLabelGeometry';
import { getViewPortRangeBounds } from './viewPortRanges';
import { getRenderedLinePoints } from './viewRouting';

export interface ViewFormatOverflow {
  placementCount: number;
  lineCount: number;
  annotationCount: number;
  totalCount: number;
}

export function predictViewFormatOverflow(
  project: ProjectRoot,
  view: ProjectView,
  pageSize: ViewPageSize,
  orientation: ViewOrientation,
): ViewFormatOverflow {
  const page = getViewPageDimensions(pageSize, orientation);
  const placementCount = view.placements.filter((placement) =>
    isBoundsOutsidePage(getPlacementBounds(project, placement), page),
  ).length;
  const annotationCount = view.annotations.filter((annotation) => {
    const bounds =
      annotation.kind === 'port_range'
        ? getViewPortRangeBounds(project, view, annotation)
        : getAnnotationBounds(annotation);
    return Boolean(bounds && isBoundsOutsidePage(bounds, page));
  }).length;
  const lineCount = view.lines.filter((line) => {
    const points = getRenderedLinePoints(project, view, line);
    if (points.some((point) => isPointOutsidePage(point, page))) return true;
    const labelPoint = getViewLineLabelPoint(points, line.labelPosition);
    return Boolean(
      line.label &&
        labelPoint &&
        isBoundsOutsidePage(getViewLineLabelBounds(labelPoint, line.label, line.labelOrientation), page),
    );
  }).length;
  return {
    placementCount,
    lineCount,
    annotationCount,
    totalCount: placementCount + lineCount + annotationCount,
  };
}
