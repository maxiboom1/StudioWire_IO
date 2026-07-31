/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { ConfirmationProvider } from '../common/ConfirmationDialog';
import { RackInspector } from './RackInspector';

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

function createContext(unassignDeviceFromRack = vi.fn()): ProjectContextValue {
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
    unassignDeviceFromRack,
    updateDevice: vi.fn(),
    editDevice: vi.fn(),
    deleteDevice: vi.fn(),
    editTerminalBlock: vi.fn(),
    deleteTerminalBlock: vi.fn(),
  };
}

function renderWithConfirmation(ui: ReactElement) {
  return render(<ConfirmationProvider>{ui}</ConfirmationProvider>);
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('RackInspector', () => {
  it('unassigns a standard assigned device from the rack list', async () => {
    const unassignDeviceFromRack = vi.fn();
    const project = structuredClone(sampleProject);

    contextHarness.current = createContext(unassignDeviceFromRack);
    renderWithConfirmation(<RackInspector rack={project.racks[0]} />);

    expect(screen.queryByText(/RU /)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Assigned Items' }));
    await userEvent.click(screen.getByRole('button', { name: 'Unassign Router 1 from rack' }));
    await userEvent.click(screen.getByRole('button', { name: 'Unassign' }));

    expect(unassignDeviceFromRack).toHaveBeenCalledWith('device-router-1');
  });
});
