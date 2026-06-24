import type { Location } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { EmptyState, SummaryGrid, WorkspaceCard, WorkspaceHeader } from '../common/WorkspaceBits';

export function LocationWorkspace({
  location,
  onAddDevice,
  onAddTerminalBlock,
}: {
  location: Location;
  onAddDevice: (locationId: string | null) => void;
  onAddTerminalBlock: (locationId: string | null) => void;
}) {
  const { project } = useProject();
  const racks = project.racks.filter((rack) => rack.locationId === location.id);
  const devices = project.devices.filter(
    (device) => device.locationId === location.id && device.kind !== 'terminal_block',
  );
  const terminalBlocks = project.devices.filter(
    (device) => device.locationId === location.id && device.kind === 'terminal_block',
  );

  return (
    <section className="workspace" aria-label="Location summary">
      <WorkspaceHeader eyebrow="Location" title={location.name} badge={location.type || 'Location'} />
      <SummaryGrid
        items={[
          ['Location ID', location.id],
          ['Type', location.type || 'Not set'],
          ['Racks', String(racks.length)],
          ['Devices', String(devices.length)],
          ['TBs', String(terminalBlocks.length)],
        ]}
      />
      <WorkspaceCard
        title="Description"
        action={
          <div className="workspace-card-actions">
            <Button variant="outline" size="sm" type="button" onClick={() => onAddDevice(location.id)}>
              Add Device
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={() => onAddTerminalBlock(location.id)}>
              Add TB
            </Button>
          </div>
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
      <WorkspaceCard
        title="TBs"
        description={`${terminalBlocks.length} terminal block(s) assigned to this location.`}
      >
        {terminalBlocks.length === 0 ? (
          <p className="panel-empty">No terminal blocks in this location.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rack</TableHead>
                <TableHead>RU</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terminalBlocks.map((device) => {
                const rack = device.rackId
                  ? project.racks.find((candidate) => candidate.id === device.rackId)
                  : null;

                return (
                  <TableRow key={device.id}>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>{rack?.name ?? 'Not assigned'}</TableCell>
                    <TableCell>{device.rackBottomRu ? `RU ${device.rackBottomRu}` : 'Not placed'}</TableCell>
                    <TableCell>{device.status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </WorkspaceCard>
      {racks.length === 0 && devices.length === 0 && terminalBlocks.length === 0 ? (
        <EmptyState title="No Rack Or Device Entries">
          Right-click this location in the sidebar to add a rack, device, or TB.
        </EmptyState>
      ) : null}
    </section>
  );
}
