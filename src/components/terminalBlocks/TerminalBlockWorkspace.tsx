import type { TerminalBlock } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { WorkspaceCard, WorkspaceHeader } from '../common/WorkspaceBits';
import { Badge } from '../ui/badge';

export function TerminalBlockWorkspace({ terminalBlock }: { terminalBlock: TerminalBlock }) {
  const { project } = useProject();
  const location = terminalBlock.locationId
    ? project.locations.find((candidate) => candidate.id === terminalBlock.locationId)
    : null;
  const portGroups = project.terminalBlockPortGroups.filter((group) => group.terminalBlockId === terminalBlock.id);
  const ports = project.terminalBlockPorts.filter((port) => port.terminalBlockId === terminalBlock.id);
  const rearCount = ports.filter((port) => port.face === 'rear').length;
  const frontCount = ports.filter((port) => port.face === 'front').length;

  return (
    <section className="workspace" aria-label="Terminal block workspace">
      <WorkspaceHeader eyebrow="Terminal Block" title={terminalBlock.name} badge={terminalBlock.status} />
      <div className="workspace-context-chips" aria-label="Terminal block context">
        {location ? <Badge>Location: {location.name}</Badge> : <Badge>Unassigned</Badge>}
        <Badge>{terminalBlock.labelPrefix || terminalBlock.code || 'TB'}</Badge>
      </div>
      <WorkspaceCard
        title="Terminal Block Canvas Deferred"
        description="v0.3.4 creates and selects terminal blocks. The rear/front canvas is planned for the next TB canvas step."
      >
        <dl>
          <div>
            <dt>Port groups</dt>
            <dd>{portGroups.length}</dd>
          </div>
          <div>
            <dt>Rear ports</dt>
            <dd>{rearCount}</dd>
          </div>
          <div>
            <dt>Front ports</dt>
            <dd>{frontCount}</dd>
          </div>
          <div>
            <dt>Planned cable mode</dt>
            <dd>{portGroups[0]?.plannedCableMode ?? 'none'}</dd>
          </div>
        </dl>
      </WorkspaceCard>
    </section>
  );
}
