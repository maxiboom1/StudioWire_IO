import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { TerminalBlockDiagram } from './TerminalBlockDiagram';

export function TerminalBlockWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
  return (
    <section className="workspace terminal-block-workspace" aria-label="Terminal block canvas">
      <div className="terminal-block-canvas">
        <TerminalBlockDiagram project={project} device={device} />
      </div>
    </section>
  );
}
