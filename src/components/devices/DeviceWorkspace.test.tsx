/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { DeviceWorkspace } from './DeviceWorkspace';

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

vi.mock('../connections/CrosspointPicker', () => ({
  CrosspointPicker: ({ ariaLabel, className }: { ariaLabel: string; className: string }) => (
    <button aria-label={ariaLabel} className={className} type="button" />
  ),
}));

function createContext(): ProjectContextValue {
  const project = structuredClone(sampleProject);
  const routerGroup = project.portGroups.find((group) => group.id === 'port-group-router-outputs');

  if (!routerGroup) {
    throw new Error('Expected router outputs');
  }

  routerGroup.colorOverride = '#ABCDEF';

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
  };
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('DeviceWorkspace', () => {
  it('renders port anchors with override color and connector icon hints', () => {
    contextHarness.current = createContext();
    const device = contextHarness.current.project.devices.find(
      (candidate) => candidate.id === 'device-router-1',
    );

    if (!device) {
      throw new Error('Expected router device');
    }

    render(<DeviceWorkspace device={device} />);

    const label = screen.getByText('RTR1-OUT-001').closest('.device-port-label') as HTMLElement;
    const anchor = document.querySelector('.device-port-anchor.connector-icon-bnc') as HTMLElement;

    expect(label.style.getPropertyValue('--device-port-color')).toBe('#ABCDEF');
    expect(anchor).toBeTruthy();
    expect(anchor.style.getPropertyValue('--device-port-color')).toBe('#ABCDEF');
  });

  it('renders device rows in saved I/O interface order', () => {
    contextHarness.current = createContext();
    const project = contextHarness.current.project;
    const routerOutputIndex = project.portGroups.findIndex(
      (group) => group.id === 'port-group-router-outputs',
    );
    const routerOutput = project.portGroups[routerOutputIndex];
    const device = project.devices.find((candidate) => candidate.id === 'device-router-1');

    if (!routerOutput || !device) {
      throw new Error('Expected router device and output group');
    }

    project.portGroups.splice(routerOutputIndex, 0, {
      ...routerOutput,
      id: 'port-group-router-inputs',
      name: 'IN',
      direction: 'input',
      portLabelPattern: '{DEVICE}-IN-{000}',
      firstCableNumber: null,
      lastCableNumber: null,
      numberingRangeId: null,
      createPlannedCables: false,
      colorOverride: '#00AAFF',
    });
    project.ports.push({
      ...project.ports.find((port) => port.portGroupId === 'port-group-router-outputs')!,
      id: 'port-group-router-inputs-port-0001',
      portGroupId: 'port-group-router-inputs',
      label: 'RTR1-IN-001',
      direction: 'input',
      plannedCableId: null,
    });

    render(<DeviceWorkspace device={device} />);

    const rows = Array.from(document.querySelectorAll('.device-body-row')).map((row) => row.textContent);

    expect(rows[0]).toContain('RTR1-IN-001');
    expect(rows[1]).toContain('RTR1-OUT-001');
  });
});
