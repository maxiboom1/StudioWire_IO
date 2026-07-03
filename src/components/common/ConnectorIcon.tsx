import type { CSSProperties } from 'react';
import type { ConnectorIconKey } from '../../domain/types';
import { getConnectorIconLabel, resolveConnectorIconKey } from './connectorVisuals';

export function ConnectorIcon({
  iconKey,
  color,
  className = '',
  label,
  decorative = false,
}: {
  iconKey: ConnectorIconKey | string | null | undefined;
  color?: string;
  className?: string;
  label?: string;
  decorative?: boolean;
}) {
  const resolvedKey = resolveConnectorIconKey(iconKey);
  const accessibleLabel = label ?? `${getConnectorIconLabel(resolvedKey)} connector`;
  const style = color
    ? ({ '--connector-icon-color': color, '--device-port-color': color } as CSSProperties)
    : undefined;

  return (
    <span
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : accessibleLabel}
      className={`connector-icon connector-icon-${resolvedKey}${className ? ` ${className}` : ''}`}
      role={decorative ? undefined : 'img'}
      style={style}
      title={decorative ? undefined : accessibleLabel}
    >
      <span className="connector-icon-mark connector-icon-mark-a" />
      <span className="connector-icon-mark connector-icon-mark-b" />
      <span className="connector-icon-mark connector-icon-mark-c" />
      <span className="connector-icon-mark connector-icon-mark-d" />
      <span className="connector-icon-mark connector-icon-mark-e" />
      <span className="connector-icon-mark connector-icon-mark-f" />
    </span>
  );
}
