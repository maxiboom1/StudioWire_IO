import { findActiveCablesForEndpoint } from '../../../domain/terminalBlockCables';
import type { Cable, Endpoint, ProjectRoot, TerminalBlockPort } from '../../../domain/types';
import { EndpointHandle } from '../../devices/canvas/EndpointHandle';
import { getOppositeEndpointLabel } from './terminalBlockCanvasModel';

export function TerminalBlockFaceLine({
  face,
  port,
  project,
}: {
  face: 'rear' | 'front';
  port: TerminalBlockPort | null;
  project: ProjectRoot;
}) {
  if (!port) {
    return <FaceCable face={face} cable={null} port={null} project={project} missing />;
  }

  const endpoint: Endpoint = {
    type: 'tb_port',
    id: port.id,
    label: port.label,
  };
  const activeCables = findActiveCablesForEndpoint(project, endpoint);

  if (activeCables.length === 0) {
    return <FaceCable face={face} cable={null} port={port} project={project} />;
  }

  return (
    <div className={activeCables.length > 1 ? 'tb-face-stack tb-face-stack-warning' : 'tb-face-stack'}>
      {activeCables.map((cable) => (
        <FaceCable
          cable={cable}
          face={face}
          key={cable.id}
          port={port}
          project={project}
          warningLabel={activeCables.length > 1 ? `${activeCables.length} active cables on this face` : undefined}
        />
      ))}
    </div>
  );
}

function FaceCable({
  cable,
  face,
  missing = false,
  port,
  project,
  warningLabel,
}: {
  cable: Cable | null;
  face: 'rear' | 'front';
  missing?: boolean;
  port: TerminalBlockPort | null;
  project: ProjectRoot;
  warningLabel?: string;
}) {
  const statusLabel = missing ? 'No port' : cable?.number ?? 'Available';
  const metaLabel = missing
    ? 'Missing endpoint record'
    : cable && port
      ? getOppositeEndpointLabel(project, cable, port.id)
      : 'No active cable';

  return (
    <div
      className={[
        'tb-face-line',
        `tb-face-line-${face}`,
        cable ? null : 'tb-face-line-empty',
        warningLabel ? 'tb-face-line-warning' : null,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="tb-face-label">{face}</div>
      <div className="tb-face-track" aria-hidden="true">
        {face === 'front' ? <EndpointHandle side="left" warning={Boolean(warningLabel)} /> : null}
        <span />
        {face === 'rear' ? <EndpointHandle side="right" warning={Boolean(warningLabel)} /> : null}
      </div>
      <div className="tb-face-meta">
        <strong>{statusLabel}</strong>
        <span>{metaLabel}</span>
      </div>
      {warningLabel ? <div className="tb-face-warning">{warningLabel}</div> : null}
    </div>
  );
}
