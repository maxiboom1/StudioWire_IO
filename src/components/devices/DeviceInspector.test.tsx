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
import { noopViewCommands } from '../../test/projectContextStubs';
import { ConfirmationProvider } from '../common/ConfirmationDialog';
import { DeviceInspector, type InspectorDirtyGuard } from './DeviceInspector';

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

function createContext(
  project: ProjectRoot,
  editDevice = vi.fn(),
  deleteDevice = vi.fn(),
): ProjectContextValue {
  return {
    ...noopViewCommands,
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
    editTerminalBlock: vi.fn(),
    deleteTerminalBlock: vi.fn(),
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
    const guardRef: { current: InspectorDirtyGuard | null } = { current: null };
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
    await user.click(screen.getByRole('button', { name: 'OUT' }));
    await user.clear(
      screen.getByLabelText('I/O Name', { selector: '#inspector-io-name-port-group-router-outputs' }),
    );
    await user.type(
      screen.getByLabelText('I/O Name', { selector: '#inspector-io-name-port-group-router-outputs' }),
      'PROGRAM',
    );
    fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#123456' } });
    await user.clear(screen.getByLabelText('Port 1'));
    await user.type(screen.getByLabelText('Port 1'), '1');

    await user.click(screen.getByRole('button', { name: 'Save Device' }));

    expect(editDevice).toHaveBeenCalledTimes(1);
    const payload = editDevice.mock.calls[0][0] as EditDeviceInput;

    expect(payload.deviceUpdates.name).toBe('Router Updated');
    expect(payload.existingPortGroups).toContainEqual(
      expect.objectContaining({
        id: 'port-group-router-outputs',
        name: 'PROGRAM',
        colorOverride: '#123456',
        devicePortLabels: [
          { portId: 'port-group-router-outputs-port-0001', label: '1' },
          { portId: 'port-group-router-outputs-port-0002', label: 'PROGRAM-002' },
          { portId: 'port-group-router-outputs-port-0003', label: 'PROGRAM-003' },
          { portId: 'port-group-router-outputs-port-0004', label: 'PROGRAM-004' },
        ],
      }),
    );
    expect(payload.newPortGroups).toEqual([]);
  }, 10000);

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
