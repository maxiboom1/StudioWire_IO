import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { allocateCableRange, formatCableNumber, previewCableRange } from './domain/cableNumbers';
import type { Device, Location, ProjectInfo, ProjectRoot, Rack, ValidationIssue } from './domain/types';
import { ProjectJsonInput, ProjectProvider, useProject } from './state/ProjectContext';
import type { DeviceDraft, DevicePortGroupDraft } from './state/projectReducer';

type SelectedObjectType = 'project' | 'settings' | 'location' | 'rack' | 'device';

interface SelectionState {
  selectedObjectType: SelectedObjectType | null;
  selectedObjectId: string | null;
}

type TreeSection = 'racks' | 'devices';
type ModalState =
  | null
  | { type: 'location' }
  | { type: 'rack'; locationId: string }
  | { type: 'device'; locationId: string | null };

function App() {
  return (
    <ProjectProvider>
      <StudioWireShell />
    </ProjectProvider>
  );
}

function StudioWireShell() {
  const { project, importError, dismissImportError } = useProject();
  const [selection, setSelection] = useState<SelectionState>({
    selectedObjectType: null,
    selectedObjectId: null,
  });
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    if (selection.selectedObjectType === 'settings') {
      return;
    }

    if (
      selection.selectedObjectType === 'project' &&
      selection.selectedObjectId !== project.project.id
    ) {
      setSelection({ selectedObjectType: 'project', selectedObjectId: project.project.id });
      return;
    }

    if (selection.selectedObjectType && !resolveSelection(project, selection)) {
      setSelection({ selectedObjectType: 'project', selectedObjectId: project.project.id });
    }
  }, [project, selection]);

  function selectObject(selectedObjectType: SelectedObjectType, selectedObjectId: string) {
    setSelection({ selectedObjectType, selectedObjectId });
  }

  function selectProject() {
    selectObject('project', project.project.id);
  }

  function selectSettings() {
    selectObject('settings', 'settings');
  }

  function openAddDevice(locationId: string | null) {
    setModal({ type: 'device', locationId });
  }

  return (
    <main className="app-shell">
      <TopBar onProjectLoaded={selectProject} onOpenSettings={selectSettings} />
      {importError ? (
        <div className="app-alert" role="alert">
          <span>{importError}</span>
          <button type="button" onClick={dismissImportError}>
            Dismiss
          </button>
        </div>
      ) : null}
      <section className="app-grid" aria-label={`${project.project.name} project editor`}>
        <LeftTree
          selection={selection}
          onSelectObject={selectObject}
          onAddLocation={() => setModal({ type: 'location' })}
          onAddRack={(locationId) => setModal({ type: 'rack', locationId })}
          onAddDevice={openAddDevice}
        />
        <Workspace selection={selection} onAddDevice={openAddDevice} />
        <Inspector selection={selection} />
        <ValidationPanel
          onSelectIssue={(issue) => {
            const target = resolveIssueSelection(project, issue);

            if (target) {
              selectObject(target.selectedObjectType, target.selectedObjectId);
            }
          }}
        />
      </section>
      {modal?.type === 'location' ? (
        <AddLocationModal
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObject('location', id);
          }}
        />
      ) : null}
      {modal?.type === 'rack' ? (
        <AddRackModal
          locationId={modal.locationId}
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObject('rack', id);
          }}
        />
      ) : null}
      {modal?.type === 'device' ? (
        <AddDeviceModal
          initialLocationId={modal.locationId}
          onClose={() => setModal(null)}
          onCreated={(id) => {
            setModal(null);
            selectObject('device', id);
          }}
        />
      ) : null}
    </main>
  );
}

function TopBar({
  onProjectLoaded,
  onOpenSettings,
}: {
  onProjectLoaded: () => void;
  onOpenSettings: () => void;
}) {
  const {
    project,
    statusMessage,
    createNewProject,
    loadSampleProject,
    exportProjectJson,
    validateProject,
  } = useProject();

  function handleNewProject() {
    createNewProject();
    onProjectLoaded();
  }

  function handleLoadSample() {
    loadSampleProject();
    onProjectLoaded();
  }

  return (
    <header className="top-bar">
      <button className="brand-block" type="button" onClick={onProjectLoaded} aria-label="Select project">
        <div className="brand-mark">SW</div>
        <div>
          <p className="brand-name">StudioWire IO</p>
          <p className="project-name">{project.project.name}</p>
        </div>
      </button>

      <div className="top-actions" aria-label="Project actions">
        <button type="button" onClick={handleNewProject}>
          New Project
        </button>
        <button type="button" onClick={handleLoadSample}>
          Load Sample
        </button>
        <label className="file-action" htmlFor="project-json-input">
          Import JSON
        </label>
        <ProjectJsonInput className="file-input" id="project-json-input" onImportComplete={onProjectLoaded} />
        <button type="button" onClick={exportProjectJson}>
          Export JSON
        </button>
        <button type="button" onClick={validateProject}>
          Validate
        </button>
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      </div>

      <p className="status-line" aria-live="polite">
        {statusMessage}
      </p>
    </header>
  );
}

function LeftTree({
  selection,
  onSelectObject,
  onAddLocation,
  onAddRack,
  onAddDevice,
}: {
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddLocation: () => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string | null) => void;
}) {
  const { project } = useProject();
  const unassignedDevices = useMemo(
    () =>
      project.devices.filter((device) => {
        const hasKnownLocation = project.locations.some((location) => location.id === device.locationId);

        return !device.locationId || !hasKnownLocation;
      }),
    [project.devices, project.locations],
  );

  return (
    <aside className="left-tree" aria-label="Project tree">
      <div className="panel-heading">
        <span>Navigator</span>
        <strong>{project.schemaVersion}</strong>
      </div>
      <nav className="tree-nav">
        <TreeButton
          active={isSelected(selection, 'project', project.project.id)}
          depth={0}
          label={project.project.name}
          meta="Project root"
          onClick={() => onSelectObject('project', project.project.id)}
        />
        <TreeButton
          active={isSelected(selection, 'settings', 'settings')}
          depth={0}
          label="Settings"
          meta="Project config"
          onClick={() => onSelectObject('settings', 'settings')}
        />

        <TreeGroup
          label="Locations"
          count={project.locations.length}
          actionLabel="Add Location"
          onAction={onAddLocation}
        />
        {project.locations.length === 0 ? <TreeEmpty label="No locations" /> : null}
        {project.locations.map((location) => (
          <LocationBranch
            key={location.id}
            location={location}
            projectRacks={project.racks}
            projectDevices={project.devices}
            selection={selection}
            onSelectObject={onSelectObject}
            onAddRack={onAddRack}
            onAddDevice={onAddDevice}
          />
        ))}

        <TreeGroup
          label="Unassigned Devices"
          count={unassignedDevices.length}
          actionLabel="Add Device"
          onAction={() => onAddDevice(null)}
        />
        {unassignedDevices.length === 0 ? (
          <TreeEmpty label="No unassigned devices" />
        ) : (
          unassignedDevices.map((device) => (
            <TreeButton
              active={isSelected(selection, 'device', device.id)}
              depth={1}
              key={device.id}
              label={device.name}
              meta={device.code || device.role || 'Device'}
              onClick={() => onSelectObject('device', device.id)}
            />
          ))
        )}
      </nav>
    </aside>
  );
}

function LocationBranch({
  location,
  projectRacks,
  projectDevices,
  selection,
  onSelectObject,
  onAddRack,
  onAddDevice,
}: {
  location: Location;
  projectRacks: Rack[];
  projectDevices: Device[];
  selection: SelectionState;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
  onAddRack: (locationId: string) => void;
  onAddDevice: (locationId: string | null) => void;
}) {
  const racks = projectRacks.filter((rack) => rack.locationId === location.id);
  const devices = projectDevices.filter((device) => device.locationId === location.id);

  return (
    <div className="tree-branch">
      <TreeButton
        active={isSelected(selection, 'location', location.id)}
        depth={1}
        label={location.name}
        meta={location.type || 'Location'}
        onClick={() => onSelectObject('location', location.id)}
        onContextMenu={() => onAddDevice(location.id)}
      />
      <TreeCollection
        depth={2}
        label="Racks"
        section="racks"
        count={racks.length}
        actionLabel="Add Rack"
        onAction={() => onAddRack(location.id)}
      />
      {racks.length === 0 ? <TreeEmpty depth={3} label="No racks" /> : null}
      {racks.map((rack) => (
        <TreeButton
          active={isSelected(selection, 'rack', rack.id)}
          depth={3}
          key={rack.id}
          label={rack.name}
          meta={`${rack.heightRu} RU`}
          onClick={() => onSelectObject('rack', rack.id)}
        />
      ))}

      <TreeCollection
        depth={2}
        label="Devices"
        section="devices"
        count={devices.length}
        actionLabel="Add Device"
        onAction={() => onAddDevice(location.id)}
      />
      {devices.length === 0 ? <TreeEmpty depth={3} label="No devices" /> : null}
      {devices.map((device) => (
        <TreeButton
          active={isSelected(selection, 'device', device.id)}
          depth={3}
          key={device.id}
          label={device.name}
          meta={device.code || device.role || 'Device'}
          onClick={() => onSelectObject('device', device.id)}
        />
      ))}
    </div>
  );
}

function TreeGroup({
  label,
  count,
  actionLabel,
  onAction,
}: {
  label: string;
  count: number;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="tree-group"
      onContextMenu={(event) => {
        if (onAction) {
          event.preventDefault();
          onAction();
        }
      }}
    >
      <span>{label}</span>
      <div className="tree-group-actions">
        <strong>{count}</strong>
        {onAction ? (
          <button aria-label={actionLabel} className="tree-add-button" onClick={onAction} type="button">
            +
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TreeCollection({
  depth,
  label,
  section,
  count,
  actionLabel,
  onAction,
}: {
  depth: number;
  label: string;
  section: TreeSection;
  count: number;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={`tree-collection ${section}`} style={{ paddingLeft: `${depth * 14}px` }}>
      <span>{label}</span>
      <div className="tree-group-actions">
        <strong>{count}</strong>
        {onAction ? (
          <button aria-label={actionLabel} className="tree-add-button" onClick={onAction} type="button">
            +
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TreeButton({
  active,
  depth,
  label,
  meta,
  onClick,
  onContextMenu,
}: {
  active: boolean;
  depth: number;
  label: string;
  meta: string;
  onClick: () => void;
  onContextMenu?: () => void;
}) {
  return (
    <button
      className={active ? 'tree-item active' : 'tree-item'}
      onClick={onClick}
      onContextMenu={(event) => {
        if (onContextMenu) {
          event.preventDefault();
          onContextMenu();
        }
      }}
      style={{ paddingLeft: `${10 + depth * 14}px` }}
      type="button"
    >
      <span>{label}</span>
      <small>{meta}</small>
    </button>
  );
}

function TreeEmpty({ depth = 1, label }: { depth?: number; label: string }) {
  return (
    <div className="tree-empty" style={{ paddingLeft: `${10 + depth * 14}px` }}>
      {label}
    </div>
  );
}

function Workspace({
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

function ProjectWorkspace() {
  const { project } = useProject();
  const metrics = [
    ['Locations', project.locations.length],
    ['Racks', project.racks.length],
    ['Devices', project.devices.length],
    ['Port groups', project.portGroups.length],
    ['Ports', project.ports.length],
    ['Cables', project.cables.length],
  ] as const;

  return (
    <section className="workspace" aria-label="Project summary">
      <WorkspaceHeader eyebrow="Project" title={project.project.name} badge={`Schema ${project.schemaVersion}`} />
      <SummaryGrid
        items={[
          ['Customer', project.project.customer || 'Not set'],
          ['Revision', project.project.revision],
          ['Status', project.project.status],
          ['Updated', formatDate(project.project.updatedAt)],
        ]}
      />
      <div className="metric-grid" aria-label="Project object counts">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {project.locations.length === 0 && project.devices.length === 0 ? (
        <section className="empty-state workspace-section">
          <h2>Empty Project</h2>
          <p>Create a location from the Navigator to start building the project structure.</p>
        </section>
      ) : null}
    </section>
  );
}

function SettingsWorkspace() {
  const {
    project,
    updateProjectInfo,
    addCategory,
    updateCategory,
    addConnectorType,
    updateConnectorType,
    addCablePrefix,
  } = useProject();
  const [projectInfo, setProjectInfo] = useState({
    name: project.project.name,
    customer: project.project.customer,
    revision: project.project.revision,
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    defaultCablePrefix: project.settings.cablePrefixes[0]?.prefix ?? 'V',
  });
  const [newConnectorType, setNewConnectorType] = useState('');
  const [newCablePrefix, setNewCablePrefix] = useState({ prefix: '', name: '' });

  useEffect(() => {
    setProjectInfo({
      name: project.project.name,
      customer: project.project.customer,
      revision: project.project.revision,
    });
  }, [project.project.customer, project.project.name, project.project.revision]);

  function handleProjectInfoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProjectInfo(projectInfo);
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newCategory.name.trim()) {
      return;
    }

    addCategory({
      name: newCategory.name.trim(),
      defaultCablePrefix: newCategory.defaultCablePrefix,
    });
    setNewCategory({
      name: '',
      defaultCablePrefix: project.settings.cablePrefixes[0]?.prefix ?? 'V',
    });
  }

  function handleAddConnectorType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newConnectorType.trim()) {
      return;
    }

    addConnectorType({ name: newConnectorType.trim() });
    setNewConnectorType('');
  }

  function handleAddCablePrefix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newCablePrefix.prefix.trim() || !newCablePrefix.name.trim()) {
      return;
    }

    addCablePrefix({
      prefix: newCablePrefix.prefix,
      name: newCablePrefix.name.trim(),
    });
    setNewCablePrefix({ prefix: '', name: '' });
  }

  return (
    <section className="workspace" aria-label="Project settings">
      <WorkspaceHeader eyebrow="Settings" title="Project Settings" badge="v0.1" />

      <form className="editor-form settings-project-form" onSubmit={handleProjectInfoSubmit}>
        <label>
          <span>Project name</span>
          <input
            value={projectInfo.name}
            onChange={(event) => setProjectInfo({ ...projectInfo, name: event.target.value })}
          />
        </label>
        <label>
          <span>Customer</span>
          <input
            value={projectInfo.customer}
            onChange={(event) => setProjectInfo({ ...projectInfo, customer: event.target.value })}
          />
        </label>
        <label>
          <span>Revision</span>
          <input
            value={projectInfo.revision}
            onChange={(event) => setProjectInfo({ ...projectInfo, revision: event.target.value })}
          />
        </label>
        <button type="submit">Save Project Settings</button>
      </form>

      <section className="settings-section">
        <div className="section-heading">
          <h2>Categories</h2>
          <span>{project.settings.categories.length}</span>
        </div>
        <div className="editable-list">
          {project.settings.categories.map((category) => (
            <div className="editable-row" key={category.id}>
              <input
                aria-label={`${category.name} category name`}
                defaultValue={category.name}
                onBlur={(event) => {
                  const name = event.target.value.trim();

                  if (name && name !== category.name) {
                    updateCategory(category.id, {
                      name,
                      defaultCablePrefix: category.defaultCablePrefix,
                    });
                  }
                }}
              />
              <select
                aria-label={`${category.name} default cable prefix`}
                value={category.defaultCablePrefix}
                onChange={(event) =>
                  updateCategory(category.id, {
                    name: category.name,
                    defaultCablePrefix: event.target.value,
                  })
                }
              >
                {project.settings.cablePrefixes.map((prefix) => (
                  <option key={prefix.id} value={prefix.prefix}>
                    {prefix.prefix}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <form className="inline-form" onSubmit={handleAddCategory}>
          <input
            placeholder="New category"
            value={newCategory.name}
            onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
          />
          <select
            value={newCategory.defaultCablePrefix}
            onChange={(event) =>
              setNewCategory({ ...newCategory, defaultCablePrefix: event.target.value })
            }
          >
            {project.settings.cablePrefixes.map((prefix) => (
              <option key={prefix.id} value={prefix.prefix}>
                {prefix.prefix}
              </option>
            ))}
          </select>
          <button type="submit">Add Category</button>
        </form>
      </section>

      <section className="settings-section">
        <div className="section-heading">
          <h2>Connector Types</h2>
          <span>{project.settings.connectorTypes.length}</span>
        </div>
        <div className="editable-list compact">
          {project.settings.connectorTypes.map((connectorType) => (
            <div className="editable-row" key={connectorType.id}>
              <input
                aria-label={`${connectorType.name} connector type name`}
                defaultValue={connectorType.name}
                onBlur={(event) => {
                  const name = event.target.value.trim();

                  if (name && name !== connectorType.name) {
                    updateConnectorType(connectorType.id, { name });
                  }
                }}
              />
            </div>
          ))}
        </div>
        <form className="inline-form" onSubmit={handleAddConnectorType}>
          <input
            placeholder="New connector type"
            value={newConnectorType}
            onChange={(event) => setNewConnectorType(event.target.value)}
          />
          <button type="submit">Add Connector</button>
        </form>
      </section>

      <section className="settings-section">
        <div className="section-heading">
          <h2>Cable Prefixes</h2>
          <span>{project.settings.cablePrefixes.length}</span>
        </div>
        <div className="prefix-table">
          {project.settings.cablePrefixes.map((prefix) => {
            const ledger = project.numberingLedgers.find((item) => item.prefix === prefix.prefix);

            return (
              <div className="prefix-row" key={prefix.id}>
                <strong>{prefix.prefix}</strong>
                <span>{prefix.name}</span>
                <span>Next suggested: {ledger?.nextSuggested ?? 1}</span>
              </div>
            );
          })}
        </div>
        <form className="inline-form" onSubmit={handleAddCablePrefix}>
          <input
            placeholder="Prefix"
            value={newCablePrefix.prefix}
            onChange={(event) =>
              setNewCablePrefix({ ...newCablePrefix, prefix: event.target.value.toUpperCase() })
            }
          />
          <input
            placeholder="Name"
            value={newCablePrefix.name}
            onChange={(event) => setNewCablePrefix({ ...newCablePrefix, name: event.target.value })}
          />
          <button type="submit">Add Prefix</button>
        </form>
      </section>
    </section>
  );
}

function LocationWorkspace({
  location,
  onAddDevice,
}: {
  location: Location;
  onAddDevice: (locationId: string | null) => void;
}) {
  const { project } = useProject();
  const racks = project.racks.filter((rack) => rack.locationId === location.id);
  const devices = project.devices.filter((device) => device.locationId === location.id);

  return (
    <section className="workspace" aria-label="Location summary">
      <WorkspaceHeader eyebrow="Location" title={location.name} badge={location.type || 'Location'} />
      <SummaryGrid
        items={[
          ['Location ID', location.id],
          ['Type', location.type || 'Not set'],
          ['Racks', String(racks.length)],
          ['Devices', String(devices.length)],
        ]}
      />
      <section className="workspace-section">
        <div className="section-heading">
          <h2>Description</h2>
          <button type="button" onClick={() => onAddDevice(location.id)}>
            Add Device
          </button>
        </div>
        <p>{location.description || 'No description set.'}</p>
      </section>
      {racks.length === 0 && devices.length === 0 ? (
        <section className="empty-state workspace-section">
          <h2>No Rack Or Device Entries</h2>
          <p>Add a rack from the Navigator, or add a device directly to this location.</p>
        </section>
      ) : null}
    </section>
  );
}

function RackWorkspace({ rack }: { rack: Rack }) {
  const { project } = useProject();
  const location = project.locations.find((candidate) => candidate.id === rack.locationId);
  const devices = project.devices.filter((device) => device.rackId === rack.id);

  return (
    <section className="workspace" aria-label="Rack summary">
      <WorkspaceHeader eyebrow="Rack" title={rack.name} badge={`${rack.heightRu} RU`} />
      <SummaryGrid
        items={[
          ['Rack ID', rack.id],
          ['Location', location?.name ?? 'Unknown location'],
          ['Numbering', rack.numberingDirection],
          ['Rack devices', String(devices.length)],
        ]}
      />
      <section className="workspace-section">
        <h2>Rack Occupancy</h2>
        <p>
          {devices.length === 0
            ? 'No devices are assigned to this rack.'
            : `${devices.length} device(s) reference this rack.`}
        </p>
      </section>
    </section>
  );
}

function DeviceWorkspace({ device }: { device: Device }) {
  const { project } = useProject();
  const portGroups = project.portGroups.filter((group) => group.deviceId === device.id);
  const ports = project.ports.filter((port) => port.deviceId === device.id);
  const cablesById = new Map(project.cables.map((cable) => [cable.id, cable]));
  const groupsByDirection = {
    input: portGroups.filter((group) => group.direction === 'input'),
    output: portGroups.filter((group) => group.direction === 'output'),
    bidirectional: portGroups.filter((group) => group.direction === 'bidirectional'),
  };

  return (
    <section className="workspace" aria-label="Device canvas">
      <WorkspaceHeader eyebrow="Device" title={device.name} badge={device.code || device.mountType} />
      <div className="device-canvas">
        <div className={device.status === 'retired' ? 'device-block retired' : 'device-block'}>
          <div className="device-title">
            <strong>{device.name}</strong>
            <span>{device.status === 'retired' ? 'Retired' : device.code || device.labelPrefix || 'No code'}</span>
          </div>
          <div className="device-io-grid">
            <PortGroupColumn
              title="Inputs"
              groups={groupsByDirection.input}
              ports={ports}
              cablesById={cablesById}
            />
            <div className="device-core">
              <span>{device.manufacturer || 'Manufacturer not set'}</span>
              <strong>{device.model || device.role || 'Device'}</strong>
              <small>{device.mountType}</small>
            </div>
            <PortGroupColumn
              title="Outputs"
              groups={groupsByDirection.output}
              ports={ports}
              cablesById={cablesById}
            />
          </div>
          <div className="bidirectional-groups">
            <PortGroupColumn
              title="Bidirectional"
              groups={groupsByDirection.bidirectional}
              ports={ports}
              cablesById={cablesById}
            />
          </div>
        </div>
        {ports.length === 0 ? (
          <section className="empty-state">
            <h2>No Generated Ports</h2>
            <p>This device has no port groups yet. v0.1 locks port group creation to the Add Device workflow.</p>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function PortGroupColumn({
  title,
  groups,
  ports,
  cablesById,
}: {
  title: string;
  groups: ProjectRoot['portGroups'];
  ports: ProjectRoot['ports'];
  cablesById: Map<string, ProjectRoot['cables'][number]>;
}) {
  return (
    <div className="port-group-column">
      <h2>{title}</h2>
      {groups.length === 0 ? <p>No ports</p> : null}
      {groups.map((group) => {
        const groupPorts = ports.filter((port) => port.portGroupId === group.id);

        return (
          <section className="canvas-port-group" key={group.id}>
            <h3>{group.name}</h3>
            <div className="canvas-port-list">
              {groupPorts.map((port) => {
                const cable = port.plannedCableId ? cablesById.get(port.plannedCableId) : null;

                return (
                  <div className="canvas-port" key={port.id}>
                    <span>{port.label}</span>
                    <strong>{cable?.number ?? 'No cable'}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function WorkspaceHeader({
  eyebrow,
  title,
  badge,
}: {
  eyebrow: string;
  title: string;
  badge: string;
}) {
  return (
    <div className="workspace-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <span className="schema-badge">{badge}</span>
    </div>
  );
}

function SummaryGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="summary-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function Inspector({ selection }: { selection: SelectionState }) {
  const { project } = useProject();
  const selected = resolveSelection(project, selection);

  if (!selected) {
    return (
      <aside className="inspector" aria-label="Right inspector">
        <h2>Inspector</h2>
        <p className="panel-empty">No object selected.</p>
      </aside>
    );
  }

  if (selected.type === 'location') {
    return <LocationInspector location={selected.value} />;
  }

  if (selected.type === 'rack') {
    return <RackInspector rack={selected.value} />;
  }

  if (selected.type === 'device') {
    return <DeviceInspector device={selected.value} />;
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Inspector</h2>
      <dl>
        {getInspectorRows(project, selected).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function LocationInspector({ location }: { location: Location }) {
  const { project, updateLocation, deleteLocation } = useProject();
  const rackCount = project.racks.filter((rack) => rack.locationId === location.id).length;
  const deviceCount = project.devices.filter((device) => device.locationId === location.id).length;
  const [form, setForm] = useState({
    name: location.name,
    type: location.type,
    description: location.description,
  });

  useEffect(() => {
    setForm({
      name: location.name,
      type: location.type,
      description: location.description,
    });
  }, [location.description, location.name, location.type]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateLocation(location.id, form);
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete location "${location.name}"?\n\nLocations with racks or devices will be blocked.`,
    );

    if (confirmed) {
      deleteLocation(location.id);
    }
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Location Inspector</h2>
      <form className="editor-form inspector-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Type</span>
          <input
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
        <button type="submit">Save Location</button>
      </form>
      <section className="inspector-section danger-zone">
        <h3>Danger Zone</h3>
        <p>
          This location references {rackCount} rack(s) and {deviceCount} device(s). Deletion is allowed
          only when both counts are zero.
        </p>
        <button className="danger-button" type="button" onClick={handleDelete}>
          Delete Location
        </button>
      </section>
    </aside>
  );
}

function RackInspector({ rack }: { rack: Rack }) {
  const { project, updateRack, deleteRack } = useProject();
  const devices = project.devices.filter((device) => device.rackId === rack.id);
  const [form, setForm] = useState({
    name: rack.name,
    heightRu: String(rack.heightRu),
    numberingDirection: rack.numberingDirection,
  });

  useEffect(() => {
    setForm({
      name: rack.name,
      heightRu: String(rack.heightRu),
      numberingDirection: rack.numberingDirection,
    });
  }, [rack.heightRu, rack.name, rack.numberingDirection]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateRack(rack.id, {
      name: form.name,
      heightRu: Number(form.heightRu),
      numberingDirection: form.numberingDirection,
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete rack "${rack.name}"?\n\nRacks with assigned devices will be blocked.`,
    );

    if (confirmed) {
      deleteRack(rack.id);
    }
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Rack Inspector</h2>
      <form className="editor-form inspector-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Height RU</span>
          <input
            min="1"
            type="number"
            value={form.heightRu}
            onChange={(event) => setForm({ ...form, heightRu: event.target.value })}
          />
        </label>
        <label>
          <span>Numbering direction</span>
          <select
            value={form.numberingDirection}
            onChange={(event) =>
              setForm({
                ...form,
                numberingDirection: event.target.value as Rack['numberingDirection'],
              })
            }
          >
            <option value="bottom_to_top">Bottom to top</option>
            <option value="top_to_bottom">Top to bottom</option>
          </select>
        </label>
        <button type="submit">Save Rack</button>
      </form>

      <section className="inspector-section">
        <h3>Assigned Devices</h3>
        {devices.length === 0 ? (
          <p>No devices assigned to this rack.</p>
        ) : (
          <ul className="compact-list">
            {devices.map((device) => (
              <li key={device.id}>{device.name}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="inspector-section danger-zone">
        <h3>Danger Zone</h3>
        <p>Deleting a rack is allowed only when no devices are assigned to it.</p>
        <button className="danger-button" type="button" onClick={handleDelete}>
          Delete Rack
        </button>
      </section>
    </aside>
  );
}

function DeviceInspector({ device }: { device: Device }) {
  const { project, updateDevice, retireDevice } = useProject();
  const availableRacks = project.racks.filter((rack) => rack.locationId === device.locationId);
  const [form, setForm] = useState({
    name: device.name,
    code: device.code,
    manufacturer: device.manufacturer,
    model: device.model,
    role: device.role,
    notes: device.notes,
    locationId: device.locationId,
    rackId: device.rackId ?? '',
    rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
    rackBottomRu: device.rackBottomRu ? String(device.rackBottomRu) : '',
  });

  useEffect(() => {
    setForm({
      name: device.name,
      code: device.code,
      manufacturer: device.manufacturer,
      model: device.model,
      role: device.role,
      notes: device.notes,
      locationId: device.locationId,
      rackId: device.rackId ?? '',
      rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
      rackBottomRu: device.rackBottomRu ? String(device.rackBottomRu) : '',
    });
  }, [device]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateDevice(device.id, {
      name: form.name,
      code: form.code,
      manufacturer: form.manufacturer,
      model: form.model,
      role: form.role,
      notes: form.notes,
      locationId: form.locationId,
      rackId: form.rackId || null,
      rackSizeRu: form.rackSizeRu ? Number(form.rackSizeRu) : null,
      rackBottomRu: form.rackBottomRu ? Number(form.rackBottomRu) : null,
    });
  }

  function handleRetire() {
    const confirmed = window.confirm(
      `Retire device "${device.name}"?\n\nThe device remains in the project. Its planned cables and cable ranges are marked retired, and cable numbers stay unavailable.`,
    );

    if (confirmed) {
      retireDevice(device.id);
    }
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Device Inspector</h2>
      <form className="editor-form inspector-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          <span>Code</span>
          <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        </label>
        <label>
          <span>Manufacturer</span>
          <input
            value={form.manufacturer}
            onChange={(event) => setForm({ ...form, manufacturer: event.target.value })}
          />
        </label>
        <label>
          <span>Model</span>
          <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
        </label>
        <label>
          <span>Role</span>
          <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
        </label>
        <label>
          <span>Location</span>
          <select
            value={form.locationId}
            onChange={(event) => setForm({ ...form, locationId: event.target.value, rackId: '' })}
          >
            {project.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Rack assignment</span>
          <select value={form.rackId} onChange={(event) => setForm({ ...form, rackId: event.target.value })}>
            <option value="">No rack</option>
            {availableRacks.map((rack) => (
              <option key={rack.id} value={rack.id}>
                {rack.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Rack size RU</span>
          <input
            min="1"
            type="number"
            value={form.rackSizeRu}
            onChange={(event) => setForm({ ...form, rackSizeRu: event.target.value })}
          />
        </label>
        <label>
          <span>Rack bottom RU</span>
          <input
            min="1"
            type="number"
            value={form.rackBottomRu}
            onChange={(event) => setForm({ ...form, rackBottomRu: event.target.value })}
          />
        </label>
        <label>
          <span>Notes</span>
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>
        <button type="submit">Save Device</button>
      </form>
      <section className="inspector-section">
        <h3>Cable Ranges</h3>
        <p>Port group cable allocation fields are locked in v0.1.</p>
      </section>
      <section className="inspector-section danger-zone">
        <h3>Danger Zone</h3>
        <p>Device deletion retires allocations in v0.1 so cable numbers are never freed for reuse.</p>
        <button className="danger-button" type="button" onClick={handleRetire}>
          Retire Device
        </button>
      </section>
    </aside>
  );
}

function AddLocationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { addLocation } = useProject();
  const [form, setForm] = useState({ name: '', type: '', description: '' });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    const id = addLocation({
      name: form.name.trim(),
      type: form.type.trim(),
      description: form.description.trim(),
    });
    onCreated(id);
  }

  return (
    <ModalFrame title="Add Location" onClose={onClose}>
      <form className="editor-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            autoFocus
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Type</span>
          <input
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Add Location</button>
        </div>
      </form>
    </ModalFrame>
  );
}

function AddRackModal({
  locationId,
  onClose,
  onCreated,
}: {
  locationId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { addRack } = useProject();
  const [form, setForm] = useState({
    name: '',
    heightRu: '42',
    numberingDirection: 'bottom_to_top' as Rack['numberingDirection'],
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    const id = addRack({
      locationId,
      name: form.name.trim(),
      heightRu: Number(form.heightRu),
      numberingDirection: form.numberingDirection,
    });
    onCreated(id);
  }

  return (
    <ModalFrame title="Add Rack" onClose={onClose}>
      <form className="editor-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            autoFocus
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Height RU</span>
          <input
            min="1"
            required
            type="number"
            value={form.heightRu}
            onChange={(event) => setForm({ ...form, heightRu: event.target.value })}
          />
        </label>
        <label>
          <span>Numbering direction</span>
          <select
            value={form.numberingDirection}
            onChange={(event) =>
              setForm({
                ...form,
                numberingDirection: event.target.value as Rack['numberingDirection'],
              })
            }
          >
            <option value="bottom_to_top">Bottom to top</option>
            <option value="top_to_bottom">Top to bottom</option>
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Add Rack</button>
        </div>
      </form>
    </ModalFrame>
  );
}

interface DevicePortGroupForm extends DevicePortGroupDraft {
  localId: string;
}

function AddDeviceModal({
  initialLocationId,
  onClose,
  onCreated,
}: {
  initialLocationId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { project, addDevice } = useProject();
  const firstCategory = project.settings.categories[0];
  const [device, setDevice] = useState<DeviceDraft>({
    name: '',
    code: '',
    manufacturer: '',
    model: '',
    categoryId: firstCategory?.id ?? '',
    locationId: initialLocationId ?? project.locations[0]?.id ?? '',
    role: '',
    labelPrefix: '',
    mountType: 'non_rack',
    rackId: null,
    rackSizeRu: null,
    rackBottomRu: null,
    notes: '',
  });
  const [portGroups, setPortGroups] = useState<DevicePortGroupForm[]>(() =>
    createQuickPortGroups(project, firstCategory?.id ?? '', ''),
  );
  const locationRacks = project.racks.filter((rack) => rack.locationId === device.locationId);
  const validation = getAddDeviceValidation(project, device, portGroups);

  function handleCategoryChange(categoryId: string) {
    setDevice({ ...device, categoryId });
    setPortGroups(createQuickPortGroups(project, categoryId, device.labelPrefix || device.code));
  }

  function updatePortGroup(localId: string, updates: Partial<DevicePortGroupForm>) {
    setPortGroups((current) =>
      current.map((group) => {
        if (group.localId !== localId) {
          return group;
        }

        const updated = { ...group, ...updates };
        const count = Number(updated.count);

        return {
          ...updated,
          count,
          firstCableNumber: updated.firstCableNumber === null ? null : Number(updated.firstCableNumber),
        };
      }),
    );
  }

  function addPortGroup() {
    const category = project.settings.categories.find((item) => item.id === device.categoryId);
    const prefix = category?.defaultCablePrefix ?? project.settings.cablePrefixes[0]?.prefix ?? 'V';

    setPortGroups((current) => [
      ...current,
      {
        localId: `group-${Date.now()}`,
        name: 'PORTS',
        direction: 'bidirectional',
        categoryId: device.categoryId,
        connectorTypeId: project.settings.connectorTypes[0]?.id ?? '',
        count: 1,
        portLabelPattern: '{DEVICE}-{000}',
        cablePrefix: prefix,
        firstCableNumber: getSuggestedFirstCableNumber(project, prefix, current),
        createPlannedCables: true,
      },
    ]);
  }

  function removePortGroup(localId: string) {
    setPortGroups((current) => current.filter((group) => group.localId !== localId));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validation.errors.length > 0) {
      return;
    }

    if (validation.warnings.length > 0) {
      const confirmed = window.confirm(
        `${validation.warnings.join('\n')}\n\nContinue and reserve these cable number gaps?`,
      );

      if (!confirmed) {
        return;
      }
    }

    const id = addDevice({
      device: {
        ...device,
        name: device.name.trim(),
        code: device.code.trim(),
        labelPrefix: (device.labelPrefix || device.code || device.name).trim(),
        rackId: device.mountType === 'rack' ? device.rackId : null,
        rackSizeRu: device.mountType === 'rack' ? device.rackSizeRu : null,
        rackBottomRu: device.mountType === 'rack' ? device.rackBottomRu : null,
      },
      portGroups: portGroups.map(({ localId: _localId, ...group }) => group),
    });
    onCreated(id);
  }

  return (
    <ModalFrame title="Add Device" onClose={onClose}>
      <form className="editor-form add-device-form" onSubmit={handleSubmit}>
        <section className="modal-section">
          <h3>Basic</h3>
          <div className="form-grid two">
            <label>
              <span>Device name</span>
              <input
                autoFocus
                required
                value={device.name}
                onChange={(event) => setDevice({ ...device, name: event.target.value })}
              />
            </label>
            <label>
              <span>Device code</span>
              <input
                required
                value={device.code}
                onChange={(event) => setDevice({ ...device, code: event.target.value.toUpperCase() })}
              />
            </label>
            <label>
              <span>Manufacturer</span>
              <input
                value={device.manufacturer}
                onChange={(event) => setDevice({ ...device, manufacturer: event.target.value })}
              />
            </label>
            <label>
              <span>Model</span>
              <input
                value={device.model}
                onChange={(event) => setDevice({ ...device, model: event.target.value })}
              />
            </label>
            <label>
              <span>Category</span>
              <select value={device.categoryId} onChange={(event) => handleCategoryChange(event.target.value)}>
                {project.settings.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Location</span>
              <select
                value={device.locationId}
                onChange={(event) =>
                  setDevice({ ...device, locationId: event.target.value, rackId: null })
                }
              >
                <option value="">No location</option>
                {project.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Role</span>
              <input value={device.role} onChange={(event) => setDevice({ ...device, role: event.target.value })} />
            </label>
            <label>
              <span>Label prefix</span>
              <input
                value={device.labelPrefix}
                placeholder={device.code || device.name || 'MTX'}
                onChange={(event) => setDevice({ ...device, labelPrefix: event.target.value.toUpperCase() })}
              />
            </label>
          </div>
        </section>

        <section className="modal-section">
          <h3>Physical</h3>
          <div className="form-grid two">
            <label>
              <span>Mount type</span>
              <select
                value={device.mountType}
                onChange={(event) =>
                  setDevice({
                    ...device,
                    mountType: event.target.value as Device['mountType'],
                    rackId: event.target.value === 'rack' ? device.rackId : null,
                  })
                }
              >
                <option value="rack">Rack</option>
                <option value="non_rack">Non-rack</option>
                <option value="virtual">Virtual</option>
              </select>
            </label>
            <label>
              <span>Rack</span>
              <select
                disabled={device.mountType !== 'rack'}
                value={device.rackId ?? ''}
                onChange={(event) => setDevice({ ...device, rackId: event.target.value || null })}
              >
                <option value="">No rack</option>
                {locationRacks.map((rack) => (
                  <option key={rack.id} value={rack.id}>
                    {rack.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Rack size RU</span>
              <input
                disabled={device.mountType !== 'rack'}
                min="1"
                type="number"
                value={device.rackSizeRu ?? ''}
                onChange={(event) =>
                  setDevice({ ...device, rackSizeRu: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
            <label>
              <span>Rack bottom RU</span>
              <input
                disabled={device.mountType !== 'rack'}
                min="1"
                type="number"
                value={device.rackBottomRu ?? ''}
                onChange={(event) =>
                  setDevice({ ...device, rackBottomRu: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
          </div>
        </section>

        <section className="modal-section">
          <div className="section-heading">
            <h3>Port Groups</h3>
            <button type="button" onClick={addPortGroup}>
              Add Port Group
            </button>
          </div>
          <div className="port-group-editor-list">
            {portGroups.map((group) => {
              const lastCableNumber =
                group.firstCableNumber && group.count > 0
                  ? group.firstCableNumber + group.count - 1
                  : null;

              return (
                <section className="port-group-editor" key={group.localId}>
                  <div className="port-group-editor-heading">
                    <strong>{group.name || 'Port group'}</strong>
                    <button type="button" onClick={() => removePortGroup(group.localId)}>
                      Remove
                    </button>
                  </div>
                  <div className="form-grid three">
                    <label>
                      <span>Name</span>
                      <input
                        value={group.name}
                        onChange={(event) => updatePortGroup(group.localId, { name: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Direction</span>
                      <select
                        value={group.direction}
                        onChange={(event) =>
                          updatePortGroup(group.localId, {
                            direction: event.target.value as DevicePortGroupDraft['direction'],
                          })
                        }
                      >
                        <option value="input">Input</option>
                        <option value="output">Output</option>
                        <option value="bidirectional">Bidirectional</option>
                      </select>
                    </label>
                    <label>
                      <span>Category</span>
                      <select
                        value={group.categoryId}
                        onChange={(event) => updatePortGroup(group.localId, { categoryId: event.target.value })}
                      >
                        {project.settings.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Connector type</span>
                      <select
                        value={group.connectorTypeId}
                        onChange={(event) =>
                          updatePortGroup(group.localId, { connectorTypeId: event.target.value })
                        }
                      >
                        {project.settings.connectorTypes.map((connectorType) => (
                          <option key={connectorType.id} value={connectorType.id}>
                            {connectorType.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Count</span>
                      <input
                        min="1"
                        type="number"
                        value={group.count}
                        onChange={(event) => updatePortGroup(group.localId, { count: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span>Port label pattern</span>
                      <input
                        value={group.portLabelPattern}
                        onChange={(event) =>
                          updatePortGroup(group.localId, { portLabelPattern: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Cable prefix</span>
                      <select
                        value={group.cablePrefix}
                        onChange={(event) =>
                          updatePortGroup(group.localId, {
                            cablePrefix: event.target.value,
                            firstCableNumber: getSuggestedFirstCableNumber(project, event.target.value, portGroups),
                          })
                        }
                      >
                        {project.settings.cablePrefixes.map((prefix) => (
                          <option key={prefix.id} value={prefix.prefix}>
                            {prefix.prefix}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>First cable number</span>
                      <input
                        min="1"
                        type="number"
                        value={group.firstCableNumber ?? ''}
                        onChange={(event) =>
                          updatePortGroup(group.localId, {
                            firstCableNumber: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Last cable number</span>
                      <input readOnly value={lastCableNumber ? formatCableNumber(group.cablePrefix, lastCableNumber) : ''} />
                    </label>
                  </div>
                  <label className="checkbox-row">
                    <input
                      checked={group.createPlannedCables}
                      type="checkbox"
                      onChange={(event) =>
                        updatePortGroup(group.localId, { createPlannedCables: event.target.checked })
                      }
                    />
                    <span>Create planned cables</span>
                  </label>
                </section>
              );
            })}
          </div>
          <div className="form-messages">
            {validation.warnings.map((warning) => (
              <p className="form-warning" key={warning}>
                {warning}
              </p>
            ))}
            {validation.errors.map((error) => (
              <p className="form-error" key={error}>
                {error}
              </p>
            ))}
          </div>
        </section>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button disabled={validation.errors.length > 0} type="submit">
            Create Device
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function createQuickPortGroups(
  project: ProjectRoot,
  categoryId: string,
  _deviceLabelPrefix: string,
): DevicePortGroupForm[] {
  const category = project.settings.categories.find((item) => item.id === categoryId);
  const categoryName = category?.name.toLowerCase() ?? '';
  const defaultPrefix = category?.defaultCablePrefix ?? project.settings.cablePrefixes[0]?.prefix ?? 'V';
  const nextByPrefix = new Map(project.numberingLedgers.map((ledger) => [ledger.prefix, ledger.nextSuggested]));

  function makeGroup(input: {
    name: string;
    direction: DevicePortGroupDraft['direction'];
    connectorName: string;
    prefix: string;
    pattern: string;
    count?: number;
  }): DevicePortGroupForm {
    const count = input.count ?? 4;
    const firstCableNumber = nextByPrefix.get(input.prefix) ?? 1;

    nextByPrefix.set(input.prefix, firstCableNumber + count);

    return {
      localId: `${input.name}-${Date.now()}-${Math.random()}`,
      name: input.name,
      direction: input.direction,
      categoryId,
      connectorTypeId: findConnectorTypeId(project, input.connectorName),
      count,
      portLabelPattern: input.pattern,
      cablePrefix: input.prefix,
      firstCableNumber,
      createPlannedCables: true,
    };
  }

  if (categoryName === 'video') {
    return [
      makeGroup({
        name: 'SDI IN',
        direction: 'input',
        connectorName: 'BNC',
        prefix: 'V',
        pattern: '{DEVICE}-IN-{000}',
      }),
      makeGroup({
        name: 'SDI OUT',
        direction: 'output',
        connectorName: 'BNC',
        prefix: 'V',
        pattern: '{DEVICE}-OUT-{000}',
      }),
    ];
  }

  if (categoryName === 'audio') {
    return [
      makeGroup({
        name: 'AUDIO IN',
        direction: 'input',
        connectorName: 'XLR',
        prefix: 'A',
        pattern: '{DEVICE}-AIN-{000}',
      }),
      makeGroup({
        name: 'AUDIO OUT',
        direction: 'output',
        connectorName: 'XLR',
        prefix: 'A',
        pattern: '{DEVICE}-AOUT-{000}',
      }),
    ];
  }

  if (categoryName === 'network') {
    return [
      makeGroup({
        name: 'NETWORK',
        direction: 'bidirectional',
        connectorName: 'RJ45',
        prefix: 'N',
        pattern: '{DEVICE}-NET-{000}',
      }),
    ];
  }

  return [
    makeGroup({
      name: 'PORTS',
      direction: 'bidirectional',
      connectorName: project.settings.connectorTypes[0]?.name ?? 'Other',
      prefix: defaultPrefix,
      pattern: '{DEVICE}-{000}',
    }),
  ];
}

function findConnectorTypeId(project: ProjectRoot, name: string): string {
  return (
    project.settings.connectorTypes.find(
      (connectorType) => connectorType.name.toLowerCase() === name.toLowerCase(),
    )?.id ??
    project.settings.connectorTypes[0]?.id ??
    ''
  );
}

function getSuggestedFirstCableNumber(
  project: ProjectRoot,
  prefix: string,
  currentGroups: DevicePortGroupForm[],
): number {
  let nextSuggested = project.numberingLedgers.find((ledger) => ledger.prefix === prefix)?.nextSuggested ?? 1;

  for (const group of currentGroups) {
    if (
      group.cablePrefix === prefix &&
      group.createPlannedCables &&
      group.firstCableNumber !== null &&
      group.count > 0
    ) {
      nextSuggested = Math.max(nextSuggested, group.firstCableNumber + group.count);
    }
  }

  return nextSuggested;
}

function getAddDeviceValidation(
  project: ProjectRoot,
  device: DeviceDraft,
  portGroups: DevicePortGroupForm[],
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let previewProject = project;

  if (!device.name.trim()) {
    errors.push('Device name is required.');
  }

  if (!device.code.trim()) {
    errors.push('Device code is required.');
  }

  if (!device.categoryId) {
    errors.push('Device category is required.');
  }

  if (device.mountType !== 'virtual' && !device.locationId) {
    errors.push('Location is required unless the device is virtual.');
  }

  if (device.mountType === 'rack') {
    const rack = device.rackId ? project.racks.find((candidate) => candidate.id === device.rackId) : null;

    if (!rack || !device.rackSizeRu || !device.rackBottomRu) {
      errors.push('Rack-mounted devices require rack, rack size, and rack bottom RU.');
    } else if (
      device.rackBottomRu < 1 ||
      device.rackSizeRu < 1 ||
      device.rackBottomRu + device.rackSizeRu - 1 > rack.heightRu
    ) {
      errors.push('Rack position must fit inside the rack height.');
    }
  }

  if (portGroups.length === 0) {
    errors.push('At least one port group is required.');
  }

  for (const group of portGroups) {
    if (!group.name.trim()) {
      errors.push('Port group name is required.');
    }

    if (!Number.isSafeInteger(group.count) || group.count <= 0) {
      errors.push(`${group.name || 'Port group'} count must be positive.`);
    }

    if (!project.settings.cablePrefixes.some((prefix) => prefix.prefix === group.cablePrefix)) {
      errors.push(`${group.name || 'Port group'} uses an unknown cable prefix.`);
    }

    if (group.createPlannedCables) {
      if (!group.firstCableNumber || group.firstCableNumber < 1) {
        errors.push(`${group.name || 'Port group'} needs a positive first cable number.`);
        continue;
      }

      const preview = previewCableRange(previewProject, group.cablePrefix, group.firstCableNumber, group.count);

      for (const error of preview.errors) {
        errors.push(`${group.name}: ${error.message}`);
      }

      if (preview.reservedGap) {
        warnings.push(
          `Numbers ${formatCableNumber(preview.reservedGap.prefix, preview.reservedGap.from)} to ${formatCableNumber(
            preview.reservedGap.prefix,
            preview.reservedGap.to,
          )} will be reserved and cannot be used later.`,
        );
      }

      if (preview.errors.length === 0) {
        previewProject = allocateCableRange(previewProject, {
          prefix: group.cablePrefix,
          firstCableNumber: group.firstCableNumber,
          count: group.count,
          ownerType: 'preview',
          ownerId: group.localId,
          reason: 'Preview device allocation',
        }).project;
      }
    }
  }

  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}

function ModalFrame({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ValidationPanel({ onSelectIssue }: { onSelectIssue: (issue: ValidationIssue) => void }) {
  const { project } = useProject();
  const issues = project.validationIssues;
  const groupedIssues = {
    error: issues.filter((issue) => issue.severity === 'error'),
    warning: issues.filter((issue) => issue.severity === 'warning'),
    info: issues.filter((issue) => issue.severity === 'info'),
  };

  return (
    <footer className="validation-panel" aria-label="Bottom validation panel">
      <div>
        <h2>Validation</h2>
        <p>{issues.length === 0 ? 'No validation issues.' : `${issues.length} validation issue(s).`}</p>
      </div>
      <div className="issue-list">
        {issues.length === 0 ? (
          <span className="issue-empty">No validation issues.</span>
        ) : (
          (['error', 'warning', 'info'] as const).map((severity) => (
            <section className="issue-group" key={severity}>
              <h3>
                {severity}s <span>{groupedIssues[severity].length}</span>
              </h3>
              <div>
                {groupedIssues[severity].map((issue) => (
                  <button
                    className={`issue-pill ${issue.severity}`}
                    key={issue.id}
                    onClick={() => onSelectIssue(issue)}
                    type="button"
                  >
                    {issue.code}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </footer>
  );
}

type ResolvedSelection =
  | { type: 'project'; value: ProjectInfo }
  | { type: 'settings'; value: ProjectRoot['settings'] }
  | { type: 'location'; value: Location }
  | { type: 'rack'; value: Rack }
  | { type: 'device'; value: Device };

function resolveSelection(project: ProjectRoot, selection: SelectionState): ResolvedSelection | null {
  if (!selection.selectedObjectType) {
    return null;
  }

  switch (selection.selectedObjectType) {
    case 'project':
      return { type: 'project' as const, value: project.project };
    case 'settings':
      return { type: 'settings' as const, value: project.settings };
    case 'location': {
      const value = project.locations.find((location) => location.id === selection.selectedObjectId);

      return value ? { type: 'location' as const, value } : null;
    }
    case 'rack': {
      const value = project.racks.find((rack) => rack.id === selection.selectedObjectId);

      return value ? { type: 'rack' as const, value } : null;
    }
    case 'device': {
      const value = project.devices.find((device) => device.id === selection.selectedObjectId);

      return value ? { type: 'device' as const, value } : null;
    }
  }
}

function resolveIssueSelection(
  project: ProjectRoot,
  issue: ValidationIssue,
): { selectedObjectType: SelectedObjectType; selectedObjectId: string } | null {
  if (issue.objectType === 'project') {
    return { selectedObjectType: 'project', selectedObjectId: project.project.id };
  }

  if (issue.objectType === 'location' && project.locations.some((location) => location.id === issue.objectId)) {
    return { selectedObjectType: 'location', selectedObjectId: issue.objectId };
  }

  if (issue.objectType === 'rack' && project.racks.some((rack) => rack.id === issue.objectId)) {
    return { selectedObjectType: 'rack', selectedObjectId: issue.objectId };
  }

  if (issue.objectType === 'device' && project.devices.some((device) => device.id === issue.objectId)) {
    return { selectedObjectType: 'device', selectedObjectId: issue.objectId };
  }

  if (issue.objectType === 'portGroup') {
    const portGroup = project.portGroups.find((candidate) => candidate.id === issue.objectId);

    return portGroup ? { selectedObjectType: 'device', selectedObjectId: portGroup.deviceId } : null;
  }

  if (issue.objectType === 'port') {
    const port = project.ports.find((candidate) => candidate.id === issue.objectId);

    return port ? { selectedObjectType: 'device', selectedObjectId: port.deviceId } : null;
  }

  if (issue.objectType === 'cable') {
    const cable = project.cables.find((candidate) => candidate.id === issue.objectId);
    const endpointPortId =
      cable?.sourceEndpoint.type === 'device_port'
        ? cable.sourceEndpoint.id
        : cable?.destinationEndpoint.type === 'device_port'
          ? cable.destinationEndpoint.id
          : null;
    const port = endpointPortId ? project.ports.find((candidate) => candidate.id === endpointPortId) : null;

    return port ? { selectedObjectType: 'device', selectedObjectId: port.deviceId } : null;
  }

  return null;
}

function getInspectorRows(
  project: ProjectRoot,
  selected: ResolvedSelection,
): Array<[string, string]> {
  switch (selected.type) {
    case 'project':
      return [
        ['Type', 'Project'],
        ['ID', selected.value.id],
        ['Name', selected.value.name],
        ['Customer', selected.value.customer || 'Not set'],
        ['Revision', selected.value.revision],
        ['Status', selected.value.status],
        ['Created', formatDate(selected.value.createdAt)],
        ['Updated', formatDate(selected.value.updatedAt)],
      ];
    case 'settings':
      return [
        ['Type', 'Settings'],
        ['Categories', String(selected.value.categories.length)],
        ['Connector types', String(selected.value.connectorTypes.length)],
        ['Cable prefixes', String(selected.value.cablePrefixes.length)],
        ['Default rack height', `${selected.value.rackDefaults.heightRu} RU`],
      ];
    case 'location':
      return [
        ['Type', 'Location'],
        ['ID', selected.value.id],
        ['Name', selected.value.name],
        ['Location type', selected.value.type || 'Not set'],
        ['Description', selected.value.description || 'Not set'],
      ];
    case 'rack': {
      const location = project.locations.find((candidate) => candidate.id === selected.value.locationId);

      return [
        ['Type', 'Rack'],
        ['ID', selected.value.id],
        ['Name', selected.value.name],
        ['Location', location?.name ?? selected.value.locationId],
        ['Height', `${selected.value.heightRu} RU`],
        ['Numbering direction', selected.value.numberingDirection],
      ];
    }
    case 'device': {
      const location = project.locations.find((candidate) => candidate.id === selected.value.locationId);
      const rack = selected.value.rackId
        ? project.racks.find((candidate) => candidate.id === selected.value.rackId)
        : null;

      return [
        ['Type', 'Device'],
        ['ID', selected.value.id],
        ['Name', selected.value.name],
        ['Code', selected.value.code || 'Not set'],
        ['Manufacturer', selected.value.manufacturer || 'Not set'],
        ['Model', selected.value.model || 'Not set'],
        ['Location', (location?.name ?? selected.value.locationId) || 'Unassigned'],
        ['Rack', rack?.name ?? 'Not rack-mounted'],
        ['Mount type', selected.value.mountType],
        ['Status', selected.value.status],
      ];
    }
  }
}

function isSelected(selection: SelectionState, type: SelectedObjectType, id: string) {
  return selection.selectedObjectType === type && selection.selectedObjectId === id;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default App;
