/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { AddDeviceModal } from './AddDeviceModal';

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

function createProject(): ProjectRoot {
  const project = structuredClone(sampleProject);

  project.subLocations = [
    {
      id: 'sub-location-mcr-racks',
      locationId: 'location-machine-room',
      name: 'MCR Racks',
      description: '',
    },
    {
      id: 'sub-location-front-table',
      locationId: 'location-control-room',
      name: 'Front Table',
      description: '',
    },
  ];

  return project;
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
    addSubLocation: vi.fn(),
    updateSubLocation: vi.fn(),
    deleteSubLocation: vi.fn(),
    addRack: vi.fn(),
    updateRack: vi.fn(),
    deleteRack: vi.fn(),
    addDevice: vi.fn(() => 'device-created'),
    addTerminalBlock: vi.fn(),
    connectPorts: vi.fn(),
    disconnectPort: vi.fn(),
    moveMountedDevice: vi.fn(),
    moveNavigatorItemToFolder: vi.fn(),
    unassignDeviceFromRack: vi.fn(),
    updateDevice: vi.fn(),
    editDevice: vi.fn(),
    deleteDevice: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('AddDeviceModal', () => {
  it('shows standardized general fields with inline helpers and mount-height choices', () => {
    const project = createProject();

    contextHarness.current = createContext(project);
    render(
      <AddDeviceModal initialLocationId="location-machine-room" onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    expect(screen.getByRole('combobox', { name: 'Folder' }).textContent).toContain('No folder');
    expect(screen.getByLabelText(/Device Name/)).toBeTruthy();
    expect(screen.getByLabelText(/Device sub-name/)).toBeTruthy();
    expect(screen.getByText('(appear as device header)')).toBeTruthy();
    expect(screen.getByText('(appear as device 2nd line header)')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Mount height (RU)' }).textContent).toContain(
      'No mount height',
    );
    expect(screen.queryByText('This label will appear as device header.')).toBeNull();
    expect(screen.queryByText('This will appear as device 2nd line header.')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'General' })).toBeNull();
    expect(screen.getByLabelText('StudioWire IO')).toBeTruthy();
    expect(screen.queryByLabelText('Label Prefix')).toBeNull();
    expect(screen.queryByLabelText('Role')).toBeNull();
    expect(screen.queryByLabelText('Notes')).toBeNull();
  });

  it('switches to the I/O tab and collapses interface cards', () => {
    const project = createProject();

    contextHarness.current = createContext(project);
    render(
      <AddDeviceModal initialLocationId="location-machine-room" onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'I/O' }));

    expect(screen.getByRole('button', { name: 'Add I/O Interface' })).toBeTruthy();
    expect(screen.getAllByDisplayValue('{NAME}-{000}')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'I/O Interfaces' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Move SDI IN/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Move SDI OUT/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse SDI IN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse SDI OUT' }));

    expect(screen.queryByLabelText('Label Pattern')).toBeNull();
  });
});
