import { cn } from '../../../lib/utils';
import type { EndpointMeta } from '../../../domain/canvasDrag';
import { EndpointHandle } from './EndpointHandle';

export function CableStubLine({
  endpointMeta,
  side,
  portLabel,
  cableNumber,
  oppositeLabel,
  warningLabel,
}: {
  endpointMeta?: EndpointMeta;
  side: 'left' | 'right';
  portLabel: string;
  cableNumber: string | null;
  oppositeLabel: string;
  warningLabel?: string;
}) {
  const hasCable = Boolean(cableNumber);

  return (
    <div
      className={cn(
        'cable-stub-line',
        side === 'left' ? 'cable-stub-line-left' : 'cable-stub-line-right',
        !hasCable ? 'cable-stub-line-empty' : null,
        warningLabel ? 'cable-stub-line-warning' : null,
      )}
    >
      <div className="cable-stub-port-label">{portLabel}</div>
      <div className="cable-stub-track" aria-hidden="true">
        {side === 'left' ? (
          <EndpointHandle endpointMeta={endpointMeta} side="left" warning={Boolean(warningLabel)} />
        ) : null}
        <span className="cable-stub-track-rule" />
        {side === 'right' ? (
          <EndpointHandle endpointMeta={endpointMeta} side="right" warning={Boolean(warningLabel)} />
        ) : null}
      </div>
      <div className="cable-stub-meta">
        <strong>{cableNumber ?? 'No cable'}</strong>
        <span>{oppositeLabel}</span>
      </div>
      {warningLabel ? <div className="cable-stub-warning">{warningLabel}</div> : null}
    </div>
  );
}
