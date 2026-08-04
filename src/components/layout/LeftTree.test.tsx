/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { Device, ProjectRoot } from '../../domain/types';
import { STUDIOWIRE_CURRENT_VERSION } from '../../domain/version';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { noopViewCommands } from '../../test/projectContextStubs';
import { LeftTree } from './LeftTree';

const contextHarness = vi.hoisted(() => ({
  current: null as ProjectContextValue | null,
}));

vi.mock('../../state/ProjectContext', () => ({
  useProject: () => {
    if (!contextHarness.current) {
      throw new Error('missing test project context');
    }

    return contextHarness.current;
  },
}));

function projectFixture(): ProjectRoot {
  const project = structuredClone(sampleProject);

  project.subLocations = [
    {
      id: 'sub-location-front-table',
      locationId: 'location-machine-room',
      name: 'Front Table',
      description: '',
    },
  ];
  project.devices = [
    ...project.devices,
    device({ id: 'device-tb', name: 'TB 1', kind: 'terminal_block', locationId: 'location-machine-room' }),
    device({
      id: 'device-loose',
      name: 'Loose Device',
      locationId: 'location-machine-room',
      rackSizeRu: null,
    }),
    device({
      id: 'device-front-table',
      name: 'Front Table Device',
      locationId: 'location-machine-room',
      subLocationId: 'sub-location-front-table',
    }),
  ];

  return project;
}

function device(overrides: Partial<Device>): Device {
  return {
    id: 'device-extra',
    name: 'Extra Device',
    kind: 'device',
    code: 'EX',
    manufacturer: '',
    model: '',
    categoryId: 'category-video',
    locationId: 'location-machine-room',
    subLocationId: null,
    role: '',
    labelPrefix: 'EX',
    mountType: 'rack',
    rackId: null,
    rackSizeRu: 1,
    rackBottomRu: null,
    status: 'planned',
    notes: '',
    createdAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
    ...overrides,
  };
}

function createContext(
  project: ProjectRoot,
  commands: Partial<ProjectContextValue> = {},
): ProjectContextValue {
  return {
    project,
    statusMessage: '',
    importError: null,
    persistenceState: 'saved',
    createNewProject: vi.fn(),
    loadSampleProject: vi.fn(),
    importProjectJson: vi.fn(async () => true),
    exportProjectJson: vi.fn(),
    validateProject: vi.fn(),
    dismissImportError: vi.fn(),
    updateProjectInfo: vi.fn(),
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    addCategoryConnectorAssignment: vi.fn(),
    removeCategoryConnectorAssignment: vi.fn(),
    addConnectorGroup: vi.fn(),
    updateConnectorGroup: vi.fn(),
    addConnectorGroupMember: vi.fn(),
    removeConnectorGroupMember: vi.fn(),
    addConnectorType: vi.fn(),
    updateConnectorType: vi.fn(),
    addCablePrefix: vi.fn(),
    addLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
    addSubLocation: vi.fn(),
    updateSubLocation: vi.fn(),
    deleteSubLocation: vi.fn(),
    addRack: vi.fn(),
    updateRack: vi.fn(),
    deleteRack: vi.fn(),
    addDevice: vi.fn(),
    addTerminalBlock: vi.fn(),
    connectPorts: vi.fn(),
    disconnectPort: vi.fn(),
    moveMountedDevice: vi.fn(),
    moveNavigatorItemToFolder: vi.fn(),
    unassignDeviceFromRack: vi.fn(),
    updateDevice: vi.fn(),
    editDevice: vi.fn(),
    deleteDevice: vi.fn(),
    editTerminalBlock: vi.fn(),
    deleteTerminalBlock: vi.fn(),
    ...commands,
    ...noopViewCommands,
  };
}

function renderTree(project = projectFixture(), commands: Partial<ProjectContextValue> = {}) {
  const callbacks = {
    onSelectObject: vi.fn(),
    onAddLocation: vi.fn(),
    onAddRack: vi.fn(),
    onAddDevice: vi.fn(),
    onCloneDevice: vi.fn(),
    onEditDevice: vi.fn(),
    onEditTerminalBlock: vi.fn(),
    onAddTerminalBlock: vi.fn(),
    onAddView: vi.fn(),
    onRenameView: vi.fn(),
    onDeleteView: vi.fn(),
  };

  contextHarness.current = createContext(project, commands);
  const view = render(
    <LeftTree
      selection={{ selectedObjectType: 'device', selectedObjectId: 'device-router-1' }}
      onAddDevice={callbacks.onAddDevice}
      onCloneDevice={callbacks.onCloneDevice}
      onEditDevice={callbacks.onEditDevice}
      onEditTerminalBlock={callbacks.onEditTerminalBlock}
      onAddLocation={callbacks.onAddLocation}
      onAddRack={callbacks.onAddRack}
      onAddTerminalBlock={callbacks.onAddTerminalBlock}
      onAddView={callbacks.onAddView}
      onDeleteView={callbacks.onDeleteView}
      onRenameView={callbacks.onRenameView}
      onSelectObject={callbacks.onSelectObject}
    />,
  );

  return { callbacks, project, ...view };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
  vi.restoreAllMocks();
  window.__studioWireDraggingDeviceId = undefined;
  window.__studioWireNavigatorDragPayload = undefined;
});

describe('LeftTree', () => {
  it('keeps the independent Views section visible when the location navigator is empty', () => {
    const project = projectFixture();
    project.locations = [];
    project.subLocations = [];
    project.racks = [];
    project.devices = [];
    project.views = [
      {
        id: 'view-only',
        name: 'Only View',
        description: '',
        pageSize: 'a4',
        orientation: 'landscape',
        placements: [],
        lines: [],
        annotations: [],
      },
    ];

    const rendered = renderTree(project);

    expect(screen.getByText('Create a location')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Only View/ })).toBeTruthy();
    expect(screen.getByText('A4 · Landscape')).toBeTruthy();
    const content = rendered.container.querySelector('.app-sidebar-content');
    expect(content?.lastElementChild?.classList.contains('view-tree-section')).toBe(true);
    expect(rendered.container.querySelector('.project-tree-section')).toBeTruthy();
  });

  it('renders version header, flat item rows, folders, active selection, and stable attributes', () => {
    renderTree();

    expect(
      screen.getByText(`App ${STUDIOWIRE_CURRENT_VERSION}, Schema ${STUDIOWIRE_CURRENT_VERSION}`),
    ).toBeTruthy();
    const locationButtons = screen.getAllByRole('button', { name: /^(Control Room|Machine Room) \d+$/ });

    expect(locationButtons.map((button) => button.textContent)).toEqual(['Control Room1', 'Machine Room5']);
    expect(screen.getByRole('button', { name: /MCR Rack A Rack 42 RU/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Front Table 1/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Front Table Device Device EX/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Router 1 Device RTR1/ }).getAttribute('data-active')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: /TB 1 TB/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Loose Device Device EX/ }).getAttribute('title')).toBe(
      'Set rack size before assigning to a rack',
    );
    expect(document.querySelector('[data-ui="location-collapse-trigger"]')).toBeTruthy();
    expect(document.querySelector('[data-ui="folder-collapse-trigger"]')).toBeTruthy();
    expect(document.querySelector('[data-ui="unassigned-collapse-trigger"]')).toBeNull();
  });

  it('does not render kind grouping folders and still renders the empty project prompt', () => {
    const project = projectFixture();
    project.racks = [];
    project.devices = [];
    project.subLocations = [];
    renderTree(project);

    expect(screen.queryByText('Racks')).toBeNull();
    expect(screen.queryByText('Devices')).toBeNull();
    expect(screen.queryByText('TBs')).toBeNull();
    expect(screen.queryByText('No unassigned devices')).toBeNull();

    cleanup();
    contextHarness.current = createContext({ ...project, locations: [] });
    renderTree({ ...project, locations: [] });
    expect(screen.getByText('Create a location')).toBeTruthy();
    expect(screen.getByText('Devices are added from a location branch.')).toBeTruthy();
  });

  it('tracks collapse and expand state per location and folder', async () => {
    const user = userEvent.setup();
    renderTree();

    await user.click(screen.getByLabelText('Collapse Machine Room'));
    expect(screen.queryByRole('button', { name: /MCR Rack A Rack 42 RU/ })).toBeNull();
    expect(screen.getByLabelText('Expand Machine Room')).toBeTruthy();

    await user.click(screen.getByLabelText('Expand Machine Room'));
    await user.click(screen.getByLabelText('Collapse Front Table'));
    expect(screen.queryByRole('button', { name: /Front Table Device Device EX/ })).toBeNull();
    expect(screen.getByLabelText('Expand Front Table')).toBeTruthy();
  });

  it('wires selection callbacks, context-menu actions, drag data, and project replacement safely', async () => {
    const user = userEvent.setup();
    const { callbacks, project, rerender } = renderTree();

    await user.click(screen.getByRole('button', { name: /MCR Rack A Rack 42 RU/ }));
    expect(callbacks.onSelectObject).toHaveBeenCalledWith('rack', 'rack-mcr-a');
    await user.click(screen.getByRole('button', { name: /Machine Room 5/ }));
    expect(callbacks.onSelectObject).toHaveBeenCalledWith('location', 'location-machine-room');

    fireEvent.contextMenu(screen.getByText('Project navigator'));
    await user.click(await screen.findByText('Add Location'));
    expect(callbacks.onAddLocation).toHaveBeenCalled();

    fireEvent.contextMenu(screen.getByRole('button', { name: /Machine Room 5/ }));
    await user.click(await screen.findByText('Add Rack'));
    expect(callbacks.onAddRack).toHaveBeenCalledWith('location-machine-room');

    fireEvent.contextMenu(screen.getByRole('button', { name: /Machine Room 5/ }));
    await user.click(await screen.findByText('Add Device'));
    expect(callbacks.onAddDevice).toHaveBeenCalledWith('location-machine-room');
    expect(screen.queryByText('Add Unassigned Device')).toBeNull();

    fireEvent.contextMenu(screen.getByRole('button', { name: /Router 1 Device RTR1/ }));
    await user.click(await screen.findByText('Edit Device'));
    expect(callbacks.onEditDevice).toHaveBeenCalledWith('device-router-1');

    fireEvent.contextMenu(screen.getByRole('button', { name: /Router 1 Device RTR1/ }));
    await user.click(await screen.findByText('Clone and Edit'));
    expect(callbacks.onCloneDevice).toHaveBeenCalledWith('device-router-1');

    fireEvent.contextMenu(screen.getByRole('button', { name: /TB 1 TB/ }));
    expect(screen.queryByText('Clone and Edit')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });

    contextHarness.current = createContext({
      ...project,
      locations: project.locations.slice(0, 1),
      racks: [],
      devices: [],
    });
    rerender(
      <LeftTree
        selection={{ selectedObjectType: 'project', selectedObjectId: project.project.id }}
        onAddDevice={callbacks.onAddDevice}
        onCloneDevice={callbacks.onCloneDevice}
        onEditDevice={callbacks.onEditDevice}
        onEditTerminalBlock={callbacks.onEditTerminalBlock}
        onAddLocation={callbacks.onAddLocation}
        onAddRack={callbacks.onAddRack}
        onAddTerminalBlock={callbacks.onAddTerminalBlock}
        onAddView={callbacks.onAddView}
        onDeleteView={callbacks.onDeleteView}
        onRenameView={callbacks.onRenameView}
        onSelectObject={callbacks.onSelectObject}
      />,
    );
    expect(screen.getByRole('button', { name: /^Control Room 0$/ })).toBeTruthy();
    expect(screen.queryByText('Machine Room')).toBeNull();
  }, 10_000);

  it('adds folders from the location context menu with an app modal', async () => {
    const user = userEvent.setup();
    const addSubLocation = vi.fn();
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Browser Prompt');

    renderTree(projectFixture(), { addSubLocation });

    fireEvent.contextMenu(screen.getByRole('button', { name: /Machine Room 5/ }));
    await user.click(await screen.findByText('Add Folder'));
    expect(await screen.findByRole('heading', { name: 'Add Folder' })).toBeTruthy();
    expect((screen.getByLabelText('Folder name') as HTMLInputElement).value).toBe('');

    await user.type(screen.getByLabelText('Folder name'), '  Back Table  ');
    await user.click(screen.getByRole('button', { name: 'Add Folder' }));

    expect(prompt).not.toHaveBeenCalled();
    expect(addSubLocation).toHaveBeenCalledWith({
      locationId: 'location-machine-room',
      name: 'Back Table',
      description: '',
    });
    expect(screen.queryByRole('heading', { name: 'Add Folder' })).toBeNull();
  });

  it('renames folders from the folder context menu with an app modal', async () => {
    const user = userEvent.setup();
    const updateSubLocation = vi.fn();
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Browser Prompt');

    renderTree(projectFixture(), { updateSubLocation });

    fireEvent.contextMenu(screen.getByRole('button', { name: /Front Table 1/ }));
    await user.click(await screen.findByText('Rename Folder'));
    expect(await screen.findByRole('heading', { name: 'Rename Folder' })).toBeTruthy();
    expect((screen.getByLabelText('Folder name') as HTMLInputElement).value).toBe('Front Table');

    await user.clear(screen.getByLabelText('Folder name'));
    await user.type(screen.getByLabelText('Folder name'), '  Back Table  ');
    await user.click(screen.getByRole('button', { name: 'Rename Folder' }));

    expect(prompt).not.toHaveBeenCalled();
    expect(updateSubLocation).toHaveBeenCalledWith('sub-location-front-table', {
      name: 'Back Table',
      description: '',
    });
    expect(screen.queryByRole('heading', { name: 'Rename Folder' })).toBeNull();
  });

  it('validates blank folder modal submissions and cancels without dispatching', async () => {
    const user = userEvent.setup();
    const addSubLocation = vi.fn();
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Browser Prompt');

    renderTree(projectFixture(), { addSubLocation });

    fireEvent.contextMenu(screen.getByRole('button', { name: /Machine Room 5/ }));
    await user.click(await screen.findByText('Add Folder'));

    expect((screen.getByRole('button', { name: 'Add Folder' }) as HTMLButtonElement).disabled).toBe(true);
    expect(addSubLocation).not.toHaveBeenCalled();
    expect(prompt).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('heading', { name: 'Add Folder' })).toBeNull();
    expect(addSubLocation).not.toHaveBeenCalled();
  });

  it('drops navigator devices and racks onto folders and parent locations', () => {
    const moveNavigatorItemToFolder = vi.fn();

    renderTree(projectFixture(), { moveNavigatorItemToFolder });

    const dragged = screen.getByRole('button', { name: /Router 1 Device RTR1/ });
    const deviceTransfer = createDataTransfer();
    fireEvent.dragStart(dragged, { dataTransfer: deviceTransfer });
    expect(window.__studioWireDraggingDeviceId).toBe('device-router-1');
    fireEvent.drop(screen.getByRole('button', { name: /Front Table 1/ }), { dataTransfer: deviceTransfer });
    expect(moveNavigatorItemToFolder).toHaveBeenCalledWith({
      itemType: 'device',
      itemId: 'device-router-1',
      targetLocationId: 'location-machine-room',
      targetFolderId: 'sub-location-front-table',
    });
    fireEvent.dragEnd(dragged);
    expect(window.__studioWireDraggingDeviceId).toBeUndefined();

    const rackTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: /MCR Rack A Rack 42 RU/ }), {
      dataTransfer: rackTransfer,
    });
    fireEvent.drop(screen.getByRole('button', { name: /Front Table 1/ }), { dataTransfer: rackTransfer });
    expect(moveNavigatorItemToFolder).toHaveBeenCalledWith({
      itemType: 'rack',
      itemId: 'rack-mcr-a',
      targetLocationId: 'location-machine-room',
      targetFolderId: 'sub-location-front-table',
    });

    const parentTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: /Front Table Device Device EX/ }), {
      dataTransfer: parentTransfer,
    });
    fireEvent.drop(screen.getByRole('button', { name: /Machine Room 5/ }), { dataTransfer: parentTransfer });
    expect(moveNavigatorItemToFolder).toHaveBeenCalledWith({
      itemType: 'device',
      itemId: 'device-front-table',
      targetLocationId: 'location-machine-room',
      targetFolderId: null,
    });
  });

  it('keeps project content top-aligned and gives a fourth View an independent scrolling list', () => {
    const project = projectFixture();
    project.views = Array.from({ length: 4 }, (_, index) => ({
      id: `view-${index + 1}`,
      name: `View ${index + 1}`,
      description: '',
      pageSize: 'a3' as const,
      orientation: 'portrait' as const,
      placements: [],
      lines: [],
      annotations: [],
    }));
    const { container } = renderTree(project);

    expect(container.querySelector('.project-tree-section > .project-tree-content')).toBeTruthy();
    expect(container.querySelector('.view-tree-section > .view-tree-content')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /View \d A3/ })).toHaveLength(4);
    expect(container.querySelector('.view-tree-heading')?.textContent).toContain('Views');
  });
});

function createDataTransfer() {
  const data = new Map<string, string>();

  return {
    effectAllowed: '',
    dropEffect: '',
    setData: vi.fn((key: string, value: string) => data.set(key, value)),
    getData: vi.fn((key: string) => data.get(key) ?? ''),
  };
}
