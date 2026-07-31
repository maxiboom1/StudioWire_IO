/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { LocationWorkspace } from './LocationWorkspace';

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
      id: 'sub-location-front-table',
      locationId: 'location-control-room',
      name: 'Front Table',
      description: 'Operators',
    },
  ];

  return project;
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
  };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('LocationWorkspace', () => {
  it('wires folder add, edit, and delete controls', async () => {
    const user = userEvent.setup();
    const project = createProject();
    const location = project.locations.find((candidate) => candidate.id === 'location-control-room');
    const addSubLocation = vi.fn();
    const updateSubLocation = vi.fn();
    const deleteSubLocation = vi.fn();

    if (!location) {
      throw new Error('Expected control room location');
    }

    contextHarness.current = createContext(project, {
      addSubLocation,
      updateSubLocation,
      deleteSubLocation,
    });
    render(<LocationWorkspace location={location} onAddDevice={vi.fn()} onAddTerminalBlock={vi.fn()} />);

    await user.type(screen.getByLabelText('Name', { selector: '#sub-location-name' }), 'Back Table');
    await user.type(
      screen.getByLabelText('Description', { selector: '#sub-location-description' }),
      'Producer',
    );
    await user.click(screen.getByRole('button', { name: 'Add Folder' }));
    expect(addSubLocation).toHaveBeenCalledWith({
      locationId: 'location-control-room',
      name: 'Back Table',
      description: 'Producer',
    });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Folder name'));
    await user.type(screen.getByLabelText('Folder name'), 'Front Desk');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(updateSubLocation).toHaveBeenCalledWith('sub-location-front-table', {
      name: 'Front Desk',
      description: 'Operators',
    });

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteSubLocation).toHaveBeenCalledWith('sub-location-front-table');
  }, 10000);
});
