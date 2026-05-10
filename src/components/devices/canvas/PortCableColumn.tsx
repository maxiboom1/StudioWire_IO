import type { Cable, Endpoint, Port, PortGroup, ProjectRoot } from '../../../domain/types';
import { CableStubLine } from './CableStubLine';

export function PortCableColumn({
  title,
  side,
  groups,
  ports,
  project,
}: {
  title: string;
  side: 'left' | 'right';
  groups: PortGroup[];
  ports: Port[];
  project: ProjectRoot;
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
              {groupPorts.map((port) => (
                <PortCableStack key={port.id} port={port} project={project} side={side} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PortCableStack({ port, project, side }: { port: Port; project: ProjectRoot; side: 'left' | 'right' }) {
  const activeCables = project.cables.filter((cable) => cable.status !== 'retired' && cableReferencesPort(cable, port.id));

  if (activeCables.length === 0) {
    return <CableStubLine side={side} portLabel={port.label} cableNumber={null} oppositeLabel="Unplanned endpoint" />;
  }

  return (
    <div className={activeCables.length > 1 ? 'cable-stub-stack cable-stub-stack-warning' : 'cable-stub-stack'}>
      {activeCables.map((cable) => (
        <CableStubLine
          key={cable.id}
          side={side}
          portLabel={port.label}
          cableNumber={cable.number}
          oppositeLabel={getOppositeEndpointLabel(project, cable, port.id)}
          warningLabel={activeCables.length > 1 ? `${activeCables.length} active cables on this port` : undefined}
        />
      ))}
    </div>
  );
}

function cableReferencesPort(cable: Cable, portId: string): boolean {
  return endpointReferencesPort(cable.sourceEndpoint, portId) || endpointReferencesPort(cable.destinationEndpoint, portId);
}

function endpointReferencesPort(endpoint: Endpoint, portId: string): boolean {
  return endpoint.type === 'device_port' && endpoint.id === portId;
}

function getOppositeEndpointLabel(project: ProjectRoot, cable: Cable, portId: string): string {
  const opposite = endpointReferencesPort(cable.sourceEndpoint, portId) ? cable.destinationEndpoint : cable.sourceEndpoint;

  if (opposite.type === 'device_port' && opposite.id) {
    const port = project.ports.find((candidate) => candidate.id === opposite.id);
    const device = port ? project.devices.find((candidate) => candidate.id === port.deviceId) : null;

    return [device?.name, port?.label ?? opposite.label].filter(Boolean).join(' / ') || opposite.label;
  }

  if (opposite.type === 'tb_port' && opposite.id) {
    const port = project.terminalBlockPorts.find((candidate) => candidate.id === opposite.id);
    const terminalBlock = port
      ? project.terminalBlocks.find((candidate) => candidate.id === port.terminalBlockId)
      : null;

    return [terminalBlock?.name, port?.label ?? opposite.label].filter(Boolean).join(' / ') || opposite.label;
  }

  return opposite.label || (opposite.type === 'unknown' ? 'Open endpoint' : 'External endpoint');
}
