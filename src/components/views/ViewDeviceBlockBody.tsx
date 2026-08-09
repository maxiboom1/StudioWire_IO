import type { PointerEventHandler } from 'react';
import type { Device, ProjectRoot } from '../../domain/types';
import { DeviceDiagram, type DeviceDiagramViewLineAnchors } from '../devices/DeviceDiagram';
import { TerminalBlockDiagram } from '../devices/TerminalBlockDiagram';

export function ViewDeviceBlockBody({
  project,
  device,
  displayName,
  onHeaderPointerDown,
  viewLineAnchors,
}: {
  project: ProjectRoot;
  device: Device;
  displayName: string;
  onHeaderPointerDown?: PointerEventHandler<HTMLDivElement>;
  viewLineAnchors?: DeviceDiagramViewLineAnchors;
}) {
  if (device.kind === 'terminal_block') {
    return (
      <div className="terminal-block-diagram-view-frame">
        <TerminalBlockDiagram
          device={device}
          displayName={displayName}
          onHeaderPointerDown={onHeaderPointerDown}
          project={project}
          readOnly
          variant="view"
        />
      </div>
    );
  }

  return (
    <DeviceDiagram
      device={device}
      displayName={displayName}
      onHeaderPointerDown={onHeaderPointerDown}
      project={project}
      readOnly
      variant="view"
      viewLineAnchors={viewLineAnchors}
    />
  );
}
