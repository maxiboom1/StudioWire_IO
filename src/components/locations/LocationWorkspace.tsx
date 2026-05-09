import type { Location } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { EmptyState, SummaryGrid, WorkspaceCard, WorkspaceHeader } from '../common/WorkspaceBits';

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
      <WorkspaceCard
        title="Description"
        action={
          <Button variant="outline" size="sm" type="button" onClick={() => onAddDevice(location.id)}>
            Add Device
          </Button>
        }
      >
        <p>{location.description || 'No description set.'}</p>
      </WorkspaceCard>
      <WorkspaceCard title="Racks" description={`${racks.length} rack(s) in this location.`}>
        {racks.length === 0 ? (
          <p className="panel-empty">No racks yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Height</TableHead>
                <TableHead>Direction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {racks.map((rack) => (
                <TableRow key={rack.id}>
                  <TableCell>{rack.name}</TableCell>
                  <TableCell>{rack.heightRu} RU</TableCell>
                  <TableCell>{rack.numberingDirection}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </WorkspaceCard>
      <WorkspaceCard title="Devices" description={`${devices.length} device(s) assigned to this location.`}>
        {devices.length === 0 ? (
          <p className="panel-empty">No devices in this location.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Mount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>{device.name}</TableCell>
                  <TableCell>{device.code || 'Not set'}</TableCell>
                  <TableCell>{device.mountType}</TableCell>
                  <TableCell>{device.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </WorkspaceCard>
      {racks.length === 0 && devices.length === 0 ? (
        <EmptyState title="No Rack Or Device Entries">
          Right-click this location in the sidebar to add a rack or device.
        </EmptyState>
      ) : null}
    </section>
  );
}
