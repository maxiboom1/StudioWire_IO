import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { CrosspointPicker } from '../connections/CrosspointPicker';
import { buildTerminalBlockPresentationModel } from './devicePresentationModel';

export function TerminalBlockWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
  const model = buildTerminalBlockPresentationModel(project, device);

  return (
    <section className="workspace terminal-block-workspace" aria-label="Terminal block canvas">
      <div className="terminal-block-canvas">
        <div className="terminal-block-diagram">
          <div className="terminal-block-name">{device.name}</div>
          <div className="terminal-block-panel" role="img" aria-label={`${device.name} terminal block panel`}>
            {model.pairs.map((pair) => (
              <div className="terminal-block-port" key={pair.index}>
                <span className="terminal-block-port-number">{String(pair.index).padStart(2, '0')}</span>
                <span className="terminal-block-rear-label">{pair.rear?.connection.chainLabel || 'N/C'}</span>
                <span className="terminal-block-cable-number">
                  {pair.rear?.connection.cable?.number ?? ''}
                </span>
                <span className="terminal-block-connector-wrap">
                  {pair.rear ? (
                    <CrosspointPicker
                      ariaLabel={`Connect ${pair.rear.port.label}`}
                      className="terminal-block-crosspoint terminal-block-crosspoint-rear"
                      portId={pair.rear.port.id}
                    />
                  ) : null}
                  <span className="terminal-block-connector" aria-hidden="true" />
                  {pair.front ? (
                    <CrosspointPicker
                      ariaLabel={`Connect ${pair.front.port.label}`}
                      className="terminal-block-crosspoint terminal-block-crosspoint-front"
                      portId={pair.front.port.id}
                    />
                  ) : null}
                </span>
                <span className="terminal-block-front-label">
                  {pair.front?.connection.chainLabel || 'N/C'}
                </span>
                <span className="terminal-block-cable-number">
                  {pair.front?.connection.cable?.number ?? ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
