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

  project.devices = [
    ...project.devices,
    device({ id: 'device-tb', name: 'TB 1', kind: 'terminal_block', locationId: 'location-machine-room' }),
    device({ id: 'device-loose', name: 'Loose Device', locationId: null, rackSizeRu: null }),
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

function createContext(project: ProjectRoot): ProjectContextValue {
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
    addRack: vi.fn(),
    updateRack: vi.fn(),
    deleteRack: vi.fn(),
    addDevice: vi.fn(),
    addTerminalBlock: vi.fn(),
    connectPorts: vi.fn(),
    disconnectPort: vi.fn(),
    moveMountedDevice: vi.fn(),
    updateDevice: vi.fn(),
    retireDevice: vi.fn(),
  };
}

function renderTree(project = projectFixture()) {
  const callbacks = {
    onSelectObject: vi.fn(),
    onAddLocation: vi.fn(),
    onAddRack: vi.fn(),
    onAddDevice: vi.fn(),
    onAddTerminalBlock: vi.fn(),
  };

  contextHarness.current = createContext(project);
  const view = render(
    <LeftTree
      selection={{ selectedObjectType: 'device', selectedObjectId: 'device-router-1' }}
      onAddDevice={callbacks.onAddDevice}
      onAddLocation={callbacks.onAddLocation}
      onAddRack={callbacks.onAddRack}
      onAddTerminalBlock={callbacks.onAddTerminalBlock}
      onSelectObject={callbacks.onSelectObject}
    />,
  );

  return { callbacks, project, ...view };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
  window.__studioWireDraggingDeviceId = undefined;
});

describe('LeftTree', () => {
  it('renders version header, location order, grouped folders, empty labels, active selection, and stable attributes', () => {
    renderTree();

    expect(
      screen.getByText(`App ${STUDIOWIRE_CURRENT_VERSION}, Schema ${STUDIOWIRE_CURRENT_VERSION}`),
    ).toBeTruthy();
    const locationButtons = screen.getAllByRole('button', { name: /^(Control Room|Machine Room) \d+$/ });

    expect(locationButtons.map((button) => button.textContent)).toEqual(['Control Room1', 'Machine Room3']);
    expect(screen.getByRole('button', { name: /MCR Rack A 42 RU/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Router 1 RTR1/ }).getAttribute('data-active')).toBe('true');
    expect(screen.getByRole('button', { name: /TB 1 TB/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Loose Device EX/ }).getAttribute('title')).toBe(
      'Set rack size before assigning to a rack',
    );
    expect(document.querySelector('[data-ui="location-collapse-trigger"]')).toBeTruthy();
    expect(document.querySelector('[data-ui="folder-collapse-trigger"]')).toBeTruthy();
    expect(document.querySelector('[data-ui="unassigned-collapse-trigger"]')).toBeTruthy();
  });

  it('renders empty folder labels and empty project prompt without changing labels', () => {
    const project = projectFixture();
    project.racks = [];
    project.devices = [];
    renderTree(project);

    expect(screen.getAllByText('No racks')).toHaveLength(2);
    expect(screen.getAllByText('No devices')).toHaveLength(2);
    expect(screen.getAllByText('No terminal blocks')).toHaveLength(2);
    expect(screen.getByText('No unassigned devices')).toBeTruthy();

    cleanup();
    contextHarness.current = createContext({ ...project, locations: [] });
    renderTree({ ...project, locations: [] });
    expect(screen.getByText('Create location or device')).toBeTruthy();
    expect(screen.getByText('Right-click here to start the project tree.')).toBeTruthy();
  });

  it('tracks collapse and expand state per location, folder, and unassigned branch', async () => {
    const user = userEvent.setup();
    renderTree();

    await user.click(screen.getByLabelText('Collapse Machine Room'));
    expect(screen.queryByRole('button', { name: /MCR Rack A 42 RU/ })).toBeNull();
    expect(screen.getByLabelText('Expand Machine Room')).toBeTruthy();

    await user.click(screen.getByLabelText('Expand Machine Room'));
    await user.click(screen.getAllByLabelText('Collapse Devices')[1]);
    expect(screen.queryByRole('button', { name: /Router 1 RTR1/ })).toBeNull();
    expect(screen.getAllByLabelText('Expand Devices')[0]).toBeTruthy();

    await user.click(screen.getByLabelText('Collapse Unassigned Devices'));
    expect(screen.queryByRole('button', { name: /Loose Device EX/ })).toBeNull();
    expect(screen.getByLabelText('Expand Unassigned Devices')).toBeTruthy();
  });

  it('wires selection callbacks, context-menu actions, drag data, and project replacement safely', async () => {
    const user = userEvent.setup();
    const { callbacks, project, rerender } = renderTree();

    await user.click(screen.getByRole('button', { name: /MCR Rack A 42 RU/ }));
    expect(callbacks.onSelectObject).toHaveBeenCalledWith('rack', 'rack-mcr-a');
    await user.click(screen.getByRole('button', { name: /Machine Room 3/ }));
    expect(callbacks.onSelectObject).toHaveBeenCalledWith('location', 'location-machine-room');

    fireEvent.contextMenu(screen.getByText('Project navigator'));
    await user.click(await screen.findByText('Add Location'));
    expect(callbacks.onAddLocation).toHaveBeenCalled();

    fireEvent.contextMenu(screen.getByRole('button', { name: /Machine Room 3/ }));
    await user.click(await screen.findByText('Add Rack'));
    expect(callbacks.onAddRack).toHaveBeenCalledWith('location-machine-room');

    fireEvent.contextMenu(screen.getByRole('button', { name: /Unassigned Devices 1/ }));
    await user.click(await screen.findByText('Add Unassigned Device'));
    expect(callbacks.onAddDevice).toHaveBeenCalledWith(null);

    const dragged = screen.getByRole('button', { name: /Router 1 RTR1/ });
    fireEvent.dragStart(dragged, { dataTransfer: createDataTransfer() });
    expect(window.__studioWireDraggingDeviceId).toBe('device-router-1');
    fireEvent.dragEnd(dragged);
    expect(window.__studioWireDraggingDeviceId).toBeUndefined();

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
        onAddLocation={callbacks.onAddLocation}
        onAddRack={callbacks.onAddRack}
        onAddTerminalBlock={callbacks.onAddTerminalBlock}
        onSelectObject={callbacks.onSelectObject}
      />,
    );
    expect(screen.getByRole('button', { name: /^Control Room 0$/ })).toBeTruthy();
    expect(screen.queryByText('Machine Room')).toBeNull();
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
