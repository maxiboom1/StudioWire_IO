/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { StudioWireShell } from './StudioWireShell';

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

function createContext(editDevice = vi.fn()): ProjectContextValue {
  const project = structuredClone(sampleProject);

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
    editDevice,
    deleteDevice: vi.fn(),
    editTerminalBlock: vi.fn(),
    deleteTerminalBlock: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('StudioWireShell dirty device inspector navigation guard', () => {
  it('cancels or discards dirty inspector changes before selection changes', async () => {
    const user = userEvent.setup();
    const editDevice = vi.fn();

    contextHarness.current = createContext(editDevice);
    render(<StudioWireShell />);

    await user.click(screen.getByRole('button', { name: /Router 1 Device RTR1/ }));
    fireEvent.change(screen.getByLabelText('Device Name'), { target: { value: 'Unsaved Router' } });
    await user.click(screen.getByRole('button', { name: /Multiviewer 1 Device MV1/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect((screen.getByLabelText('Device Name') as HTMLInputElement).value).toBe('Unsaved Router');
    expect(editDevice).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Multiviewer 1 Device MV1/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard' }));

    expect(screen.getByRole('button', { name: /Multiviewer 1 Device MV1/ }).getAttribute('data-active')).toBe(
      'true',
    );
    expect(editDevice).not.toHaveBeenCalled();
  }, 10000);

  it('saves dirty inspector changes before guarded view changes', async () => {
    const user = userEvent.setup();
    const editDevice = vi.fn();

    contextHarness.current = createContext(editDevice);
    render(<StudioWireShell />);

    await user.click(screen.getByRole('button', { name: /Router 1 Device RTR1/ }));
    fireEvent.change(screen.getByLabelText('Device Name'), { target: { value: 'Saved Router' } });
    await user.click(screen.getByRole('button', { name: 'Cables' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save' }));

    expect(editDevice).toHaveBeenCalledOnce();
    expect(editDevice.mock.calls[0][0]).toMatchObject({
      deviceId: 'device-router-1',
      deviceUpdates: {
        name: 'Saved Router',
      },
    });
    expect(screen.getByRole('button', { name: 'Cables' }).getAttribute('data-active')).toBe('true');
  }, 10000);
});
