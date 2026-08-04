import { useProject } from '../../state/ProjectContext';
import { resolveSelection, type SelectionState } from '../common/selection';
import { DeviceWorkspace } from '../devices/DeviceWorkspace';
import { TerminalBlockWorkspace } from '../devices/TerminalBlockWorkspace';
import { LocationWorkspace } from '../locations/LocationWorkspace';
import { FolderWorkspace } from '../locations/FolderWorkspace';
import { RackWorkspace } from '../racks/RackWorkspace';
import { SettingsWorkspace } from '../settings/SettingsWorkspace';
import { ViewWorkspace } from '../views/ViewWorkspace';
import { ProjectWorkspace } from './ProjectWorkspace';

export function Workspace({
  selection,
  onAddDevice,
  onAddTerminalBlock,
}: {
  selection: SelectionState;
  onAddDevice: (locationId: string) => void;
  onAddTerminalBlock: (locationId: string | null) => void;
}) {
  const { project } = useProject();
  const selected = resolveSelection(project, selection);

  if (!selected) {
    return (
      <section className="workspace welcome-workspace" aria-label="Center workspace">
        <p className="eyebrow">StudioWire IO</p>
        <h1>Open a project object from the tree.</h1>
        <p>
          Select the project root, a location, a rack, a device, or a View to inspect the current project
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
    return (
      <LocationWorkspace
        location={selected.value}
        onAddDevice={onAddDevice}
        onAddTerminalBlock={onAddTerminalBlock}
      />
    );
  }

  if (selected.type === 'folder') {
    return <FolderWorkspace folder={selected.value} />;
  }

  if (selected.type === 'rack') {
    return <RackWorkspace rack={selected.value} />;
  }

  if (selected.type === 'view') {
    return <ViewWorkspace view={selected.value} />;
  }

  if (selected.value.kind === 'terminal_block') {
    return <TerminalBlockWorkspace device={selected.value} />;
  }

  return <DeviceWorkspace device={selected.value} />;
}
