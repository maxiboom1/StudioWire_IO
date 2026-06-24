import type { CSSProperties } from 'react';
import {
  describePortConnection,
  type PortConnectionChainPart,
  type PortConnectionSummary,
} from '../../domain/connections';
import type { Device, Port, ProjectRoot } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { CrosspointPicker } from '../connections/CrosspointPicker';

interface DevicePortRow {
  port: Port;
  connection: PortConnectionSummary;
}

export function DeviceWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
  const portGroups = project.portGroups.filter((group) => group.deviceId === device.id);
  const ports = project.ports.filter((port) => port.deviceId === device.id);
  const groupsByDirection = {
    input: portGroups.filter((group) => group.direction === 'input'),
    output: portGroups.filter((group) => group.direction === 'output'),
    bidirectional: portGroups.filter((group) => group.direction === 'bidirectional'),
  };
  const sideOutputGroups = [...groupsByDirection.output, ...groupsByDirection.bidirectional];
  const inputRows = buildPortRows(project, groupsByDirection.input, ports);
  const outputRows = buildPortRows(project, sideOutputGroups, ports);
  const rowCount = Math.max(inputRows.length, outputRows.length, 1);
  const rowIndexes = Array.from({ length: rowCount }, (_, index) => index);
  const secondaryLabel = device.code || device.labelPrefix || device.model || '';
  const diagramStyle = { '--device-port-rows': rowCount } as CSSProperties;

  return (
    <section className="workspace device-workspace" aria-label="Device canvas">
      <div className="device-canvas">
        <div
          className={device.status === 'retired' ? 'device-diagram retired' : 'device-diagram'}
          style={diagramStyle}
        >
          <div className="device-line-column device-line-column-left" aria-label="Input cable rows">
            <div className="device-line-header-spacer" />
            {rowIndexes.map((index) => (
              <CableLineRow key={`input-${index}`} row={inputRows[index]} side="input" />
            ))}
          </div>
          <div className="device-body">
            <div className="device-body-header">
              <strong>{device.name}</strong>
              {secondaryLabel ? <span>{secondaryLabel}</span> : null}
            </div>
            {rowIndexes.map((index) => (
              <div className="device-body-row" key={`body-${index}`}>
                <span className="device-port-label device-port-label-input">
                  {inputRows[index]?.port.label ?? ''}
                </span>
                <span className="device-port-label device-port-label-output">
                  {outputRows[index]?.port.label ?? ''}
                </span>
              </div>
            ))}
          </div>
          <div className="device-line-column device-line-column-right" aria-label="Output cable rows">
            <div className="device-line-header-spacer" />
            {rowIndexes.map((index) => (
              <CableLineRow key={`output-${index}`} row={outputRows[index]} side="output" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CableLineRow({ row, side }: { row: DevicePortRow | undefined; side: 'input' | 'output' }) {
  if (!row) {
    return <div className="device-wire-row" />;
  }

  const inlineMarker = row.connection.chainParts.find((part) => part.type === 'terminal_block') ?? null;
  const remoteLabel = getRemoteChainLabel(row.connection.chainParts);
  const hasInlineFrontPicker = Boolean(inlineMarker?.exitPortId);

  return (
    <div className={`device-wire-row device-wire-row-${side}`}>
      {side === 'input' && inlineMarker && hasInlineFrontPicker ? (
        <>
          <CrosspointPicker
            ariaLabel={`Connect ${inlineMarker.label} front`}
            className="device-cable-picker device-cable-picker-secondary"
            portId={inlineMarker.exitPortId ?? row.port.id}
          />
          <span className="device-cable-line device-cable-line-outer" aria-hidden="true" />
          <InlineTbMarker part={inlineMarker} />
          <CrosspointPicker
            ariaLabel={`Connect ${row.port.label}`}
            className="device-cable-picker device-cable-picker-primary"
            portId={row.port.id}
          />
          <span className="device-cable-line device-cable-line-inner" aria-hidden="true" />
          <span className="device-port-anchor" aria-hidden="true" />
        </>
      ) : side === 'input' ? (
        <>
          <CrosspointPicker
            ariaLabel={`Connect ${row.port.label}`}
            className="device-cable-picker"
            portId={row.port.id}
          />
          <span className="device-cable-line device-cable-line-outer" aria-hidden="true" />
          {inlineMarker ? <InlineTbMarker part={inlineMarker} /> : null}
          <span className="device-cable-line device-cable-line-inner" aria-hidden="true" />
          <span className="device-port-anchor" aria-hidden="true" />
        </>
      ) : inlineMarker && hasInlineFrontPicker ? (
        <>
          <span className="device-port-anchor" aria-hidden="true" />
          <span className="device-cable-line device-cable-line-inner" aria-hidden="true" />
          <CrosspointPicker
            ariaLabel={`Connect ${row.port.label}`}
            className="device-cable-picker device-cable-picker-primary"
            portId={row.port.id}
          />
          <InlineTbMarker part={inlineMarker} />
          <span className="device-cable-line device-cable-line-outer" aria-hidden="true" />
          <CrosspointPicker
            ariaLabel={`Connect ${inlineMarker.label} front`}
            className="device-cable-picker device-cable-picker-secondary"
            portId={inlineMarker.exitPortId ?? row.port.id}
          />
        </>
      ) : (
        <>
          <span className="device-port-anchor" aria-hidden="true" />
          <span className="device-cable-line device-cable-line-inner" aria-hidden="true" />
          {inlineMarker ? <InlineTbMarker part={inlineMarker} /> : null}
          <span className="device-cable-line device-cable-line-outer" aria-hidden="true" />
          <CrosspointPicker
            ariaLabel={`Connect ${row.port.label}`}
            className="device-cable-picker"
            portId={row.port.id}
          />
        </>
      )}
      {remoteLabel ? <span className="device-chain-label">{remoteLabel}</span> : null}
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

function getRemoteChainLabel(parts: PortConnectionChainPart[]) {
  const labels = parts
    .filter((part): part is Extract<PortConnectionChainPart, { type: 'port' }> => part.type === 'port')
    .map((part) => part.label);

  return labels.length > 0 ? labels[labels.length - 1] : '';
}

function buildPortRows(
  project: ProjectRoot,
  groups: ProjectRoot['portGroups'],
  ports: ProjectRoot['ports'],
): DevicePortRow[] {
  return groups.flatMap((group) =>
    ports
      .filter((port) => port.portGroupId === group.id)
      .sort((left, right) => left.index - right.index)
      .map((port) => ({
        port,
        connection: describePortConnection(project, port.id),
      })),
  );
}
