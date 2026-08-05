/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import type { DeviceTemplateRepository } from '../../domain/deviceTemplates/types';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { noopViewCommands } from '../../test/projectContextStubs';
import { ConfirmationProvider } from '../common/ConfirmationDialog';
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

describe('AddDeviceModal', () => {
  it('shows standardized general fields with inline helpers and mount-height choices', () => {
    const project = createProject();

    contextHarness.current = createContext(project);
    renderWithConfirmation(
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

  it('opens the I/O tab with every initial interface collapsed', () => {
    const project = createProject();

    contextHarness.current = createContext(project);
    renderWithConfirmation(
      <AddDeviceModal initialLocationId="location-machine-room" onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'I/O' }));

    expect(screen.getByRole('button', { name: 'Add I/O Interface' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Expand SDI IN' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Expand SDI OUT' })).toBeTruthy();
    expect(screen.queryByLabelText('I/O Name')).toBeNull();
    expect(screen.queryByLabelText('Label Pattern')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Expand SDI IN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expand SDI OUT' }));

    expect(screen.getAllByDisplayValue('{I/O NAME}-{000}')).toHaveLength(2);
    expect(screen.getAllByLabelText('I/O Name')).toHaveLength(2);
    const colorPicker = screen.getAllByLabelText('Color')[0];
    const lastCableNumber = screen.getAllByLabelText('Last Cable Number')[0];
    expect(colorPicker.closest('.port-group-row-secondary')).toBe(
      lastCableNumber.closest('.port-group-row-secondary'),
    );
    expect(screen.queryByRole('heading', { name: 'I/O Interfaces' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Move SDI IN/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Move SDI OUT/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add I/O Interface' }));
    expect(screen.getByRole('button', { name: 'Expand PORTS' })).toBeTruthy();
    expect(screen.getAllByLabelText('I/O Name')).toHaveLength(2);
  }, 10000);

  it('loads a compatible collection template into the form without creating a device', async () => {
    const user = userEvent.setup();
    const project = createProject();
    const repository: DeviceTemplateRepository = {
      list: vi.fn(async () => [
        {
          path: 'collections/devices/Example Systems/Video/XR-32/xr-32.studiowire-device.json',
          value: {
            templateSchemaVersion: '0.1.0',
            templateType: 'device',
            device: {
              name: 'Library Router',
              subName: 'LIB-RTR',
              manufacturer: 'Example Systems',
              model: 'XR-32',
              categoryName: 'Video',
              rackSizeRu: 3,
            },
            ioInterfaces: [
              {
                name: 'SDI OUT',
                direction: 'output',
                categoryName: 'Video',
                connectorName: 'BNC',
                count: 2,
                portLabelPattern: '{I/O NAME}-{000}',
                color: '#123456',
              },
            ],
          },
        },
      ]),
    };

    contextHarness.current = createContext(project);
    renderWithConfirmation(
      <AddDeviceModal
        deviceTemplateRepository={repository}
        initialLocationId="location-machine-room"
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Device Collection' }));
    await user.click(await screen.findByRole('button', { name: 'Load Template' }));

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'General' }).getAttribute('aria-selected')).toBe('true'),
    );
    expect((screen.getByLabelText(/Device Name/) as HTMLInputElement).value).toBe('Library Router');
    expect((screen.getByLabelText(/Device sub-name/) as HTMLInputElement).value).toBe('LIB-RTR');
    expect((screen.getByLabelText('Device model') as HTMLInputElement).value).toBe('XR-32');
    expect(contextHarness.current?.addDevice).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: 'I/O' }));
    expect(screen.getByRole('button', { name: 'Expand SDI OUT' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Expand SDI OUT' }));
    expect((screen.getByLabelText('I/O Name') as HTMLInputElement).value).toBe('SDI OUT');
    expect((screen.getByLabelText('Color') as HTMLInputElement).value).toBe('#123456');
  });
});
