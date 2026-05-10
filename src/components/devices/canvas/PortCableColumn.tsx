import type { Cable, Endpoint, Port, PortGroup, ProjectRoot } from '../../../domain/types';
import type { CrosspointAnchor } from '../../common/CrosspointPanel';
import { Button } from '../../ui/button';
import { CableStubLine } from './CableStubLine';

export function PortCableColumn({
  title,
  side,
  groups,
  ports,
  project,
  onSelectAnchor,
  onDisconnectEndpoint,
}: {
  title: string;
  side: 'left' | 'right';
  groups: PortGroup[];
  ports: Port[];
  project: ProjectRoot;
  onSelectAnchor?: (anchor: CrosspointAnchor) => void;
  onDisconnectEndpoint?: (input: { cableId: string; side: 'source' | 'destination' }) => void;
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
                <PortCableStack
                  key={port.id}
                  onDisconnectEndpoint={onDisconnectEndpoint}
                  onSelectAnchor={onSelectAnchor}
                  port={port}
                  project={project}
                  side={side}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PortCableStack({
  onDisconnectEndpoint,
  onSelectAnchor,
  port,
  project,
  side,
}: {
  onDisconnectEndpoint?: (input: { cableId: string; side: 'source' | 'destination' }) => void;
  onSelectAnchor?: (anchor: CrosspointAnchor) => void;
  port: Port;
  project: ProjectRoot;
  side: 'left' | 'right';
}) {
  const activeCables = project.cables.filter((cable) => cable.status !== 'retired' && cableReferencesPort(cable, port.id));
  const endpoint: Endpoint = { type: 'device_port', id: port.id, label: port.label };

  if (activeCables.length === 0) {
    return (
      <div className="cable-stub-stack">
        <CableStubLine side={side} portLabel={port.label} cableNumber={null} oppositeLabel="Unplanned endpoint" />
        {onSelectAnchor ? (
          <div className="crosspoint-inline-actions">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onSelectAnchor({ endpoint, label: `New cable from ${port.label}` })}
            >
              Create Cable
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={activeCables.length > 1 ? 'cable-stub-stack cable-stub-stack-warning' : 'cable-stub-stack'}>
      {activeCables.map((cable) => (
        <div className="cable-stub-with-actions" key={cable.id}>
          <CableStubLine
            side={side}
            portLabel={port.label}
            cableNumber={cable.number}
            oppositeLabel={getOppositeEndpointLabel(project, cable, port.id)}
            warningLabel={activeCables.length > 1 ? `${activeCables.length} active cables on this port` : undefined}
          />
          <CableActions
            cable={cable}
            endpoint={endpoint}
            onDisconnectEndpoint={onDisconnectEndpoint}
            onSelectAnchor={onSelectAnchor}
            portLabel={port.label}
          />
        </div>
      ))}
    </div>
  );
}

function CableActions({
  cable,
  endpoint,
  onDisconnectEndpoint,
  onSelectAnchor,
  portLabel,
}: {
  cable: Cable;
  endpoint: Endpoint;
  onDisconnectEndpoint?: (input: { cableId: string; side: 'source' | 'destination' }) => void;
  onSelectAnchor?: (anchor: CrosspointAnchor) => void;
  portLabel: string;
}) {
  const unknownSide = getUnknownSide(cable);

  return (
    <div className="crosspoint-inline-actions">
      {unknownSide && onSelectAnchor ? (
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            onSelectAnchor({
              endpoint,
              cableId: cable.id,
              side: unknownSide,
              label: `${cable.number} from ${portLabel}`,
            })
          }
        >
          Connect
        </Button>
      ) : null}
      {!isUnknownEndpoint(cable.sourceEndpoint) && onDisconnectEndpoint ? (
        <Button size="sm" type="button" variant="ghost" onClick={() => onDisconnectEndpoint({ cableId: cable.id, side: 'source' })}>
          Disconnect source
        </Button>
      ) : null}
      {!isUnknownEndpoint(cable.destinationEndpoint) && onDisconnectEndpoint ? (
        <Button size="sm" type="button" variant="ghost" onClick={() => onDisconnectEndpoint({ cableId: cable.id, side: 'destination' })}>
          Disconnect destination
        </Button>
      ) : null}
    </div>
  );
}

function cableReferencesPort(cable: Cable, portId: string): boolean {
  return endpointReferencesPort(cable.sourceEndpoint, portId) || endpointReferencesPort(cable.destinationEndpoint, portId);
}

function endpointReferencesPort(endpoint: Endpoint, portId: string): boolean {
  return endpoint.type === 'device_port' && endpoint.id === portId;
}

function getUnknownSide(cable: Cable): 'source' | 'destination' | null {
  if (isUnknownEndpoint(cable.sourceEndpoint)) {
    return 'source';
  }

  if (isUnknownEndpoint(cable.destinationEndpoint)) {
    return 'destination';
  }

  return null;
}

function isUnknownEndpoint(endpoint: Endpoint): boolean {
  return endpoint.type === 'unknown' || endpoint.id === null;
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
