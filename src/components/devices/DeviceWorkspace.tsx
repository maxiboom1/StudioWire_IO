import type { Device, ProjectRoot } from '../../domain/types';
import { formatCableNumber } from '../../domain/cableNumbers';
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

export function DeviceWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
  const location = device.locationId ? project.locations.find((candidate) => candidate.id === device.locationId) : null;
  const rack = device.rackId ? project.racks.find((candidate) => candidate.id === device.rackId) : null;
  const category = project.settings.categories.find((candidate) => candidate.id === device.categoryId);
  const portGroups = project.portGroups.filter((group) => group.deviceId === device.id);
  const ports = project.ports.filter((port) => port.deviceId === device.id);
  const cablesById = new Map(project.cables.map((cable) => [cable.id, cable]));
  const groupsByDirection = {
    input: portGroups.filter((group) => group.direction === 'input'),
    output: portGroups.filter((group) => group.direction === 'output'),
    bidirectional: portGroups.filter((group) => group.direction === 'bidirectional'),
  };

  return (
    <section className="workspace" aria-label="Device canvas">
      <WorkspaceHeader eyebrow="Device" title={device.name} badge={device.code || device.mountType} />
      <SummaryGrid
        items={[
          ['Code', device.code || 'Not set'],
          ['Category', category?.name ?? 'Unknown category'],
          ['Location', location?.name ?? 'No location'],
          ['Rack', rack?.name ?? 'No rack'],
          ['Mount', device.mountType],
          ['Status', device.status],
        ]}
      />
      <WorkspaceCard title="Port Groups" description={`${portGroups.length} group(s), ${ports.length} generated port(s).`}>
        {portGroups.length === 0 ? (
          <p className="panel-empty">No port groups generated.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Cable Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.direction}</TableCell>
                  <TableCell>{group.count}</TableCell>
                  <TableCell>
                    {group.firstCableNumber && group.lastCableNumber
                      ? `${formatCableNumber(group.cablePrefix, group.firstCableNumber)} to ${formatCableNumber(
                          group.cablePrefix,
                          group.lastCableNumber,
                        )}`
                      : 'No planned cables'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </WorkspaceCard>
      <div className="device-canvas">
        <div className={device.status === 'retired' ? 'device-block retired' : 'device-block'}>
          <div className="device-title">
            <strong>{device.name}</strong>
            <span>{device.status === 'retired' ? 'Retired' : device.code || device.labelPrefix || 'No code'}</span>
          </div>
          <div className="device-io-grid">
            <PortGroupColumn
              title="Inputs"
              groups={groupsByDirection.input}
              ports={ports}
              cablesById={cablesById}
            />
            <div className="device-core">
              <span>{device.manufacturer || 'Manufacturer not set'}</span>
              <strong>{device.model || device.role || 'Device'}</strong>
              <small>{device.mountType}</small>
            </div>
            <PortGroupColumn
              title="Outputs"
              groups={groupsByDirection.output}
              ports={ports}
              cablesById={cablesById}
            />
          </div>
          <div className="bidirectional-groups">
            <PortGroupColumn
              title="Bidirectional"
              groups={groupsByDirection.bidirectional}
              ports={ports}
              cablesById={cablesById}
            />
          </div>
        </div>
        {ports.length === 0 ? (
          <EmptyState title="No Generated Ports">
            This device has no port groups yet. v0.1 locks port group creation to the Add Device workflow.
          </EmptyState>
        ) : null}
      </div>
    </section>
  );
}

function PortGroupColumn({
  title,
  groups,
  ports,
  cablesById,
}: {
  title: string;
  groups: ProjectRoot['portGroups'];
  ports: ProjectRoot['ports'];
  cablesById: Map<string, ProjectRoot['cables'][number]>;
}) {
  return (
    <div className="port-group-column">
      <h2>{title}</h2>
      {groups.length === 0 ? <p>No ports</p> : null}
      {groups.map((group) => {
        const groupPorts = ports.filter((port) => port.portGroupId === group.id);

        return (
          <section className="canvas-port-group" key={group.id}>
            <h3>{group.name}</h3>
            <div className="canvas-port-list">
              {groupPorts.map((port) => {
                const cable = port.plannedCableId ? cablesById.get(port.plannedCableId) : null;

                return (
                  <div className="canvas-port" key={port.id}>
                    <span>{port.label}</span>
                    <strong>{cable?.number ?? 'No cable'}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
