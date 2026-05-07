import type { Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { SummaryGrid, WorkspaceHeader } from '../common/WorkspaceBits';

export function RackWorkspace({ rack }: { rack: Rack }) {
  const { project } = useProject();
  const location = project.locations.find((candidate) => candidate.id === rack.locationId);
  const devices = project.devices.filter((device) => device.rackId === rack.id);

  return (
    <section className="workspace" aria-label="Rack summary">
      <WorkspaceHeader eyebrow="Rack" title={rack.name} badge={`${rack.heightRu} RU`} />
      <SummaryGrid
        items={[
          ['Rack ID', rack.id],
          ['Location', location?.name ?? 'Unknown location'],
          ['Numbering', rack.numberingDirection],
          ['Rack devices', String(devices.length)],
        ]}
      />
      <section className="workspace-section">
        <h2>Rack Occupancy</h2>
        <p>
          {devices.length === 0
            ? 'No devices are assigned to this rack.'
            : `${devices.length} device(s) reference this rack.`}
        </p>
      </section>
    </section>
  );
}
