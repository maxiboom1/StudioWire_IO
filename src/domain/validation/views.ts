import type { ProjectRoot, ProjectView, ValidationIssue, ViewAnnotation, ViewLine } from '../types';
import {
  getAnnotationBounds,
  getLineEndpointPoint,
  getPlacementBounds,
  getViewPageDimensions,
  isBoundsOutsidePage,
  isPointOutsidePage,
  VIEW_PLACEMENT_MAX_SCALE,
  VIEW_PLACEMENT_MIN_SCALE,
} from '../viewGeometry';
import { countBy, type ValidationIssueBuilder } from './shared';

export function validateViews(project: ProjectRoot, issue: ValidationIssueBuilder): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nameCounts = countBy(project.views, (view) => view.name.trim().toLowerCase());
  const deviceIds = new Set(project.devices.map((device) => device.id));
  const rackIds = new Set(project.racks.map((rack) => rack.id));

  for (const view of project.views) {
    if (!view.name.trim()) {
      issues.push(issue('error', 'view-name-required', 'View name is required.', 'view', view.id));
    }

    if ((nameCounts.get(view.name.trim().toLowerCase()) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'duplicate-view-name',
          `View name "${view.name}" is used more than once.`,
          'view',
          view.id,
        ),
      );
    }

    validateViewPlacements(project, view, deviceIds, rackIds, issue, issues);
    validateViewLines(project, view, issue, issues);
    validateViewAnnotations(view, issue, issues);
    validateViewPageBounds(project, view, issue, issues);
  }

  return issues;
}

function validateViewPlacements(
  project: ProjectRoot,
  view: ProjectView,
  deviceIds: Set<string>,
  rackIds: Set<string>,
  issue: ValidationIssueBuilder,
  issues: ValidationIssue[],
) {
  const sourceCounts = countBy(
    view.placements,
    (placement) => `${placement.sourceType}:${placement.sourceId}`,
  );

  for (const placement of view.placements) {
    if ((sourceCounts.get(`${placement.sourceType}:${placement.sourceId}`) ?? 0) > 1) {
      issues.push(
        issue(
          'error',
          'duplicate-view-placement-source',
          `View ${view.name || view.id} contains source ${placement.sourceId} more than once.`,
          'view',
          view.id,
        ),
      );
    }

    if (placement.sourceType === 'device' && !deviceIds.has(placement.sourceId)) {
      issues.push(
        issue(
          'error',
          'view-placement-device-missing',
          `View ${view.name || view.id} references missing device ${placement.sourceId}.`,
          'view',
          view.id,
        ),
      );
    }

    if (placement.sourceType === 'rack' && !rackIds.has(placement.sourceId)) {
      issues.push(
        issue(
          'error',
          'view-placement-rack-missing',
          `View ${view.name || view.id} references missing rack ${placement.sourceId}.`,
          'view',
          view.id,
        ),
      );
    }

    if (
      !isFiniteNumber(placement.xMm) ||
      !isFiniteNumber(placement.yMm) ||
      !isFiniteNumber(placement.scale) ||
      placement.scale < VIEW_PLACEMENT_MIN_SCALE ||
      placement.scale > VIEW_PLACEMENT_MAX_SCALE
    ) {
      issues.push(geometryIssue(view, `Placement ${placement.id} has invalid geometry.`, issue));
    }

    // Resolve natural dimensions here as a relational backstop for malformed live source data.
    const bounds = getPlacementBounds(project, placement);
    if (!isFiniteNumber(bounds.widthMm) || !isFiniteNumber(bounds.heightMm)) {
      issues.push(geometryIssue(view, `Placement ${placement.id} has invalid source dimensions.`, issue));
    }
  }
}

function validateViewLines(
  project: ProjectRoot,
  view: ProjectView,
  issue: ValidationIssueBuilder,
  issues: ValidationIssue[],
) {
  const placementIds = new Set(view.placements.map((placement) => placement.id));

  for (const line of view.lines) {
    if (!placementIds.has(line.from.placementId) || !placementIds.has(line.to.placementId)) {
      issues.push(
        issue(
          'error',
          'view-line-placement-missing',
          `View line ${line.id} references a placement outside this View.`,
          'view',
          view.id,
        ),
      );
    }

    if (line.from.placementId === line.to.placementId) {
      issues.push(
        issue(
          'error',
          'view-line-self-reference',
          `View line ${line.id} must connect two different placements.`,
          'view',
          view.id,
        ),
      );
    }

    if (!isLineGeometryValid(line)) {
      issues.push(geometryIssue(view, `Line ${line.id} has invalid geometry.`, issue));
    }

    // Keep endpoint resolution exercised independently from page-bound checks.
    getLineEndpointPoint(project, view, line.from);
    getLineEndpointPoint(project, view, line.to);
  }
}

function validateViewAnnotations(
  view: ProjectView,
  issue: ValidationIssueBuilder,
  issues: ValidationIssue[],
) {
  for (const annotation of view.annotations) {
    if (!isAnnotationGeometryValid(annotation)) {
      issues.push(geometryIssue(view, `Annotation ${annotation.id} has invalid geometry.`, issue));
    }
  }
}

function validateViewPageBounds(
  project: ProjectRoot,
  view: ProjectView,
  issue: ValidationIssueBuilder,
  issues: ValidationIssue[],
) {
  const page = getViewPageDimensions(view.pageSize, view.orientation);

  for (const placement of view.placements) {
    if (isBoundsOutsidePage(getPlacementBounds(project, placement), page)) {
      issues.push(outsidePageIssue(view, `Placement ${placement.id} is outside the View page.`, issue));
    }
  }

  for (const annotation of view.annotations) {
    if (isBoundsOutsidePage(getAnnotationBounds(annotation), page)) {
      issues.push(outsidePageIssue(view, `Annotation ${annotation.id} is outside the View page.`, issue));
    }
  }

  for (const line of view.lines) {
    const points = [
      getLineEndpointPoint(project, view, line.from),
      ...line.waypoints,
      getLineEndpointPoint(project, view, line.to),
    ];

    if (points.some((point) => point !== null && isPointOutsidePage(point, page))) {
      issues.push(outsidePageIssue(view, `Line ${line.id} extends outside the View page.`, issue));
    }
  }
}

function isLineGeometryValid(line: ViewLine): boolean {
  return (
    isEndpointOffsetValid(line.from.offset) &&
    isEndpointOffsetValid(line.to.offset) &&
    line.waypoints.every((point) => isFiniteNumber(point.xMm) && isFiniteNumber(point.yMm))
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

function isEndpointOffsetValid(offset: number): boolean {
  return isFiniteNumber(offset) && offset >= 0 && offset <= 1;
}

function geometryIssue(view: ProjectView, message: string, issue: ValidationIssueBuilder): ValidationIssue {
  return issue('error', 'view-geometry-invalid', message, 'view', view.id);
}

function outsidePageIssue(
  view: ProjectView,
  message: string,
  issue: ValidationIssueBuilder,
): ValidationIssue {
  return issue('warning', 'view-item-outside-page', message, 'view', view.id);
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}
