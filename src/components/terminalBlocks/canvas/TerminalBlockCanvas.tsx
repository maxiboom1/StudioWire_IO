import type { ProjectRoot, TerminalBlock, TerminalBlockPort } from '../../../domain/types';
import { TerminalBlockFaceLine } from './TerminalBlockFaceLine';
import { buildTerminalBlockRows, type TerminalBlockCanvasRowData } from './terminalBlockCanvasModel';

export function TerminalBlockCanvas({
  project,
  terminalBlock,
  ports,
}: {
  project: ProjectRoot;
  terminalBlock: TerminalBlock;
  ports: TerminalBlockPort[];
}) {
  const rows = buildTerminalBlockRows(terminalBlock, ports);

  if (rows.length === 0) {
    return <div className="tb-canvas-empty">This terminal block has no generated rear/front ports yet.</div>;
  }

  return (
    <div className="tb-canvas" aria-label={`${terminalBlock.name} terminal block canvas`}>
      <div className="tb-canvas-header" aria-hidden="true">
        <span>Rear face</span>
        <span>Address</span>
        <span>Front face</span>
      </div>
      <div className="tb-canvas-rows">
        {rows.map((row) => (
          <TerminalBlockCanvasRow key={row.positionIndex} project={project} row={row} />
        ))}
      </div>
    </div>
  );
}

function TerminalBlockCanvasRow({
  project,
  row,
}: {
  project: ProjectRoot;
  row: TerminalBlockCanvasRowData;
}) {
  return (
    <div className="tb-canvas-row">
      <TerminalBlockFaceLine face="rear" port={row.rearPort} project={project} />
      <div className="tb-canvas-address">
        <span>{row.address}</span>
        <i aria-hidden="true" />
      </div>
      <TerminalBlockFaceLine face="front" port={row.frontPort} project={project} />
    </div>
  );
}
