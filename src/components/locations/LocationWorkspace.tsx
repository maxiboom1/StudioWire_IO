import type { Location } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { SummaryGrid, WorkspaceHeader } from '../common/WorkspaceBits';

export function LocationWorkspace({
  location,
  onAddDevice,
}: {
  location: Location;
  onAddDevice: (locationId: string | null) => void;
}) {
  const { project } = useProject();
  const racks = project.racks.filter((rack) => rack.locationId === location.id);
  const devices = project.devices.filter((device) => device.locationId === location.id);

  return (
    <section className="workspace" aria-label="Location summary">
      <WorkspaceHeader eyebrow="Location" title={location.name} badge={location.type || 'Location'} />
      <SummaryGrid
        items={[
          ['Location ID', location.id],
          ['Type', location.type || 'Not set'],
          ['Racks', String(racks.length)],
          ['Devices', String(devices.length)],
        ]}
      />
      <section className="workspace-section">
        <div className="section-heading">
          <h2>Description</h2>
          <button type="button" onClick={() => onAddDevice(location.id)}>
            Add Device
          </button>
        </div>
        <p>{location.description || 'No description set.'}</p>
      </section>
      {racks.length === 0 && devices.length === 0 ? (
        <section className="empty-state workspace-section">
          <h2>No Rack Or Device Entries</h2>
          <p>Add a rack from the Navigator, or add a device directly to this location.</p>
        </section>
      ) : null}
    </section>
  );
}
