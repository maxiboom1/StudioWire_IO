import type { Device, ProjectRoot } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { WorkspaceHeader } from '../common/WorkspaceBits';

export function DeviceWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
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
          <section className="empty-state">
            <h2>No Generated Ports</h2>
            <p>This device has no port groups yet. v0.1 locks port group creation to the Add Device workflow.</p>
          </section>
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
