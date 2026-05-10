import { useProject } from '../../state/ProjectContext';
import { resolveSelection, type SelectionState } from '../common/selection';
import { DeviceWorkspace } from '../devices/DeviceWorkspace';
import { LocationWorkspace } from '../locations/LocationWorkspace';
import { RackWorkspace } from '../racks/RackWorkspace';
import { SettingsWorkspace } from '../settings/SettingsWorkspace';
import { ProjectWorkspace } from './ProjectWorkspace';

export function Workspace({
  selection,
  onAddDevice,
}: {
  selection: SelectionState;
  onAddDevice: (locationId: string | null) => void;
}) {
  const { project } = useProject();
  const selected = resolveSelection(project, selection);

  if (!selected) {
    return (
      <section className="workspace welcome-workspace" aria-label="Center workspace">
        <p className="eyebrow">StudioWire IO</p>
        <h1>Open a project object from the tree.</h1>
        <p>
          Select the project root, a location, a rack, or a device to inspect the current project
          data.
        </p>
      </section>
    );
  }

  if (selected.type === 'project') {
    return <ProjectWorkspace />;
  }

  if (selected.type === 'settings') {
    return <SettingsWorkspace />;
  }

  if (selected.type === 'location') {
    return <LocationWorkspace location={selected.value} onAddDevice={onAddDevice} />;
  }

  if (selected.type === 'rack') {
    return <RackWorkspace rack={selected.value} />;
  }

  return <DeviceWorkspace device={selected.value} />;
}
