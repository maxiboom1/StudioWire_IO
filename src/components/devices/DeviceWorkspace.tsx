import { type CSSProperties } from 'react';
import type { PortConnectionChainPart } from '../../domain/connections';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { ConnectorIcon } from '../common/ConnectorIcon';
import { CrosspointPicker } from '../connections/CrosspointPicker';
import { buildDevicePresentationModel, type DevicePortPresentation } from './devicePresentationModel';

export function DeviceWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
  const model = buildDevicePresentationModel(project, device);
  const rowSlots = model.rows;
  const rowCount = model.rowCount;
  const rowIndexes = Array.from({ length: rowCount }, (_, index) => index);
  const secondaryLabel = device.code ?? '';
  const diagramStyle = { '--device-port-rows': rowCount } as CSSProperties;

  return (
    <section className="workspace device-workspace" aria-label="Device canvas">
      <div className="device-canvas">
        <div className="device-diagram" style={diagramStyle}>
          <div className="device-line-column device-line-column-left" aria-label="Input cable rows">
            <div className="device-line-header-spacer" />
            {rowIndexes.map((index) => (
              <CableLineRow key={`input-${index}`} row={rowSlots[index]?.left} side="input" />
            ))}
          </div>
          <div className="device-body">
            <div className="device-body-header">
              <strong>{device.name}</strong>
              <span>{secondaryLabel}</span>
            </div>
            {rowIndexes.map((index) => (
              <div className="device-body-row" key={`body-${index}`}>
                <DevicePortLabel row={rowSlots[index]?.left} side="input" />
                <DevicePortLabel row={rowSlots[index]?.right} side="output" />
              </div>
            ))}
          </div>
          <div className="device-line-column device-line-column-right" aria-label="Output cable rows">
            <div className="device-line-header-spacer" />
            {rowIndexes.map((index) => (
              <CableLineRow key={`output-${index}`} row={rowSlots[index]?.right} side="output" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
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
      <span>{row.port.label}</span>
    </span>
  );
}

function DevicePortAnchor({ row }: { row: DevicePortPresentation }) {
  return (
    <ConnectorIcon className="device-port-anchor" color={row.accentColor} decorative iconKey={row.iconKey} />
  );
}

function CableLineRow({ row, side }: { row: DevicePortPresentation | undefined; side: 'input' | 'output' }) {
  if (!row) {
    return <div className="device-wire-row" />;
  }

  const inlineMarker = row.connection.chainParts.find((part) => part.type === 'terminal_block') ?? null;
  const remoteLabel = row.remoteLabel;
  const hasInlineFrontPicker = Boolean(inlineMarker?.exitPortId);
  const rowStyle = { '--device-port-color': row.accentColor } as CSSProperties;

  return (
    <div className={`device-wire-row device-wire-row-${side}`} style={rowStyle}>
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
          <DevicePortAnchor row={row} />
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
          <DevicePortAnchor row={row} />
        </>
      ) : inlineMarker && hasInlineFrontPicker ? (
        <>
          <DevicePortAnchor row={row} />
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
          <DevicePortAnchor row={row} />
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
