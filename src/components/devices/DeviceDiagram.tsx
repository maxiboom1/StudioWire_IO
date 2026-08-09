import { useMemo, type CSSProperties, type PointerEvent, type PointerEventHandler } from 'react';
import type { PortConnectionChainPart } from '../../domain/connections';
import type { Device, ProjectRoot, ViewLineEndpoint } from '../../domain/types';
import { ConnectorIcon } from '../common/ConnectorIcon';
import { CrosspointPicker } from '../connections/CrosspointPicker';
import { buildDevicePresentationModel, type DevicePortPresentation } from './devicePresentationModel';

export interface DeviceDiagramViewLineAnchors {
  placementId: string;
  coveredPortIds: ReadonlySet<string>;
  onSelect?: (endpoint: ViewLineEndpoint) => void;
  getReconnectRole?: (endpoint: ViewLineEndpoint) => 'from' | 'to' | null;
  isReconnectTarget?: (endpoint: ViewLineEndpoint) => boolean;
  reconnecting?: boolean;
  onBeginReconnect?: (
    event: PointerEvent<HTMLElement>,
    endpoint: ViewLineEndpoint,
    role: 'from' | 'to',
  ) => void;
}

export function DeviceDiagram({
  project,
  device,
  displayName = device.name,
  variant = 'workspace',
  readOnly = false,
  onHeaderPointerDown,
  viewLineAnchors,
}: {
  project: ProjectRoot;
  device: Device;
  displayName?: string;
  variant?: 'workspace' | 'view';
  readOnly?: boolean;
  onHeaderPointerDown?: PointerEventHandler<HTMLDivElement>;
  viewLineAnchors?: DeviceDiagramViewLineAnchors;
}) {
  const model = useMemo(() => buildDevicePresentationModel(project, device), [device, project]);
  const rowIndexes = Array.from({ length: model.rowCount }, (_, index) => index);
  const diagramStyle = { '--device-port-rows': model.rowCount } as CSSProperties;

  const diagram = (
    <div
      aria-label={`${displayName} connections`}
      className={`device-diagram${variant === 'view' ? ' device-diagram-view' : ''}`}
      style={diagramStyle}
    >
      <div className="device-line-column device-line-column-left" aria-label="Input cable rows">
        <div className="device-line-header-spacer" />
        {rowIndexes.map((index) => (
          <CableLineRow
            key={`input-${index}`}
            readOnly={readOnly}
            row={model.rows[index]?.left}
            side="input"
            viewLineAnchors={viewLineAnchors}
          />
        ))}
      </div>
      <div className="device-body">
        <div
          className={`device-body-header${onHeaderPointerDown ? ' is-draggable' : ''}`}
          onPointerDown={onHeaderPointerDown}
        >
          <strong>{displayName}</strong>
          <span>{device.code ?? ''}</span>
        </div>
        {rowIndexes.map((index) => (
          <div className="device-body-row" key={`body-${index}`}>
            <DevicePortLabel row={model.rows[index]?.left} side="input" />
            <DevicePortLabel row={model.rows[index]?.right} side="output" />
          </div>
        ))}
      </div>
      <div className="device-line-column device-line-column-right" aria-label="Output cable rows">
        <div className="device-line-header-spacer" />
        {rowIndexes.map((index) => (
          <CableLineRow
            key={`output-${index}`}
            readOnly={readOnly}
            row={model.rows[index]?.right}
            side="output"
            viewLineAnchors={viewLineAnchors}
          />
        ))}
      </div>
    </div>
  );

  return variant === 'view' ? <div className="device-diagram-view-frame">{diagram}</div> : diagram;
}

function DevicePortLabel({
  row,
  side,
}: {
  row: DevicePortPresentation | undefined;
  side: 'input' | 'output';
}) {
  if (!row) {
    return <span className={`device-port-label device-port-label-${side}`} />;
  }

  return (
    <span
      className={`device-port-label device-port-label-${side}`}
      style={{ '--device-port-color': row.accentColor } as CSSProperties}
    >
      <span>{row.deviceLabel}</span>
    </span>
  );
}

function DevicePortAnchor({ row }: { row: DevicePortPresentation }) {
  return (
    <ConnectorIcon className="device-port-anchor" color={row.accentColor} decorative iconKey={row.iconKey} />
  );
}

function CableLineRow({
  row,
  side,
  readOnly,
  viewLineAnchors,
}: {
  row: DevicePortPresentation | undefined;
  side: 'input' | 'output';
  readOnly: boolean;
  viewLineAnchors?: DeviceDiagramViewLineAnchors;
}) {
  if (!row) {
    return <div className="device-wire-row" />;
  }

  const inlineMarker = row.terminalBlockMarker;
  const hasInlineFrontPoint = Boolean(inlineMarker?.exitPortId);
  const viewEndpoint: ViewLineEndpoint | null = viewLineAnchors
    ? { kind: 'port', placementId: viewLineAnchors.placementId, portId: row.port.id }
    : null;
  const lineAnchor =
    viewLineAnchors && viewEndpoint
      ? {
          endpoint: viewEndpoint,
          label: row.deviceLabel,
          covered: viewLineAnchors.coveredPortIds.has(row.port.id),
          onSelect: viewLineAnchors.onSelect ? () => viewLineAnchors.onSelect?.(viewEndpoint) : undefined,
          reconnectRole: viewLineAnchors.getReconnectRole?.(viewEndpoint) ?? null,
          reconnecting: Boolean(viewLineAnchors.reconnecting),
          isReconnectTarget: viewLineAnchors.isReconnectTarget?.(viewEndpoint) ?? false,
          onBeginReconnect: viewLineAnchors.onBeginReconnect,
        }
      : undefined;
  const rowStyle = { '--device-port-color': row.accentColor } as CSSProperties;
  const primaryPoint = (
    <ConnectionPoint
      ariaLabel={`Connect ${row.deviceLabel}`}
      className={hasInlineFrontPoint ? 'device-cable-picker-primary' : ''}
      portId={row.port.id}
      readOnly={readOnly}
      lineAnchor={viewLineAnchors && !hasInlineFrontPoint ? lineAnchor : undefined}
    />
  );
  const secondaryPoint = inlineMarker?.exitPortId ? (
    <ConnectionPoint
      ariaLabel={`Connect ${inlineMarker.label} front`}
      className="device-cable-picker-secondary"
      portId={inlineMarker.exitPortId}
      readOnly={readOnly}
      lineAnchor={lineAnchor}
    />
  ) : null;

  return (
    <div className={`device-wire-row device-wire-row-${side}`} style={rowStyle}>
      {side === 'input' ? (
        <>
          {secondaryPoint ?? primaryPoint}
          <span className="device-cable-line device-cable-line-outer" aria-hidden="true" />
          {inlineMarker ? <InlineTbMarker part={inlineMarker} /> : null}
          {secondaryPoint ? primaryPoint : null}
          <span className="device-cable-line device-cable-line-inner" aria-hidden="true" />
          <DevicePortAnchor row={row} />
        </>
      ) : (
        <>
          <DevicePortAnchor row={row} />
          <span className="device-cable-line device-cable-line-inner" aria-hidden="true" />
          {secondaryPoint ? primaryPoint : null}
          {inlineMarker ? <InlineTbMarker part={inlineMarker} /> : null}
          <span className="device-cable-line device-cable-line-outer" aria-hidden="true" />
          {secondaryPoint ?? primaryPoint}
        </>
      )}
      {row.remoteLabel ? <span className="device-chain-label">{row.remoteLabel}</span> : null}
      {row.connection.cable ? (
        <span className="device-cable-number device-cable-number-primary">{row.connection.cable.number}</span>
      ) : null}
      {inlineMarker?.continuationCable ? (
        <span className="device-cable-number device-cable-number-secondary">
          {inlineMarker.continuationCable.number}
        </span>
      ) : null}
    </div>
  );
}

function ConnectionPoint({
  ariaLabel,
  className,
  portId,
  readOnly,
  lineAnchor,
}: {
  ariaLabel: string;
  className: string;
  portId: string;
  readOnly: boolean;
  lineAnchor?: {
    endpoint: ViewLineEndpoint;
    label: string;
    covered: boolean;
    onSelect?: () => void;
    reconnectRole: 'from' | 'to' | null;
    reconnecting: boolean;
    isReconnectTarget: boolean;
    onBeginReconnect?: DeviceDiagramViewLineAnchors['onBeginReconnect'];
  };
}) {
  const classes = `device-cable-picker${className ? ` ${className}` : ''}`;

  if (
    lineAnchor &&
    (!lineAnchor.covered || Boolean(lineAnchor.reconnectRole)) &&
    (lineAnchor.onSelect || lineAnchor.reconnectRole || lineAnchor.isReconnectTarget)
  ) {
    return (
      <button
        aria-label={`Use ${lineAnchor.label} as View line anchor`}
        className={`${classes} is-view-line-anchor${lineAnchor.reconnectRole ? ' is-reconnect-handle' : ''}${lineAnchor.isReconnectTarget ? ' is-reconnect-target' : ''}`}
        data-view-line-endpoint-id={
          lineAnchor.endpoint.kind === 'port' ? lineAnchor.endpoint.portId : undefined
        }
        data-view-line-endpoint-kind="port"
        data-view-line-endpoint-placement-id={lineAnchor.endpoint.placementId}
        title={`Use ${lineAnchor.label} as View line anchor`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!lineAnchor.reconnecting) lineAnchor.onSelect?.();
        }}
        onPointerDown={(event) => {
          if (lineAnchor.reconnectRole) {
            lineAnchor.onBeginReconnect?.(event, lineAnchor.endpoint, lineAnchor.reconnectRole);
          }
        }}
      />
    );
  }

  return readOnly ? (
    <span
      aria-hidden="true"
      className={`${classes} is-read-only${lineAnchor?.covered ? ' is-line-covered' : ''}`}
    />
  ) : (
    <CrosspointPicker ariaLabel={ariaLabel} className={classes} portId={portId} />
  );
}

function InlineTbMarker({ part }: { part: Extract<PortConnectionChainPart, { type: 'terminal_block' }> }) {
  const isRearFirst = part.orientation === 'rear-to-front' || part.orientation === 'rear';
  const isFrontFirst = part.orientation === 'front-to-rear' || part.orientation === 'front';

  return (
    <span className={`device-inline-tb-marker device-inline-tb-marker-${part.orientation}`}>
      {isFrontFirst ? (
        <span className="device-inline-tb-arrow device-inline-tb-arrow-left" aria-hidden="true" />
      ) : null}
      {isRearFirst ? <span className="device-inline-tb-rear-bar" aria-hidden="true" /> : null}
      <span className="device-inline-tb-label">{part.label}</span>
      {isRearFirst || part.orientation === 'front-to-front' ? (
        <span className="device-inline-tb-arrow device-inline-tb-arrow-right" aria-hidden="true" />
      ) : null}
      {isFrontFirst ? <span className="device-inline-tb-rear-bar" aria-hidden="true" /> : null}
    </span>
  );
}
