import type { SubLocation } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { SummaryGrid, WorkspaceHeader } from '../common/WorkspaceBits';

export function FolderWorkspace({ folder }: { folder: SubLocation }) {
  const { project } = useProject();
  const location = project.locations.find((candidate) => candidate.id === folder.locationId);
  const racks = project.racks.filter((rack) => rack.subLocationId === folder.id);
  const devices = project.devices.filter(
    (device) => device.subLocationId === folder.id && device.kind === 'device',
  );
  const terminalBlocks = project.devices.filter(
    (device) => device.subLocationId === folder.id && device.kind === 'terminal_block',
  );

  return (
    <section className="workspace" aria-label="Folder summary">
      <WorkspaceHeader eyebrow="Folder" title={folder.name} badge={location?.name ?? 'Unknown location'} />
      <SummaryGrid
        items={[
          ['Location', location?.name ?? 'Unknown'],
          ['Racks', String(racks.length)],
          ['Devices', String(devices.length)],
          ['TBs', String(terminalBlocks.length)],
        ]}
      />
      <p>{folder.description || 'No description set.'}</p>
    </section>
  );
}
