import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { DeviceDiagram } from './DeviceDiagram';

export function DeviceWorkspace({ device }: { device: Device }) {
  const { project } = useProject();

  return (
    <section className="workspace device-workspace" aria-label="Device canvas">
      <div className="device-canvas">
        <DeviceDiagram device={device} project={project} />
      </div>
    </section>
  );
}
