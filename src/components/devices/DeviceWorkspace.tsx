import type { CSSProperties } from 'react';
import type { Cable, Device, Port, ProjectRoot } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';

interface DevicePortRow {
  port: Port;
  cable: Cable | null;
}

export function DeviceWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
  const portGroups = project.portGroups.filter((group) => group.deviceId === device.id);
  const ports = project.ports.filter((port) => port.deviceId === device.id);
  const cablesById = new Map(project.cables.map((cable) => [cable.id, cable]));
  const groupsByDirection = {
    input: portGroups.filter((group) => group.direction === 'input'),
    output: portGroups.filter((group) => group.direction === 'output'),
    bidirectional: portGroups.filter((group) => group.direction === 'bidirectional'),
  };
  const sideOutputGroups = [...groupsByDirection.output, ...groupsByDirection.bidirectional];
  const inputRows = buildPortRows(groupsByDirection.input, ports, cablesById);
  const outputRows = buildPortRows(sideOutputGroups, ports, cablesById);
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

function CableLineRow({
  row,
  side,
}: {
  row: DevicePortRow | undefined;
  side: 'input' | 'output';
}) {
  if (!row) {
    return <div className="device-wire-row" />;
  }

  return (
    <div className={`device-wire-row device-wire-row-${side}`}>
      {side === 'input' ? (
        <>
          <span className="device-cable-line" aria-hidden="true" />
          <span className="device-port-node" aria-hidden="true" />
        </>
      ) : (
        <>
          <span className="device-port-node" aria-hidden="true" />
          <span className="device-cable-line" aria-hidden="true" />
        </>
      )}
      {row.cable ? <span className="device-cable-number">{row.cable.number}</span> : null}
    </div>
  );
}

function buildPortRows(
  groups: ProjectRoot['portGroups'],
  ports: ProjectRoot['ports'],
  cablesById: Map<string, ProjectRoot['cables'][number]>,
): DevicePortRow[] {
  return groups.flatMap((group) =>
    ports
      .filter((port) => port.portGroupId === group.id)
      .sort((left, right) => left.index - right.index)
      .map((port) => ({
        port,
        cable: port.plannedCableId ? cablesById.get(port.plannedCableId) ?? null : null,
      })),
  );
}
