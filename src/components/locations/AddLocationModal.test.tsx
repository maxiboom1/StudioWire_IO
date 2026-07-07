/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { AddLocationModal } from './AddLocationModal';

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

function createContext(addLocation = vi.fn(() => 'location-created')): ProjectContextValue {
  return {
    project: structuredClone(sampleProject),
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
    addLocation,
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
  };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('AddLocationModal', () => {
  it('uses the standard modal footer and submits trimmed location fields', async () => {
    const user = userEvent.setup();
    const addLocation = vi.fn(() => 'location-created');
    const onCreated = vi.fn();

    contextHarness.current = createContext(addLocation);
    render(<AddLocationModal onClose={vi.fn()} onCreated={onCreated} />);

    expect(screen.getByLabelText('StudioWire IO')).toBeTruthy();

    await user.type(screen.getByLabelText('Name'), '  Control B  ');
    await user.type(screen.getByLabelText('Type'), '  Control room  ');
    await user.type(screen.getByLabelText('Description'), '  Backup control position  ');
    await user.click(screen.getByRole('button', { name: 'Add Location' }));

    expect(addLocation).toHaveBeenCalledWith({
      name: 'Control B',
      type: 'Control room',
      description: 'Backup control position',
    });
    expect(onCreated).toHaveBeenCalledWith('location-created');
  }, 10000);
});
