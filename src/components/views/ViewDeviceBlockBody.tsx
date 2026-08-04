import type { CSSProperties } from 'react';
import type { Device, ProjectRoot } from '../../domain/types';
import { ConnectorIcon } from '../common/ConnectorIcon';
import {
  buildDevicePresentationModel,
  buildTerminalBlockPresentationModel,
  type DevicePortPresentation,
} from '../devices/devicePresentationModel';

export function ViewDeviceBlockBody({ project, device }: { project: ProjectRoot; device: Device }) {
  if (device.kind === 'terminal_block') {
    const model = buildTerminalBlockPresentationModel(project, device);
    return (
      <div className="view-tb-rows" aria-label={`${device.name} rear and front connections`}>
        {model.pairs.map((pair) => (
          <div className="view-tb-row" key={pair.index}>
            <PortSummary row={pair.rear} side="left" fallback="N/C" />
            <span className="view-tb-index">{String(pair.index).padStart(2, '0')}</span>
            <PortSummary row={pair.front} side="right" fallback="N/C" />
          </div>
        ))}
      </div>
    );
  }

  const model = buildDevicePresentationModel(project, device);
  return (
    <div className="view-device-rows" aria-label={`${device.name} connections`}>
      {model.rows.map((row, index) => (
        <div className="view-device-row" key={index}>
          <PortSummary row={row.left} side="left" />
          <PortSummary row={row.right} side="right" />
        </div>
      ))}
    </div>
  );
}

function PortSummary({
  row,
  side,
  fallback = '',
}: {
  row: DevicePortPresentation | null | undefined;
  side: 'left' | 'right';
  fallback?: string;
}) {
  if (!row) {
    return <span className={`view-port-summary is-${side} is-empty`}>{fallback}</span>;
  }

  const marker = row.terminalBlockMarker?.marker ?? '';
  const detail = [row.cableNumbers.join(' / '), marker, row.remoteLabel].filter(Boolean).join(' · ');
  return (
    <span
      className={`view-port-summary is-${side}`}
      style={{ '--view-port-color': row.accentColor } as CSSProperties}
      title={[row.port.label, detail].filter(Boolean).join(' — ')}
    >
      {side === 'left' ? <ConnectorIcon decorative iconKey={row.iconKey} color={row.accentColor} /> : null}
      <span>
        <strong>{row.port.label}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      {side === 'right' ? <ConnectorIcon decorative iconKey={row.iconKey} color={row.accentColor} /> : null}
    </span>
  );
}
