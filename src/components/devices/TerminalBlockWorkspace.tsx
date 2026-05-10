import type { Cable, Device, Port } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';

interface TerminalBlockPortPair {
  index: number;
  rear: Port | null;
  front: Port | null;
  frontCable: Cable | null;
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
  const cablesById = new Map(project.cables.map((cable) => [cable.id, cable]));
  const connectorCount = Math.max(rearPorts.length, frontPorts.length, 1);
  const pairs: TerminalBlockPortPair[] = Array.from({ length: connectorCount }, (_, offset) => {
    const rear = rearPorts[offset] ?? null;
    const front = frontPorts[offset] ?? null;

    return {
      index: offset + 1,
      rear,
      front,
      frontCable: front?.plannedCableId ? cablesById.get(front.plannedCableId) ?? null : null,
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
                <span className="terminal-block-rear-label">Not Connected</span>
                <span className="terminal-block-connector" aria-hidden="true" />
                <span className="terminal-block-front-label">Not Connected</span>
                <span className="terminal-block-cable-number">{pair.frontCable?.number ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
