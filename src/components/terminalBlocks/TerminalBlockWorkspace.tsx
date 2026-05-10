import { useState } from 'react';
import type { TerminalBlock } from '../../domain/types';
import { cn } from '../../lib/utils';
import { useCanvasInteraction } from '../../state/CanvasInteractionContext';
import { useProject } from '../../state/ProjectContext';
import { CrosspointPanel, type CrosspointAnchor } from '../common/CrosspointPanel';
import { WorkspaceHeader } from '../common/WorkspaceBits';
import { Badge } from '../ui/badge';
import { TerminalBlockCanvas } from './canvas/TerminalBlockCanvas';

export function TerminalBlockWorkspace({ terminalBlock }: { terminalBlock: TerminalBlock }) {
  const { project, disconnectCableEndpoint } = useProject();
  const { clearObjectDropPicker, getObjectDropState, objectDropPicker } = useCanvasInteraction();
  const [crosspointAnchor, setCrosspointAnchor] = useState<CrosspointAnchor | null>(null);
  const location = terminalBlock.locationId
    ? project.locations.find((candidate) => candidate.id === terminalBlock.locationId)
    : null;
  const portGroups = project.terminalBlockPortGroups.filter((group) => group.terminalBlockId === terminalBlock.id);
  const ports = project.terminalBlockPorts.filter((port) => port.terminalBlockId === terminalBlock.id);
  const rearCount = ports.filter((port) => port.face === 'rear').length;
  const frontCount = ports.filter((port) => port.face === 'front').length;
  const canvasTarget = {
    objectType: 'terminalBlock' as const,
    objectId: terminalBlock.id,
    label: terminalBlock.name,
  };
  const objectDropState = getObjectDropState(canvasTarget);
  const objectDropAnchor =
    objectDropPicker?.target.objectType === 'terminalBlock' &&
    objectDropPicker.target.objectId === terminalBlock.id
      ? objectDropPicker.anchor
      : null;

  return (
    <section className="workspace" aria-label="Terminal block workspace">
      <WorkspaceHeader eyebrow="Terminal Block" title={terminalBlock.name} badge={terminalBlock.status} />
      <div className="workspace-context-chips" aria-label="Terminal block context">
        {location ? <Badge>Location: {location.name}</Badge> : <Badge>Unassigned</Badge>}
        <Badge>{terminalBlock.labelPrefix || terminalBlock.code || 'TB'}</Badge>
      </div>
      <div
        className={cn(
          'tb-canvas-shell',
          objectDropState !== 'idle' ? `canvas-object-drop-${objectDropState}` : null,
        )}
        data-crosspoint-object-id={terminalBlock.id}
        data-crosspoint-object-label={terminalBlock.name}
        data-crosspoint-object-type="terminalBlock"
      >
        <div className="tb-canvas-title">
          <div>
            <h2>Rear / Front Endpoint Canvas</h2>
            <p>
              Read-only view of physical TB face endpoints. Rear/front continuity is shown by alignment only and is not a cable.
            </p>
          </div>
          <div className="tb-canvas-stats" aria-label="Terminal block port counts">
            <span>{portGroups.length} group(s)</span>
            <span>{rearCount} rear</span>
            <span>{frontCount} front</span>
            <span>{portGroups[0]?.plannedCableMode ?? 'none'}</span>
          </div>
        </div>
        <TerminalBlockCanvas
          onDisconnectEndpoint={disconnectCableEndpoint}
          onSelectAnchor={setCrosspointAnchor}
          project={project}
          terminalBlock={terminalBlock}
          ports={ports}
        />
        <CrosspointPanel anchor={crosspointAnchor} onClear={() => setCrosspointAnchor(null)} />
        <CrosspointPanel
          anchor={objectDropAnchor}
          objectFilter={objectDropPicker?.target}
          onClear={clearObjectDropPicker}
        />
      </div>
    </section>
  );
}
