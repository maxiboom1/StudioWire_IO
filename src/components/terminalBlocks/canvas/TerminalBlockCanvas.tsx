import type { ProjectRoot, TerminalBlock, TerminalBlockPort } from '../../../domain/types';
import type { CrosspointAnchor } from '../../common/CrosspointPanel';
import { TerminalBlockFaceLine } from './TerminalBlockFaceLine';
import { buildTerminalBlockRows, type TerminalBlockCanvasRowData } from './terminalBlockCanvasModel';

export function TerminalBlockCanvas({
  project,
  terminalBlock,
  ports,
  onSelectAnchor,
  onDisconnectEndpoint,
}: {
  project: ProjectRoot;
  terminalBlock: TerminalBlock;
  ports: TerminalBlockPort[];
  onSelectAnchor?: (anchor: CrosspointAnchor) => void;
  onDisconnectEndpoint?: (input: { cableId: string; side: 'source' | 'destination' }) => void;
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
          <TerminalBlockCanvasRow
            key={row.positionIndex}
            onDisconnectEndpoint={onDisconnectEndpoint}
            onSelectAnchor={onSelectAnchor}
            project={project}
            row={row}
          />
        ))}
      </div>
    </div>
  );
}

function TerminalBlockCanvasRow({
  project,
  row,
  onSelectAnchor,
  onDisconnectEndpoint,
}: {
  project: ProjectRoot;
  row: TerminalBlockCanvasRowData;
  onSelectAnchor?: (anchor: CrosspointAnchor) => void;
  onDisconnectEndpoint?: (input: { cableId: string; side: 'source' | 'destination' }) => void;
}) {
  return (
    <div className="tb-canvas-row">
      <TerminalBlockFaceLine
        face="rear"
        onDisconnectEndpoint={onDisconnectEndpoint}
        onSelectAnchor={onSelectAnchor}
        port={row.rearPort}
        project={project}
      />
      <div className="tb-canvas-address">
        <span>{row.address}</span>
        <i aria-hidden="true" />
      </div>
      <TerminalBlockFaceLine
        face="front"
        onDisconnectEndpoint={onDisconnectEndpoint}
        onSelectAnchor={onSelectAnchor}
        port={row.frontPort}
        project={project}
      />
    </div>
  );
}
