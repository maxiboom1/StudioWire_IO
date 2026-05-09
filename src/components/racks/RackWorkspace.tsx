import type { Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { EmptyState, SummaryGrid, WorkspaceCard, WorkspaceHeader } from '../common/WorkspaceBits';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

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
      <WorkspaceCard title="Rack Occupancy" description={`${devices.length} device(s) reference this rack.`}>
        {devices.length === 0 ? (
          <p className="panel-empty">No devices are assigned to this rack.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Bottom RU</TableHead>
                <TableHead>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.code || 'Not set'}</TableCell>
                  <TableCell>{device.rackBottomRu ?? 'Not set'}</TableCell>
                  <TableCell>{device.rackSizeRu ? `${device.rackSizeRu} RU` : 'Not set'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </WorkspaceCard>
      {devices.length === 0 ? (
        <EmptyState title="Rack Is Empty">Assign rack-mounted devices from the device inspector.</EmptyState>
      ) : null}
    </section>
  );
}
