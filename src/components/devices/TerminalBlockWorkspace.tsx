import { describePortConnection, type PortConnectionSummary } from '../../domain/connections';
import type { Device, Port } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { CrosspointPicker } from '../connections/CrosspointPicker';

interface TerminalBlockPortPair {
  index: number;
  rear: Port | null;
  front: Port | null;
  rearConnection: PortConnectionSummary | null;
  frontConnection: PortConnectionSummary | null;
}

export function TerminalBlockWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
  const portGroups = project.portGroups.filter((group) => group.deviceId === device.id);
  const rearGroupIds = new Set(portGroups.filter((group) => group.direction === 'rear').map((group) => group.id));
  const frontGroupIds = new Set(portGroups.filter((group) => group.direction === 'front').map((group) => group.id));
  const rearPorts = project.ports
    .filter((port) => rearGroupIds.has(port.portGroupId))
    .sort((left, right) => left.index - right.index);
  const frontPorts = project.ports
    .filter((port) => frontGroupIds.has(port.portGroupId))
    .sort((left, right) => left.index - right.index);
  const connectorCount = Math.max(rearPorts.length, frontPorts.length, 1);
  const pairs: TerminalBlockPortPair[] = Array.from({ length: connectorCount }, (_, offset) => {
    const rear = rearPorts[offset] ?? null;
    const front = frontPorts[offset] ?? null;

    return {
      index: offset + 1,
      rear,
      front,
      rearConnection: rear ? describePortConnection(project, rear.id) : null,
      frontConnection: front ? describePortConnection(project, front.id) : null,
    };
  });

  return (
    <section className="workspace terminal-block-workspace" aria-label="Terminal block canvas">
      <div className="terminal-block-canvas">
        <div className={device.status === 'retired' ? 'terminal-block-diagram retired' : 'terminal-block-diagram'}>
          <div className="terminal-block-name">{device.name}</div>
          <div className="terminal-block-panel" role="img" aria-label={`${device.name} terminal block panel`}>
            {pairs.map((pair) => (
              <div className="terminal-block-port" key={pair.index}>
                <span className="terminal-block-port-number">{String(pair.index).padStart(2, '0')}</span>
                <span className="terminal-block-rear-label">
                  {pair.rearConnection?.chainLabel || 'N/C'}
                </span>
                <span className="terminal-block-cable-number">{pair.rearConnection?.cable?.number ?? ''}</span>
                <span className="terminal-block-connector-wrap">
                  {pair.rear ? (
                    <CrosspointPicker
                      ariaLabel={`Connect ${pair.rear.label}`}
                      className="terminal-block-crosspoint terminal-block-crosspoint-rear"
                      portId={pair.rear.id}
                    />
                  ) : null}
                  <span className="terminal-block-connector" aria-hidden="true" />
                  {pair.front ? (
                    <CrosspointPicker
                      ariaLabel={`Connect ${pair.front.label}`}
                      className="terminal-block-crosspoint terminal-block-crosspoint-front"
                      portId={pair.front.id}
                    />
                  ) : null}
                </span>
                <span className="terminal-block-front-label">
                  {pair.frontConnection?.chainLabel || 'N/C'}
                </span>
                <span className="terminal-block-cable-number">{pair.frontConnection?.cable?.number ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
