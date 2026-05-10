import { resolveEndpointDisplay } from '../../../domain/terminalBlockCables';
import type { Cable, ProjectRoot, TerminalBlock, TerminalBlockPort } from '../../../domain/types';

export interface TerminalBlockCanvasRowData {
  positionIndex: number;
  address: string;
  rearPort: TerminalBlockPort | null;
  frontPort: TerminalBlockPort | null;
}

export function buildTerminalBlockRows(
  terminalBlock: TerminalBlock,
  ports: TerminalBlockPort[],
): TerminalBlockCanvasRowData[] {
  const positions = Array.from(new Set(ports.map((port) => port.positionIndex))).sort((left, right) => left - right);

  return positions.map((positionIndex) => ({
    positionIndex,
    address: buildAddressLabel(terminalBlock, positionIndex),
    rearPort: ports.find((port) => port.positionIndex === positionIndex && port.face === 'rear') ?? null,
    frontPort: ports.find((port) => port.positionIndex === positionIndex && port.face === 'front') ?? null,
  }));
}

export function getOppositeEndpointLabel(project: ProjectRoot, cable: Cable, terminalBlockPortId: string): string {
  const opposite =
    cable.sourceEndpoint.type === 'tb_port' && cable.sourceEndpoint.id === terminalBlockPortId
      ? cable.destinationEndpoint
      : cable.sourceEndpoint;
  const display = resolveEndpointDisplay(project, opposite);

  if (display.objectType === 'unknown') {
    return display.objectName || 'Open endpoint';
  }

  return [display.objectName, display.portLabel].filter(Boolean).join(' / ');
}

function buildAddressLabel(terminalBlock: TerminalBlock, positionIndex: number): string {
  const prefix = terminalBlock.labelPrefix || terminalBlock.code || terminalBlock.name;

  return `${prefix}-${String(positionIndex).padStart(2, '0')}`;
}
