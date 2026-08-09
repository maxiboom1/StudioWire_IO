/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import type { EditDeviceInput, ProjectContextValue } from '../../state/projectContextTypes';
import { noopViewCommands } from '../../test/projectContextStubs';
import { ConfirmationProvider } from '../common/ConfirmationDialog';
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

describe('EditDeviceModal', () => {
  it('locks existing interface wiring fields while submitting edits and new interfaces separately', async () => {
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
    const device = project.devices.find((candidate) => candidate.id === 'device-router-1');
    const editDevice = vi.fn();
    const onSaved = vi.fn();

    if (!device) {
      throw new Error('Expected sample router');
    }
    const routerGroup = project.portGroups.find((group) => group.id === 'port-group-router-outputs');

    if (!routerGroup) {
      throw new Error('Expected sample router group');
    }

    routerGroup.colorOverride = '#123456';

    contextHarness.current = createContext(project, editDevice);
    renderWithConfirmation(<EditDeviceModal device={device} onClose={vi.fn()} onSaved={onSaved} />);

    expect(screen.getByRole('combobox', { name: 'Folder' }).textContent).toContain('No folder');
    expect(screen.getByLabelText(/Device Name/)).toBeTruthy();
    expect(screen.getByLabelText(/Device sub-name/)).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Mount height (RU)' }).textContent).toContain('2 RU');
    expect(screen.queryByLabelText('Label Prefix')).toBeNull();
    expect(screen.queryByLabelText('Role')).toBeNull();
    expect(screen.queryByLabelText('Notes')).toBeNull();
    expect(screen.queryByLabelText('Rack Height')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'I/O' }));
    expect(screen.queryByRole('heading', { name: 'I/O Interfaces' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'New I/O Interfaces' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand OUT' })).toBeTruthy();
    expect(screen.queryByLabelText('I/O Name')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand OUT' }));

    const existingCount = screen.getByLabelText('Count') as HTMLInputElement;
    expect(existingCount.value).toBe('4');
    expect(existingCount.readOnly).toBe(true);
    expect(
      (document.querySelector('#port-group-direction-port-group-router-outputs') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByRole('button', { name: /Remove OUT/ })).toBeNull();

    fireEvent.change(
      screen.getByLabelText('I/O Name', { selector: '#port-group-name-port-group-router-outputs' }),
      { target: { value: 'PROGRAM' } },
    );
    fireEvent.change(
      screen.getByLabelText('Cable Label Pattern', {
        selector: '#port-group-pattern-port-group-router-outputs',
      }),
      { target: { value: '{DEVICE}-PROGRAM-{000}' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear override' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add I/O Interface' }));
    expect(screen.getByRole('button', { name: 'Expand PORTS' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expand PORTS' }));
    fireEvent.change(screen.getAllByLabelText('I/O Name').at(-1) as HTMLInputElement, {
      target: { value: 'MGMT' },
    });
    expect(screen.queryByRole('button', { name: /Move MGMT/ })).toBeNull();

    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
    };
    const existingCard = screen.getByText('PROGRAM').closest('.port-group-editor');
    const newCard = screen.getByText('MGMT').closest('.port-group-editor');

    if (!existingCard || !newCard) {
      throw new Error('Expected interface cards');
    }

    const newDragHandle = newCard.querySelector('[data-ui="interface-drag-handle"]');

    if (!(newDragHandle instanceof HTMLElement)) {
      throw new Error('Expected interface drag handle');
    }

    expect((newCard as HTMLElement).draggable).toBe(false);
    expect(newDragHandle.draggable).toBe(true);

    fireEvent.dragStart(newDragHandle, { dataTransfer });
    fireEvent.drop(existingCard, { dataTransfer });
    fireEvent.click(screen.getByRole('button', { name: 'Save Device' }));

    expect(editDevice).toHaveBeenCalledTimes(1);
    const payload = editDevice.mock.calls[0][0] as EditDeviceInput;

    expect(payload.deviceId).toBe('device-router-1');
    expect(payload.deviceUpdates.role).toBe('');
    expect(payload.deviceUpdates.notes).toBe('');
    expect(payload.existingPortGroups).toEqual([
      {
        id: 'port-group-router-outputs',
        name: 'PROGRAM',
        portLabelPattern: '{DEVICE}-PROGRAM-{000}',
        devicePortLabelPattern: null,
        devicePortLabels: null,
        colorOverride: null,
      },
    ]);
    expect(payload.newPortGroups).toHaveLength(1);
    expect(payload.newPortGroups[0]).toMatchObject({
      name: 'MGMT',
      direction: 'bidirectional',
      count: 1,
      createPlannedCables: true,
    });
    expect(payload.portGroupOrder).toEqual([
      { kind: 'new', localId: payload.newPortGroups[0].localId },
      { kind: 'existing', id: 'port-group-router-outputs' },
    ]);
    expect(onSaved).toHaveBeenCalledWith('device-router-1');
  }, 10000);
});
