import { VIEW_LINE_COLOR_VALUES, VIEW_LINE_LABEL_ORIENTATION_VALUES, VIEW_LINE_WIDTH_VALUES } from '../types';
import type {
  ProjectRoot,
  ProjectView,
  ValidationIssue,
  ViewAnnotation,
  ViewLine,
  ViewLineEndpoint,
} from '../types';
import { getOrderedDevicePortColumns } from '../devicePortLayout';
import {
  getAnnotationBounds,
  getPlacementBounds,
  getViewPageDimensions,
  isBoundsOutsidePage,
  isPointOutsidePage,
  VIEW_PLACEMENT_MAX_SCALE,
  VIEW_PLACEMENT_MIN_SCALE,
} from '../viewGeometry';
import { getViewLineEndpointPoint } from '../viewLineEndpoints';
import { getViewLineLabelBounds, getViewLineLabelPoint } from '../viewLineLabelGeometry';
import { getViewPortRangeBounds, viewPortRangesOverlap } from '../viewPortRanges';
import { getRenderedLinePoints } from '../viewRouting';
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
    validateViewAnnotations(project, view, issue, issues);
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
    const fromPlacementExists = placementIds.has(line.from.placementId);
    const toPlacementExists = placementIds.has(line.to.placementId);
    if (!fromPlacementExists || !toPlacementExists) {
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

    if (fromPlacementExists) validateViewLineEndpoint(project, view, line, line.from, issue, issues);
    if (toPlacementExists) validateViewLineEndpoint(project, view, line, line.to, issue, issues);

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

    if (!isLineGeometryValid(line) || !isLineOrthogonal(project, view, line)) {
      issues.push(geometryIssue(view, `Line ${line.id} has invalid geometry.`, issue));
    }

    if (
      !VIEW_LINE_COLOR_VALUES.includes(line.color) ||
      !VIEW_LINE_WIDTH_VALUES.includes(line.width) ||
      !VIEW_LINE_LABEL_ORIENTATION_VALUES.includes(line.labelOrientation) ||
      !isFiniteNumber(line.labelPosition) ||
      line.labelPosition < 0 ||
      line.labelPosition > 1
    ) {
      issues.push(
        issue(
          'error',
          'view-line-style-invalid',
          `View line ${line.id} has an invalid color, width, label direction, or label position.`,
          'view',
          view.id,
        ),
      );
    }

    // Keep endpoint resolution exercised independently from page-bound checks.
    getViewLineEndpointPoint(project, view, line.from);
    getViewLineEndpointPoint(project, view, line.to);
  }
}

function validateViewLineEndpoint(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  endpoint: ViewLineEndpoint,
  issue: ValidationIssueBuilder,
  issues: ValidationIssue[],
) {
  const placement = view.placements.find((candidate) => candidate.id === endpoint.placementId);
  const device =
    placement?.sourceType === 'device'
      ? project.devices.find((candidate) => candidate.id === placement.sourceId)
      : null;
  if (endpoint.kind === 'port') {
    if (!device || device.kind !== 'device') {
      issues.push(
        issue(
          'error',
          'view-line-port-invalid',
          `View line ${line.id} port endpoint must use a standard-device placement.`,
          'view',
          view.id,
        ),
      );
      return;
    }
    const port = project.ports.find((candidate) => candidate.id === endpoint.portId);
    if (!port || port.deviceId !== device.id) {
      issues.push(
        issue(
          'error',
          'view-line-port-missing',
          `View line ${line.id} references a missing port on its placed source device.`,
          'view',
          view.id,
        ),
      );
      return;
    }
    const columns = getOrderedDevicePortColumns(project, device);
    if (![...columns.left, ...columns.right].some((candidate) => candidate.id === endpoint.portId)) {
      issues.push(
        issue(
          'error',
          'view-line-port-invalid',
          `View line ${line.id} port endpoint must resolve to a rendered standard-device row.`,
          'view',
          view.id,
        ),
      );
    }
    return;
  }
  const annotation = view.annotations.find((candidate) => candidate.id === endpoint.annotationId);
  if (!annotation) {
    issues.push(
      issue(
        'error',
        'view-line-range-missing',
        `View line ${line.id} references a missing I/O Range.`,
        'view',
        view.id,
      ),
    );
    return;
  }
  if (
    annotation.kind !== 'port_range' ||
    annotation.placementId !== endpoint.placementId ||
    !device ||
    device.kind !== 'device' ||
    !getViewPortRangeBounds(project, view, annotation)
  ) {
    issues.push(
      issue(
        'error',
        'view-line-range-invalid',
        `View line ${line.id} I/O Range endpoint is invalid for its standard-device placement.`,
        'view',
        view.id,
      ),
    );
  }
}

function isLineOrthogonal(project: ProjectRoot, view: ProjectView, line: ViewLine): boolean {
  if (!line.waypoints.length) return true;
  const start = getViewLineEndpointPoint(project, view, line.from);
  const end = getViewLineEndpointPoint(project, view, line.to);
  if (!start || !end) return true;
  const points = [start, ...line.waypoints, end];
  return points
    .slice(1)
    .every((point, index) => point.xMm === points[index].xMm || point.yMm === points[index].yMm);
}

function validateViewAnnotations(
  project: ProjectRoot,
  view: ProjectView,
  issue: ValidationIssueBuilder,
  issues: ValidationIssue[],
) {
  for (const annotation of view.annotations) {
    if (annotation.kind === 'port_range') {
      validatePortRange(project, view, annotation, issue, issues);
      continue;
    }
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
    const bounds =
      annotation.kind === 'port_range'
        ? getViewPortRangeBounds(project, view, annotation)
        : getAnnotationBounds(annotation);
    if (bounds && isBoundsOutsidePage(bounds, page)) {
      issues.push(outsidePageIssue(view, `Annotation ${annotation.id} is outside the View page.`, issue));
    }
  }

  for (const line of view.lines) {
    const points = getRenderedLinePoints(project, view, line);
    const labelPoint = getViewLineLabelPoint(points, line.labelPosition);
    const labelOutside = Boolean(
      line.label &&
        labelPoint &&
        isBoundsOutsidePage(getViewLineLabelBounds(labelPoint, line.label, line.labelOrientation), page),
    );
    if (points.some((point) => isPointOutsidePage(point, page)) || labelOutside) {
      issues.push(outsidePageIssue(view, `Line ${line.id} extends outside the View page.`, issue));
    }
  }
}

function isLineGeometryValid(line: ViewLine): boolean {
  return line.waypoints.every((point) => isFiniteNumber(point.xMm) && isFiniteNumber(point.yMm));
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

function validatePortRange(
  project: ProjectRoot,
  view: ProjectView,
  range: Extract<ViewAnnotation, { kind: 'port_range' }>,
  issue: ValidationIssueBuilder,
  issues: ValidationIssue[],
) {
  const placement = view.placements.find((candidate) => candidate.id === range.placementId);
  const device =
    placement?.sourceType === 'device'
      ? project.devices.find((candidate) => candidate.id === placement.sourceId)
      : null;
  if (!placement || !device || device.kind !== 'device') {
    issues.push(
      issue(
        'error',
        'view-port-range-placement-missing',
        `I/O Range ${range.id} must reference a standard-device placement in this View.`,
        'view',
        view.id,
      ),
    );
    return;
  }
  const ports = project.ports.filter((port) => port.deviceId === device.id);
  if (
    !ports.some((port) => port.id === range.startPortId) ||
    !ports.some((port) => port.id === range.endPortId)
  ) {
    issues.push(
      issue(
        'error',
        'view-port-range-port-missing',
        `I/O Range ${range.id} references a missing device port.`,
        'view',
        view.id,
      ),
    );
    return;
  }
  const sidePorts = getOrderedDevicePortColumns(project, device)[range.side];
  if (
    !sidePorts.some((port) => port.id === range.startPortId) ||
    !sidePorts.some((port) => port.id === range.endPortId)
  ) {
    issues.push(
      issue(
        'error',
        'view-port-range-invalid',
        `I/O Range ${range.id} endpoints must appear on its selected device side.`,
        'view',
        view.id,
      ),
    );
    return;
  }
  if (viewPortRangesOverlap(project, view, range, range.id)) {
    issues.push(
      issue(
        'error',
        'view-port-range-overlap',
        `I/O Range ${range.id} shares rows with another range on the same device side.`,
        'view',
        view.id,
      ),
    );
  }
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
