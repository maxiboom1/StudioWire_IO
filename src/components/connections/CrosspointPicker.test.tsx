/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectPorts } from '../../domain/connections';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { CrosspointPicker } from './CrosspointPicker';

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

function projectFixture(): ProjectRoot {
  return structuredClone(sampleProject);
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

describe('CrosspointPicker command payloads', () => {
  it('filters visible candidates and dispatches the selected target port payload', async () => {
    const user = userEvent.setup();
    const project = projectFixture();
    const originPort = project.ports.find((port) => port.label === 'RTR1-OUT-001')!;
    const targetPort = project.ports.find((port) => port.label === 'MV1-IN-001')!;
    const connectPortsCommand = vi.fn();

    contextHarness.current = createContext(project, { connectPorts: connectPortsCommand });
    render(
      <CrosspointPicker ariaLabel="Connect router output" className="test-trigger" portId={originPort.id} />,
    );

    await user.click(screen.getByLabelText('Connect router output'));
    await user.type(screen.getByLabelText('Search ports'), 'MV1-IN-001');
    await user.click(await screen.findByText('MV1-IN-001'));

    expect(connectPortsCommand).toHaveBeenCalledWith({
      fromPortId: originPort.id,
      toPortId: targetPort.id,
    });
  });

  it('dispatches the clear-connection payload for a connected origin port', async () => {
    const user = userEvent.setup();
    const project = projectFixture();
    const originPort = project.ports.find((port) => port.label === 'RTR1-OUT-001')!;
    const targetPort = project.ports.find((port) => port.label === 'MV1-IN-001')!;
    const connected = connectPorts(project, { fromPortId: originPort.id, toPortId: targetPort.id });
    const disconnectPort = vi.fn();

    if (!connected.ok) {
      throw new Error(connected.error);
    }

    contextHarness.current = createContext(connected.project, { disconnectPort });
    render(
      <CrosspointPicker ariaLabel="Connect router output" className="test-trigger" portId={originPort.id} />,
    );

    await user.click(screen.getByLabelText('Connect router output'));
    await user.click(await screen.findByText('Clear connection'));

    expect(disconnectPort).toHaveBeenCalledWith({ portId: originPort.id });
  });
});
