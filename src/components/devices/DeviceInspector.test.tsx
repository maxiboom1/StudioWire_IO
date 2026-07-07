/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import type { EditDeviceInput } from '../../state/projectTypes';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { ConfirmationProvider } from '../common/ConfirmationDialog';
import { DeviceInspector, type DeviceInspectorDirtyGuard } from './DeviceInspector';

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

function createContext(project: ProjectRoot, editDevice = vi.fn(), deleteDevice = vi.fn()): ProjectContextValue {
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
    deleteDevice,
  };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('DeviceInspector', () => {
  it('buffers metadata and I/O edits until global save', async () => {
    const user = userEvent.setup();
    const project = structuredClone(sampleProject);
    const editDevice = vi.fn();
    const guardRef: { current: DeviceInspectorDirtyGuard | null } = { current: null };
    const device = project.devices.find((candidate) => candidate.id === 'device-router-1');

    if (!device) {
      throw new Error('Expected router device');
    }

    contextHarness.current = createContext(project, editDevice);
    render(
      <ConfirmationProvider>
        <DeviceInspector device={device} onDirtyGuardChange={(nextGuard) => (guardRef.current = nextGuard)} />
      </ConfirmationProvider>,
    );

    expect(screen.getByRole('button', { name: 'Edit Device' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Device Details' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'I/O' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Folder')).toBeNull();
    expect(screen.queryByText('Danger Zone')).toBeNull();
    expect((screen.getByRole('button', { name: 'Save Device' }) as HTMLButtonElement).disabled).toBe(true);

    await user.clear(screen.getByLabelText('Device Name'));
    await user.type(screen.getByLabelText('Device Name'), 'Router Updated');
    expect(editDevice).not.toHaveBeenCalled();
    expect(guardRef.current?.isDirty).toBe(true);

    await user.click(screen.getByRole('button', { name: 'I/O' }));
    await user.clear(screen.getByLabelText('Name', { selector: '#inspector-io-name-port-group-router-outputs' }));
    await user.type(
      screen.getByLabelText('Name', { selector: '#inspector-io-name-port-group-router-outputs' }),
      'PROGRAM',
    );
    fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#123456' } });

    await user.click(screen.getByRole('button', { name: 'Save Device' }));

    expect(editDevice).toHaveBeenCalledTimes(1);
    const payload = editDevice.mock.calls[0][0] as EditDeviceInput;

    expect(payload.deviceUpdates.name).toBe('Router Updated');
    expect(payload.existingPortGroups).toContainEqual(
      expect.objectContaining({
        id: 'port-group-router-outputs',
        name: 'PROGRAM',
        colorOverride: '#123456',
      }),
    );
    expect(payload.newPortGroups).toEqual([]);
  });

  it('confirms device deletion from the global inspector action area', async () => {
    const user = userEvent.setup();
    const project = structuredClone(sampleProject);
    const deleteDevice = vi.fn();
    const device = project.devices.find((candidate) => candidate.id === 'device-router-1');

    if (!device) {
      throw new Error('Expected router device');
    }

    contextHarness.current = createContext(project, vi.fn(), deleteDevice);
    render(
      <ConfirmationProvider>
        <DeviceInspector device={device} />
      </ConfirmationProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Delete Device' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete Device' }));

    expect(deleteDevice).toHaveBeenCalledWith('device-router-1');
  });
});
