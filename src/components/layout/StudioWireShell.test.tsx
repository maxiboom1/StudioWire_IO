/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import type { ProjectView } from '../../domain/types';
import { noopViewCommands } from '../../test/projectContextStubs';
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

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  });
});

function createContext(
  editDevice = vi.fn(),
  viewCommands: Partial<Pick<ProjectContextValue, 'addView' | 'updateView' | 'deleteView'>> = {},
): ProjectContextValue {
  const project = structuredClone(sampleProject);

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
    ...viewCommands,
  };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('StudioWireShell dirty device inspector navigation guard', () => {
  it('creates an A3 portrait View with the next default name', async () => {
    const user = userEvent.setup();
    const addView = vi.fn(() => 'view-created');

    contextHarness.current = createContext(vi.fn(), { addView });
    render(<StudioWireShell />);

    await user.click(screen.getByRole('button', { name: 'Add View' }));
    const dialog = await screen.findByRole('dialog');

    expect((within(dialog).getByLabelText('View Name') as HTMLInputElement).value).toBe('View 1');
    expect(within(dialog).getByRole('combobox', { name: 'Page Size' }).textContent).toContain('A3');
    expect(within(dialog).getByRole('combobox', { name: 'Orientation' }).textContent).toContain('Portrait');
    expect(dialog.querySelector('.view-modal-form')).toBeTruthy();
    expect(dialog.querySelector('.standard-modal-footer')).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: 'Add View' }));
    expect(addView).toHaveBeenCalledWith({
      name: 'View 1',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
    });
  });

  it('opens a View workspace and supports rename and guarded View-only deletion', async () => {
    const user = userEvent.setup();
    const updateView = vi.fn();
    const deleteView = vi.fn();
    const view: ProjectView = {
      id: 'view-signal-overview',
      name: 'Signal Overview',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
      placements: [],
      lines: [],
      annotations: [],
    };

    contextHarness.current = createContext(vi.fn(), { updateView, deleteView });
    contextHarness.current.project.views = [view];
    render(<StudioWireShell />);

    await user.click(screen.getByRole('button', { name: /Signal Overview/ }));
    expect(screen.getByRole('region', { name: 'Signal Overview View workspace' })).toBeTruthy();
    expect(screen.getByText('Drag a device or rack from the navigator.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'View Inspector' })).toBeTruthy();
    expect(screen.getByLabelText('View Name')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Page Size' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Orientation' })).toBeTruthy();
    expect(screen.getByLabelText('Notes')).toBeTruthy();
    expect(screen.queryByLabelText('ID')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Page Format' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'View Content' })).toBeNull();

    fireEvent.contextMenu(screen.getByRole('button', { name: /Signal Overview/ }));
    await user.click(await screen.findByText('Rename View'));
    const renameDialog = await screen.findByRole('dialog');
    const nameInput = within(renameDialog).getByLabelText('View Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Core View');
    await user.click(within(renameDialog).getByRole('button', { name: 'Rename View' }));

    expect(updateView).toHaveBeenCalledWith(view.id, { name: 'Core View' });

    await user.click(screen.getByRole('button', { name: 'Delete View' }));
    const deleteDialog = await screen.findByRole('dialog');
    expect(deleteDialog.textContent).toContain('0 placement(s), 0 line(s), and 0 annotation(s)');
    expect(deleteDialog.textContent).toContain('Source devices and racks are not affected.');
    await user.click(within(deleteDialog).getByRole('button', { name: 'Delete View' }));
    expect(deleteView).toHaveBeenCalledWith(view.id);
  }, 10000);

  it('confirms populated page-format changes and preserves View canvas collections', async () => {
    const user = userEvent.setup();
    const updateView = vi.fn();
    const view: ProjectView = {
      id: 'view-populated',
      name: 'Populated View',
      description: 'Existing layout',
      pageSize: 'a3',
      orientation: 'portrait',
      placements: [
        {
          id: 'placement-router',
          sourceType: 'device',
          sourceId: 'device-router-1',
          xMm: 170,
          yMm: 20,
          scale: 1,
          labelOverride: null,
        },
      ],
      lines: [],
      annotations: [],
    };

    contextHarness.current = createContext(vi.fn(), { updateView });
    contextHarness.current.project.views = [view];
    render(<StudioWireShell />);

    await user.click(screen.getByRole('button', { name: /Populated View/ }));
    await user.click(screen.getByRole('combobox', { name: 'Page Size' }));
    await user.click(await screen.findByRole('option', { name: 'A4' }));
    await user.click(screen.getByRole('button', { name: 'Save View' }));

    const confirmation = await screen.findByRole('dialog');
    expect(confirmation.textContent).toContain('1 placement(s), 0 line(s), and 0 annotation(s)');
    expect(confirmation.textContent).toContain('Existing coordinates, scales, waypoints, and line-label positions');
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(updateView).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save View' }));
    const retainedLayoutConfirmation = await screen.findByRole('dialog');
    await user.click(within(retainedLayoutConfirmation).getByRole('button', { name: 'Keep layout' }));

    expect(updateView).toHaveBeenCalledWith(view.id, {
      name: 'Populated View',
      description: 'Existing layout',
      pageSize: 'a4',
      orientation: 'portrait',
    });
    expect(updateView.mock.calls[0][1]).not.toHaveProperty('placements');
    expect(updateView.mock.calls[0][1]).not.toHaveProperty('lines');
    expect(updateView.mock.calls[0][1]).not.toHaveProperty('annotations');
  }, 10000);

  it('opens Clone and Edit as a prefilled Add Device draft with fresh cable allocation', async () => {
    const user = userEvent.setup();

    contextHarness.current = createContext();
    render(<StudioWireShell />);

    fireEvent.contextMenu(screen.getByRole('button', { name: /Router 1 Device RTR1/ }));
    await user.click(await screen.findByText('Clone and Edit'));

    expect(await screen.findByRole('heading', { name: 'Add Device' })).toBeTruthy();
    expect(screen.getByText(/Review the cloned details from Router 1/)).toBeTruthy();
    expect((screen.getByLabelText(/Device Name/) as HTMLInputElement).value).toBe('Router 1');
    expect((screen.getByLabelText(/Device sub-name/) as HTMLInputElement).value).toBe('RTR1');
    expect((screen.getByLabelText('Device model') as HTMLInputElement).value).toBe('XR-16');

    await user.click(screen.getByRole('tab', { name: 'I/O' }));
    await user.click(screen.getByRole('button', { name: 'Expand OUT' }));
    expect((screen.getByLabelText('I/O Name') as HTMLInputElement).value).toBe('OUT');
    expect((screen.getByLabelText('First Cable Number') as HTMLInputElement).value).toBe('9');
    expect(contextHarness.current?.addDevice).not.toHaveBeenCalled();
  });

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
