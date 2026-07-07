/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { Category, ConnectorCompatibilityGroup, ProjectRoot } from '../../domain/types';
import { STUDIOWIRE_CURRENT_VERSION } from '../../domain/version';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import { SettingsWorkspace } from './SettingsWorkspace';

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

interface CommandMocks {
  updateProjectInfo: ReturnType<typeof vi.fn>;
  addCategory: ReturnType<typeof vi.fn>;
  updateCategory: ReturnType<typeof vi.fn>;
  addCategoryConnectorAssignment: ReturnType<typeof vi.fn>;
  removeCategoryConnectorAssignment: ReturnType<typeof vi.fn>;
  addConnectorGroup: ReturnType<typeof vi.fn>;
  updateConnectorGroup: ReturnType<typeof vi.fn>;
  addConnectorGroupMember: ReturnType<typeof vi.fn>;
  removeConnectorGroupMember: ReturnType<typeof vi.fn>;
  addConnectorType: ReturnType<typeof vi.fn>;
  updateConnectorType: ReturnType<typeof vi.fn>;
  addCablePrefix: ReturnType<typeof vi.fn>;
}

function createCommands(): CommandMocks {
  return {
    updateProjectInfo: vi.fn(),
    addCategory: vi.fn(() => 'category-new'),
    updateCategory: vi.fn(),
    addCategoryConnectorAssignment: vi.fn(() => 'assignment-new'),
    removeCategoryConnectorAssignment: vi.fn(),
    addConnectorGroup: vi.fn(() => 'group-new'),
    updateConnectorGroup: vi.fn(),
    addConnectorGroupMember: vi.fn(() => 'member-new'),
    removeConnectorGroupMember: vi.fn(),
    addConnectorType: vi.fn(() => 'connector-new'),
    updateConnectorType: vi.fn(),
    addCablePrefix: vi.fn(() => 'prefix-new'),
  };
}

function createContext(project: ProjectRoot, commands = createCommands()): ProjectContextValue {
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
    updateProjectInfo: commands.updateProjectInfo,
    addCategory: commands.addCategory,
    updateCategory: commands.updateCategory,
    addCategoryConnectorAssignment: commands.addCategoryConnectorAssignment,
    removeCategoryConnectorAssignment: commands.removeCategoryConnectorAssignment,
    addConnectorGroup: commands.addConnectorGroup,
    updateConnectorGroup: commands.updateConnectorGroup,
    addConnectorGroupMember: commands.addConnectorGroupMember,
    removeConnectorGroupMember: commands.removeConnectorGroupMember,
    addConnectorType: commands.addConnectorType,
    updateConnectorType: commands.updateConnectorType,
    addCablePrefix: commands.addCablePrefix,
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

function projectFixture(): ProjectRoot {
  return structuredClone(sampleProject);
}

function setup(project = projectFixture(), commands = createCommands()) {
  contextHarness.current = createContext(project, commands);
  const view = render(<SettingsWorkspace />);

  return { commands, project, ...view };
}

async function openTab(name: string) {
  await userEvent.click(screen.getByRole('tab', { name }));
}

afterEach(() => {
  cleanup();
  contextHarness.current = null;
  vi.clearAllMocks();
});

describe('SettingsWorkspace tabs and accessibility', () => {
  it('preserves tab order, default tab, roles, classes, active-only rendering, and version badge', () => {
    setup();

    const tabs = screen.getAllByRole('tab', { hidden: false }).slice(0, 4);

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Project',
      'Connectors',
      'Categories',
      'Connector Groups',
    ]);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
    expect(tabs[1].className).toContain('active');
    expect(screen.getByText(`v${STUDIOWIRE_CURRENT_VERSION}`)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Connector Catalog' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Project' })).toBeNull();
  });

  it('keeps click and keyboard tab activation equivalent to button behavior', async () => {
    const user = userEvent.setup();
    setup();

    await user.keyboard('{Tab}{Enter}');
    expect(screen.getByRole('heading', { name: 'Project' })).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Categories' }));
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeTruthy();
  });
});

describe('SettingsWorkspace project settings workflows', () => {
  it('initializes, resynchronizes, submits project fields, and preserves prefix rows', async () => {
    const user = userEvent.setup();
    const { commands, project, rerender } = setup();

    await openTab('Project');
    expect(screen.getByLabelText('Project name')).toHaveProperty('value', 'Demo Studio');
    expect(screen.getByText('Next suggested: 9')).toBeTruthy();

    await user.clear(screen.getByLabelText('Project name'));
    await user.type(screen.getByLabelText('Project name'), 'Renamed Studio');
    await user.clear(screen.getByLabelText('Customer'));
    await user.type(screen.getByLabelText('Customer'), 'Customer A');
    await user.clear(screen.getByLabelText('Revision'));
    await user.type(screen.getByLabelText('Revision'), 'R2');
    await user.click(screen.getByRole('button', { name: 'Save Project Settings' }));
    expect(commands.updateProjectInfo).toHaveBeenCalledWith({
      name: 'Renamed Studio',
      customer: 'Customer A',
      revision: 'R2',
    });

    contextHarness.current = createContext(
      {
        ...project,
        project: { ...project.project, name: 'Imported Studio', customer: 'Imported', revision: 'R3' },
      },
      commands,
    );
    rerender(<SettingsWorkspace />);
    expect(screen.getByLabelText('Project name')).toHaveProperty('value', 'Imported Studio');
    expect(screen.getByLabelText('Customer')).toHaveProperty('value', 'Imported');
    expect(screen.getByLabelText('Revision')).toHaveProperty('value', 'R3');
  });

  it('blocks blank prefixes, uppercases the prefix input, trims names, and resets after add', async () => {
    const user = userEvent.setup();
    const { commands } = setup();

    await openTab('Project');
    await user.click(screen.getByRole('button', { name: 'Add Prefix' }));
    expect(commands.addCablePrefix).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Prefix'), ' x ');
    await user.type(screen.getByPlaceholderText('Name'), ' Production ');
    expect(screen.getByPlaceholderText('Prefix')).toHaveProperty('value', ' X ');
    await user.click(screen.getByRole('button', { name: 'Add Prefix' }));

    expect(commands.addCablePrefix).toHaveBeenCalledWith({ prefix: ' X ', name: 'Production' });
    expect(screen.getByPlaceholderText('Prefix')).toHaveProperty('value', '');
    expect(screen.getByPlaceholderText('Name')).toHaveProperty('value', '');
    expect(screen.getByText('Video')).toBeTruthy();
  });
});

describe('SettingsWorkspace connector workflows', () => {
  it('renders current connectors, adds trimmed connector names, blocks blanks, and shows icon selectors', async () => {
    const user = userEvent.setup();
    const { commands } = setup();

    expect(screen.getByLabelText('BNC connector name')).toBeTruthy();
    expect(screen.getByLabelText('BNC connector icon')).toHaveProperty('value', 'bnc');

    await user.click(screen.getByRole('button', { name: 'Add Connector' }));
    expect(commands.addConnectorType).not.toHaveBeenCalled();
    await user.type(screen.getByPlaceholderText('New connector'), ' Optical ');
    await user.click(screen.getByRole('button', { name: 'Add Connector' }));
    expect(commands.addConnectorType).toHaveBeenCalledWith({ name: 'Optical' });
    expect(screen.getByPlaceholderText('New connector')).toHaveProperty('value', '');
  });

  it('renames current connector types and updates icon keys', async () => {
    const user = userEvent.setup();
    const { commands } = setup();
    const input = screen.getByLabelText('BNC connector name');

    await user.clear(input);
    await user.type(input, ' BNC 75 ');
    fireEvent.blur(input);

    expect(commands.updateConnectorType).toHaveBeenCalledWith('connector-bnc', { name: 'BNC 75' });

    fireEvent.change(screen.getByLabelText('BNC connector icon'), { target: { value: 'xlr' } });
    expect(commands.updateConnectorType).toHaveBeenCalledWith('connector-bnc', { iconKey: 'xlr' });
  });
});

describe('SettingsWorkspace category workflows', () => {
  it('selects the first category, keeps valid selection stable, falls back on project replacement, and renders empty state', async () => {
    const user = userEvent.setup();
    const { commands, project, rerender } = setup();

    await openTab('Categories');
    expect(screen.getByRole('tab', { name: 'Video' }).getAttribute('aria-selected')).toBe('true');
    await user.click(screen.getByRole('tab', { name: 'Audio' }));
    expect(screen.getByRole('tab', { name: 'Audio' }).getAttribute('aria-selected')).toBe('true');

    contextHarness.current = createContext(
      {
        ...project,
        settings: {
          ...project.settings,
          categories: project.settings.categories.filter((category) => category.id !== 'category-audio'),
        },
      },
      commands,
    );
    rerender(<SettingsWorkspace />);
    expect(screen.getByRole('tab', { name: 'Video' }).getAttribute('aria-selected')).toBe('true');

    contextHarness.current = createContext(
      {
        ...project,
        settings: {
          ...project.settings,
          categories: [],
          categoryConnectorAssignments: [],
          connectorCompatibilityGroups: [],
          connectorCompatibilityGroupMembers: [],
        },
      },
      commands,
    );
    rerender(<SettingsWorkspace />);
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeTruthy();
    expect(screen.queryByText('No connectors assigned.')).toBeNull();
  });

  it('adds a category, selects it in both category areas after project update, and resets the form', async () => {
    const user = userEvent.setup();
    const { commands, project, rerender } = setup();

    await openTab('Categories');
    await user.type(screen.getByPlaceholderText('New category'), ' Lighting ');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));
    expect(commands.addCategory).toHaveBeenCalledWith({ name: 'Lighting', defaultCablePrefix: 'V' });
    expect(screen.getByPlaceholderText('New category')).toHaveProperty('value', '');

    const newCategory: Category = {
      id: 'category-new',
      name: 'Lighting',
      defaultCablePrefix: 'V',
      color: '#2563EB',
    };
    contextHarness.current = createContext(
      {
        ...project,
        settings: { ...project.settings, categories: [...project.settings.categories, newCategory] },
      },
      commands,
    );
    rerender(<SettingsWorkspace />);
    expect(screen.getByRole('tab', { name: 'Lighting' }).getAttribute('aria-selected')).toBe('true');

    await openTab('Connector Groups');
    expect(screen.getByRole('tab', { name: 'Lighting' }).getAttribute('aria-selected')).toBe('true');
  });

  it('updates categories, assigns explicit or first fallback connectors, and removes assignments unchanged', async () => {
    const user = userEvent.setup();
    const { commands } = setup();

    await openTab('Categories');
    const categoryNameInput = within(screen.getByLabelText('Name').closest('label') as HTMLElement).getByRole(
      'textbox',
    );
    await user.clear(categoryNameInput);
    await user.type(categoryNameInput, ' Video Updated ');
    fireEvent.blur(categoryNameInput);
    expect(commands.updateCategory).toHaveBeenCalledWith('category-video', {
      name: 'Video Updated',
    });

    fireEvent.change(screen.getByLabelText('Video color picker'), { target: { value: '#123abc' } });
    expect(commands.updateCategory).toHaveBeenCalledWith('category-video', { color: '#123ABC' });

    const assignmentSelect = screen.getAllByRole('combobox').at(-1) as HTMLSelectElement;
    fireEvent.change(assignmentSelect, { target: { value: 'connector-fiber' } });
    await user.click(screen.getByRole('button', { name: 'Assign Connector' }));
    expect(commands.addCategoryConnectorAssignment).toHaveBeenCalledWith({
      categoryId: 'category-video',
      connectorTypeId: 'connector-fiber',
    });

    await user.click(screen.getByRole('button', { name: /^BNC\s*Remove$/ }));
    expect(commands.removeCategoryConnectorAssignment).toHaveBeenCalledWith({
      categoryId: 'category-video',
      connectorTypeId: 'connector-bnc',
    });
  });
});

describe('SettingsWorkspace compatibility group workflows', () => {
  it('synchronizes selected group category/group across changes and empty states', async () => {
    const user = userEvent.setup();
    const { commands, project, rerender } = setup();

    await openTab('Connector Groups');
    expect(screen.getByRole('tab', { name: 'Video' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Video connector group' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    await user.click(screen.getByRole('tab', { name: 'Audio' }));
    expect(screen.getByRole('tab', { name: 'Audio connector group' }).getAttribute('aria-selected')).toBe(
      'true',
    );

    contextHarness.current = createContext(
      {
        ...project,
        settings: {
          ...project.settings,
          connectorCompatibilityGroups: project.settings.connectorCompatibilityGroups.filter(
            (group) => group.categoryId !== 'category-audio',
          ),
          connectorCompatibilityGroupMembers: project.settings.connectorCompatibilityGroupMembers.filter(
            (member) => member.groupId !== 'group-audio-analog',
          ),
        },
      },
      commands,
    );
    rerender(<SettingsWorkspace />);
    expect(screen.getByText('No groups yet.')).toBeTruthy();

    contextHarness.current = createContext(
      {
        ...project,
        settings: {
          ...project.settings,
          categories: [],
          connectorTypes: [],
          categoryConnectorAssignments: [],
          connectorCompatibilityGroups: [],
          connectorCompatibilityGroupMembers: [],
        },
      },
      commands,
    );
    rerender(<SettingsWorkspace />);
    expect(screen.getByRole('heading', { name: 'Connector Groups' })).toBeTruthy();
    expect(screen.getByText('No groups yet.')).toBeTruthy();
  });

  it('adds groups, selects the returned group after project update, resets, renames, manages members, and filters available members', async () => {
    const user = userEvent.setup();
    const { commands, project, rerender } = setup();

    await openTab('Connector Groups');
    await user.type(screen.getByPlaceholderText('New connector group'), ' Monitoring ');
    await user.click(screen.getByRole('button', { name: 'Add Group' }));
    expect(commands.addConnectorGroup).toHaveBeenCalledWith({
      categoryId: 'category-video',
      name: 'Monitoring',
    });
    expect(screen.getByPlaceholderText('New connector group')).toHaveProperty('value', '');

    const newGroup: ConnectorCompatibilityGroup = {
      id: 'group-new',
      categoryId: 'category-video',
      name: 'Monitoring',
    };
    contextHarness.current = createContext(
      {
        ...project,
        settings: {
          ...project.settings,
          connectorCompatibilityGroups: [...project.settings.connectorCompatibilityGroups, newGroup],
        },
      },
      commands,
    );
    rerender(<SettingsWorkspace />);
    expect(screen.getByRole('tab', { name: 'Monitoring' }).getAttribute('aria-selected')).toBe('true');

    const groupNameInput = screen.getByLabelText('Group name');
    await user.clear(groupNameInput);
    await user.type(groupNameInput, ' Production Monitoring ');
    fireEvent.blur(groupNameInput);
    expect(commands.updateConnectorGroup).toHaveBeenCalledWith('group-new', {
      name: 'Production Monitoring',
    });

    expect(screen.getByRole('combobox')).toHaveProperty('value', 'connector-bnc');
    await user.click(screen.getByRole('button', { name: 'Add Connector' }));
    expect(commands.addConnectorGroupMember).toHaveBeenCalledWith({
      groupId: 'group-new',
      connectorTypeId: 'connector-bnc',
    });

    await user.click(screen.getByRole('tab', { name: 'Video connector group' }));
    expect(screen.queryByRole('option', { name: 'BNC' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /^BNC\s*Remove$/ }));
    expect(commands.removeConnectorGroupMember).toHaveBeenCalledWith({
      groupId: 'group-video-sdi-coax',
      connectorTypeId: 'connector-bnc',
    });
  });
});
