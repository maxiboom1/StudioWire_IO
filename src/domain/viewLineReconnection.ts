import { getCoveredViewPortIds, resolveViewLineEndpoint } from './viewLineEndpoints';
import type { ProjectRoot, ProjectView, ViewLine, ViewLineEndpoint } from './types';

export type ViewLineEndpointRole = 'from' | 'to';

export function viewLineEndpointsEqual(left: ViewLineEndpoint, right: ViewLineEndpoint): boolean {
  return (
    left.kind === right.kind &&
    left.placementId === right.placementId &&
    (left.kind === 'port'
      ? right.kind === 'port' && left.portId === right.portId
      : right.kind === 'port_range' && left.annotationId === right.annotationId)
  );
}

export function getViewLineEndpointRole(
  line: ViewLine,
  endpoint: ViewLineEndpoint,
): ViewLineEndpointRole | null {
  if (viewLineEndpointsEqual(line.from, endpoint)) return 'from';
  if (viewLineEndpointsEqual(line.to, endpoint)) return 'to';
  return null;
}

export function isValidViewLineReconnectTarget(
  project: ProjectRoot,
  view: ProjectView,
  line: ViewLine,
  role: ViewLineEndpointRole,
  endpoint: ViewLineEndpoint,
): boolean {
  const other = role === 'from' ? line.to : line.from;
  if (endpoint.placementId === other.placementId) return false;
  if (!resolveViewLineEndpoint(project, view, endpoint)) return false;
  if (
    endpoint.kind === 'port' &&
    getCoveredViewPortIds(project, view, endpoint.placementId).has(endpoint.portId)
  ) {
    return false;
  }
  return true;
}
