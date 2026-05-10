import { findActiveCablesForEndpoint } from '../../../domain/terminalBlockCables';
import type { Cable, Endpoint, ProjectRoot, TerminalBlockPort } from '../../../domain/types';
import type { CrosspointAnchor } from '../../common/CrosspointPanel';
import { Button } from '../../ui/button';
import { EndpointHandle } from '../../devices/canvas/EndpointHandle';
import { getOppositeEndpointLabel } from './terminalBlockCanvasModel';

export function TerminalBlockFaceLine({
  face,
  port,
  project,
  onSelectAnchor,
  onDisconnectEndpoint,
}: {
  face: 'rear' | 'front';
  port: TerminalBlockPort | null;
  project: ProjectRoot;
  onSelectAnchor?: (anchor: CrosspointAnchor) => void;
  onDisconnectEndpoint?: (input: { cableId: string; side: 'source' | 'destination' }) => void;
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
    return (
      <div className="tb-face-stack">
        <FaceCable face={face} cable={null} port={port} project={project} />
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
    <div className={activeCables.length > 1 ? 'tb-face-stack tb-face-stack-warning' : 'tb-face-stack'}>
      {activeCables.map((cable) => (
        <FaceCable
          cable={cable}
          face={face}
          key={cable.id}
          onDisconnectEndpoint={onDisconnectEndpoint}
          onSelectAnchor={onSelectAnchor}
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
  onDisconnectEndpoint,
  onSelectAnchor,
  warningLabel,
}: {
  cable: Cable | null;
  face: 'rear' | 'front';
  missing?: boolean;
  port: TerminalBlockPort | null;
  project: ProjectRoot;
  onDisconnectEndpoint?: (input: { cableId: string; side: 'source' | 'destination' }) => void;
  onSelectAnchor?: (anchor: CrosspointAnchor) => void;
  warningLabel?: string;
}) {
  const statusLabel = missing ? 'No port' : cable?.number ?? 'Available';
  const metaLabel = missing
    ? 'Missing endpoint record'
    : cable && port
      ? getOppositeEndpointLabel(project, cable, port.id)
      : 'No active cable';

  return (
    <div className="tb-face-with-actions">
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
      {cable && port ? (
        <CableActions
          cable={cable}
          endpoint={{ type: 'tb_port', id: port.id, label: port.label }}
          onDisconnectEndpoint={onDisconnectEndpoint}
          onSelectAnchor={onSelectAnchor}
          portLabel={port.label}
        />
      ) : null}
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
