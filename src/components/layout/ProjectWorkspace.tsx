import { useProject } from '../../state/ProjectContext';
import { formatDate } from '../common/selection';
import { SummaryGrid, WorkspaceHeader } from '../common/WorkspaceBits';

export function ProjectWorkspace() {
  const { project } = useProject();
  const metrics = [
    ['Locations', project.locations.length],
    ['Racks', project.racks.length],
    ['Devices', project.devices.length],
    ['Port groups', project.portGroups.length],
    ['Ports', project.ports.length],
    ['Cables', project.cables.length],
  ] as const;

  return (
    <section className="workspace" aria-label="Project summary">
      <WorkspaceHeader eyebrow="Project" title={project.project.name} badge={`Schema ${project.schemaVersion}`} />
      <SummaryGrid
        items={[
          ['Customer', project.project.customer || 'Not set'],
          ['Revision', project.project.revision],
          ['Status', project.project.status],
          ['Updated', formatDate(project.project.updatedAt)],
        ]}
      />
      <div className="metric-grid" aria-label="Project object counts">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {project.locations.length === 0 && project.devices.length === 0 ? (
        <section className="empty-state workspace-section">
          <h2>Empty Project</h2>
          <p>Create a location from the Navigator to start building the project structure.</p>
        </section>
      ) : null}
    </section>
  );
}
