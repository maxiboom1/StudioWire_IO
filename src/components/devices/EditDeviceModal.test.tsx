/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import type { EditDeviceInput, ProjectContextValue } from '../../state/projectContextTypes';
import { EditDeviceModal } from './EditDeviceModal';

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

function createContext(project: ProjectRoot, editDevice = vi.fn()): ProjectContextValue {
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
    editDevice,
    deleteDevice: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('EditDeviceModal', () => {
  it('locks existing interface wiring fields while submitting edits and new interfaces separately', async () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find((candidate) => candidate.id === 'device-router-1');
    const editDevice = vi.fn();
    const onSaved = vi.fn();

    if (!device) {
      throw new Error('Expected sample router');
    }

    contextHarness.current = createContext(project, editDevice);
    render(<EditDeviceModal device={device} onClose={vi.fn()} onSaved={onSaved} />);

    const existingCount = screen.getByLabelText('Count') as HTMLInputElement;
    expect(existingCount.value).toBe('4');
    expect(existingCount.readOnly).toBe(true);
    expect(
      (document.querySelector('#port-group-direction-port-group-router-outputs') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByRole('button', { name: /Remove OUT/ })).toBeNull();

    fireEvent.change(
      screen.getByLabelText('Name', { selector: '#port-group-name-port-group-router-outputs' }),
      { target: { value: 'PROGRAM' } },
    );
    fireEvent.change(
      screen.getByLabelText('Label Pattern', {
        selector: '#port-group-pattern-port-group-router-outputs',
      }),
      { target: { value: '{DEVICE}-PROGRAM-{000}' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Port Group' }));
    fireEvent.change(screen.getAllByLabelText('Name').at(-1) as HTMLInputElement, {
      target: { value: 'MGMT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Device' }));

    expect(editDevice).toHaveBeenCalledTimes(1);
    const payload = editDevice.mock.calls[0][0] as EditDeviceInput;

    expect(payload.deviceId).toBe('device-router-1');
    expect(payload.existingPortGroups).toEqual([
      {
        id: 'port-group-router-outputs',
        name: 'PROGRAM',
        portLabelPattern: '{DEVICE}-PROGRAM-{000}',
      },
    ]);
    expect(payload.newPortGroups).toHaveLength(1);
    expect(payload.newPortGroups[0]).toMatchObject({
      name: 'MGMT',
      direction: 'bidirectional',
      count: 1,
      createPlannedCables: true,
    });
    expect(onSaved).toHaveBeenCalledWith('device-router-1');
  });
});
