import type { PointerEventHandler } from 'react';
import type { Device, ProjectRoot } from '../../domain/types';
import { CrosspointPicker } from '../connections/CrosspointPicker';
import { buildTerminalBlockPresentationModel } from './devicePresentationModel';

export function TerminalBlockDiagram({
  project,
  device,
  displayName = device.name,
  readOnly = false,
  variant = 'workspace',
  onHeaderPointerDown,
}: {
  project: ProjectRoot;
  device: Device;
  displayName?: string;
  readOnly?: boolean;
  variant?: 'workspace' | 'view';
  onHeaderPointerDown?: PointerEventHandler<HTMLDivElement>;
}) {
  const model = buildTerminalBlockPresentationModel(project, device);
  return (
    <div className={`terminal-block-diagram${variant === 'view' ? ' terminal-block-diagram-view' : ''}`}>
      <div
        className={`terminal-block-name${onHeaderPointerDown ? ' is-draggable' : ''}`}
        onPointerDown={onHeaderPointerDown}
      >
        {displayName}
      </div>
      <div className="terminal-block-panel" role="img" aria-label={`${displayName} terminal block panel`}>
        {model.pairs.map((pair) => (
          <div className="terminal-block-port" key={pair.index}>
            <span className="terminal-block-port-number">{String(pair.index).padStart(2, '0')}</span>
            <span className="terminal-block-rear-label">{pair.rear?.connection.chainLabel || 'N/C'}</span>
            <span className="terminal-block-cable-number">{pair.rear?.connection.cable?.number ?? ''}</span>
            <span className="terminal-block-connector-wrap">
              {pair.rear ? (
                <TerminalBlockConnectionPoint
                  ariaLabel={`Connect ${pair.rear.deviceLabel}`}
                  className="terminal-block-crosspoint terminal-block-crosspoint-rear"
                  portId={pair.rear.port.id}
                  readOnly={readOnly}
                />
              ) : null}
              <span className="terminal-block-connector" aria-hidden="true" />
              {pair.front ? (
                <TerminalBlockConnectionPoint
                  ariaLabel={`Connect ${pair.front.deviceLabel}`}
                  className="terminal-block-crosspoint terminal-block-crosspoint-front"
                  portId={pair.front.port.id}
                  readOnly={readOnly}
                />
              ) : null}
            </span>
            <span className="terminal-block-front-label">{pair.front?.connection.chainLabel || 'N/C'}</span>
            <span className="terminal-block-cable-number">{pair.front?.connection.cable?.number ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TerminalBlockConnectionPoint({
  ariaLabel,
  className,
  portId,
  readOnly,
}: {
  ariaLabel: string;
  className: string;
  portId: string;
  readOnly: boolean;
}) {
  return readOnly ? (
    <span aria-hidden="true" className={`${className} is-read-only`} />
  ) : (
    <CrosspointPicker ariaLabel={ariaLabel} className={className} portId={portId} />
  );
}
