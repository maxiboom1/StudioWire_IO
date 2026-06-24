import { useProject } from '../../state/ProjectContext';
import { formatDate } from '../common/selection';
import { EmptyState, MetricGrid, SummaryGrid, WorkspaceHeader } from '../common/WorkspaceBits';

export function ProjectWorkspace() {
  const { project } = useProject();
  const metrics: Array<[string, number]> = [
    ['Locations', project.locations.length],
    ['Racks', project.racks.length],
    ['Devices', project.devices.length],
    ['Port groups', project.portGroups.length],
    ['Ports', project.ports.length],
    ['Cables', project.cables.length],
    ['Validation issues', project.validationIssues.length],
  ];

  return (
    <section className="workspace" aria-label="Project summary">
      <WorkspaceHeader
        eyebrow="Project"
        title={project.project.name}
        badge={`Schema ${project.schemaVersion}`}
      />
      <SummaryGrid
        items={[
          ['Customer', project.project.customer || 'Not set'],
          ['Revision', project.project.revision],
          ['Status', project.project.status],
          ['Updated', formatDate(project.project.updatedAt)],
        ]}
      />
      <MetricGrid items={metrics} />
      {project.locations.length === 0 && project.devices.length === 0 ? (
        <EmptyState title="Empty Project">
          Right-click the sidebar to create a location or unassigned device.
        </EmptyState>
      ) : null}
    </section>
  );
}
