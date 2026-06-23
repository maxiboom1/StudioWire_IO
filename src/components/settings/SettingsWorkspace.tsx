import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  getConnectorGroupsForCategory,
  getConnectorsForCategory,
} from '../../domain/connectorCompatibility';
import type { ConnectorCompatibilityGroup, ConnectorType, ProjectRoot } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { WorkspaceHeader } from '../common/WorkspaceBits';

type SettingsTab = 'project' | 'connectors' | 'categories' | 'groups';

export function SettingsWorkspace() {
  const {
    project,
    updateProjectInfo,
    addCategory,
    updateCategory,
    addCategoryConnectorAssignment,
    removeCategoryConnectorAssignment,
    addConnectorGroup,
    updateConnectorGroup,
    addConnectorGroupMember,
    removeConnectorGroupMember,
    addConnectorType,
    updateConnectorType,
    addCablePrefix,
  } = useProject();
  const firstCategoryId = project.settings.categories[0]?.id ?? '';
  const [activeTab, setActiveTab] = useState<SettingsTab>('connectors');
  const [activeCategoryId, setActiveCategoryId] = useState(firstCategoryId);
  const [activeGroupCategoryId, setActiveGroupCategoryId] = useState(firstCategoryId);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [newCategory, setNewCategory] = useState({
    name: '',
    defaultCablePrefix: project.settings.cablePrefixes[0]?.prefix ?? 'V',
  });
  const [newConnectorName, setNewConnectorName] = useState('');
  const [connectorToAssign, setConnectorToAssign] = useState('');
  const [newConnectorGroupName, setNewConnectorGroupName] = useState('');
  const [connectorToGroup, setConnectorToGroup] = useState('');
  const [newCablePrefix, setNewCablePrefix] = useState({ prefix: '', name: '' });
  const [projectInfo, setProjectInfo] = useState({
    name: project.project.name,
    customer: project.project.customer,
    revision: project.project.revision,
  });
  const selectedCategory = findCategory(project, activeCategoryId) ?? project.settings.categories[0] ?? null;
  const selectedGroupCategory =
    findCategory(project, activeGroupCategoryId) ?? project.settings.categories[0] ?? null;
  const selectedCategoryId = selectedCategory?.id ?? '';
  const selectedGroupCategoryId = selectedGroupCategory?.id ?? '';
  const categoryConnectors = useMemo(
    () => (selectedCategoryId ? getConnectorsForCategory(project.settings, selectedCategoryId) : []),
    [project.settings, selectedCategoryId],
  );
  const unassignedConnectors = useMemo(
    () => getUnassignedConnectors(project, selectedCategoryId),
    [project, selectedCategoryId],
  );
  const groupsForCategory = useMemo(
    () => (selectedGroupCategoryId ? getConnectorGroupsForCategory(project.settings, selectedGroupCategoryId) : []),
    [project.settings, selectedGroupCategoryId],
  );
  const selectedGroup = groupsForCategory.find((group) => group.id === activeGroupId) ?? groupsForCategory[0] ?? null;
  const groupConnectors = selectedGroup ? getGroupConnectors(project, selectedGroup.id) : [];
  const groupConnectorOptions = selectedGroup
    ? getAvailableGroupConnectors(project, selectedGroupCategoryId, selectedGroup.id)
    : [];

  useEffect(() => {
    setProjectInfo({
      name: project.project.name,
      customer: project.project.customer,
      revision: project.project.revision,
    });
  }, [project.project.customer, project.project.name, project.project.revision]);

  useEffect(() => {
    if (!selectedCategory && firstCategoryId) {
      setActiveCategoryId(firstCategoryId);
    }

    if (!selectedGroupCategory && firstCategoryId) {
      setActiveGroupCategoryId(firstCategoryId);
    }
  }, [firstCategoryId, selectedCategory, selectedGroupCategory]);

  useEffect(() => {
    if (selectedGroup && selectedGroup.id !== activeGroupId) {
      setActiveGroupId(selectedGroup.id);
    }

    if (!selectedGroup && activeGroupId) {
      setActiveGroupId('');
    }
  }, [activeGroupId, selectedGroup]);

  function handleProjectInfoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProjectInfo(projectInfo);
  }

  function handleAddCablePrefix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newCablePrefix.prefix.trim() || !newCablePrefix.name.trim()) {
      return;
    }

    addCablePrefix({
      prefix: newCablePrefix.prefix,
      name: newCablePrefix.name.trim(),
    });
    setNewCablePrefix({ prefix: '', name: '' });
  }

  function handleAddConnector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newConnectorName.trim()) {
      return;
    }

    addConnectorType({ name: newConnectorName.trim() });
    setNewConnectorName('');
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newCategory.name.trim()) {
      return;
    }

    const id = addCategory({
      name: newCategory.name.trim(),
      defaultCablePrefix: newCategory.defaultCablePrefix,
    });
    setActiveCategoryId(id);
    setActiveGroupCategoryId(id);
    setNewCategory({
      name: '',
      defaultCablePrefix: project.settings.cablePrefixes[0]?.prefix ?? 'V',
    });
  }

  function handleAssignConnector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const connectorTypeId = connectorToAssign || unassignedConnectors[0]?.id;

    if (!selectedCategoryId || !connectorTypeId) {
      return;
    }

    addCategoryConnectorAssignment({ categoryId: selectedCategoryId, connectorTypeId });
    setConnectorToAssign('');
  }

  function handleAddConnectorGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGroupCategoryId || !newConnectorGroupName.trim()) {
      return;
    }

    const id = addConnectorGroup({
      categoryId: selectedGroupCategoryId,
      name: newConnectorGroupName.trim(),
    });
    setActiveGroupId(id);
    setNewConnectorGroupName('');
  }

  function handleAddConnectorToGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const connectorTypeId = connectorToGroup || groupConnectorOptions[0]?.id;

    if (!selectedGroup || !connectorTypeId) {
      return;
    }

    addConnectorGroupMember({ groupId: selectedGroup.id, connectorTypeId });
    setConnectorToGroup('');
  }

  return (
    <section className="workspace" aria-label="Project settings">
      <WorkspaceHeader eyebrow="Settings" title="Project Settings" badge="v0.2.7" />

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        <SettingsTabButton active={activeTab === 'project'} label="Project" onClick={() => setActiveTab('project')} />
        <SettingsTabButton
          active={activeTab === 'connectors'}
          label="Connectors"
          onClick={() => setActiveTab('connectors')}
        />
        <SettingsTabButton
          active={activeTab === 'categories'}
          label="Categories"
          onClick={() => setActiveTab('categories')}
        />
        <SettingsTabButton
          active={activeTab === 'groups'}
          label="Connector Groups"
          onClick={() => setActiveTab('groups')}
        />
      </div>

      {activeTab === 'project' ? (
        <ProjectSettingsPanel
          newCablePrefix={newCablePrefix}
          project={project}
          projectInfo={projectInfo}
          onAddCablePrefix={handleAddCablePrefix}
          onProjectInfoChange={setProjectInfo}
          onProjectInfoSubmit={handleProjectInfoSubmit}
          onNewCablePrefixChange={setNewCablePrefix}
        />
      ) : null}

      {activeTab === 'connectors' ? (
        <ConnectorsPanel
          connectorTypes={project.settings.connectorTypes}
          newConnectorName={newConnectorName}
          onAddConnector={handleAddConnector}
          onConnectorNameChange={setNewConnectorName}
          onUpdateConnectorType={updateConnectorType}
        />
      ) : null}

      {activeTab === 'categories' ? (
        <CategoriesPanel
          activeCategoryId={selectedCategoryId}
          categoryConnectors={categoryConnectors}
          connectorToAssign={connectorToAssign}
          newCategory={newCategory}
          project={project}
          selectedCategory={selectedCategory}
          unassignedConnectors={unassignedConnectors}
          onActiveCategoryChange={setActiveCategoryId}
          onAddCategory={handleAddCategory}
          onAssignConnector={handleAssignConnector}
          onConnectorToAssignChange={setConnectorToAssign}
          onNewCategoryChange={setNewCategory}
          onRemoveAssignment={removeCategoryConnectorAssignment}
          onUpdateCategory={updateCategory}
        />
      ) : null}

      {activeTab === 'groups' ? (
        <ConnectorGroupsPanel
          activeCategoryId={selectedGroupCategoryId}
          activeGroupId={selectedGroup?.id ?? ''}
          connectorToGroup={connectorToGroup}
          groupConnectorOptions={groupConnectorOptions}
          groupConnectors={groupConnectors}
          groupsForCategory={groupsForCategory}
          newConnectorGroupName={newConnectorGroupName}
          project={project}
          selectedGroup={selectedGroup}
          onActiveCategoryChange={(categoryId) => {
            setActiveGroupCategoryId(categoryId);
            setActiveGroupId('');
          }}
          onActiveGroupChange={setActiveGroupId}
          onAddConnectorGroup={handleAddConnectorGroup}
          onAddConnectorToGroup={handleAddConnectorToGroup}
          onConnectorToGroupChange={setConnectorToGroup}
          onNewConnectorGroupNameChange={setNewConnectorGroupName}
          onRemoveConnectorFromGroup={removeConnectorGroupMember}
          onUpdateConnectorGroup={updateConnectorGroup}
        />
      ) : null}
    </section>
  );
}

function SettingsTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button aria-selected={active} className={active ? 'active' : ''} role="tab" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function ProjectSettingsPanel({
  newCablePrefix,
  project,
  projectInfo,
  onAddCablePrefix,
  onNewCablePrefixChange,
  onProjectInfoChange,
  onProjectInfoSubmit,
}: {
  newCablePrefix: { prefix: string; name: string };
  project: ProjectRoot;
  projectInfo: { name: string; customer: string; revision: string };
  onAddCablePrefix: (event: FormEvent<HTMLFormElement>) => void;
  onNewCablePrefixChange: (value: { prefix: string; name: string }) => void;
  onProjectInfoChange: (value: { name: string; customer: string; revision: string }) => void;
  onProjectInfoSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="settings-tab-panel">
      <section className="settings-section">
        <div className="section-heading">
          <h2>Project</h2>
          <span>{project.schemaVersion}</span>
        </div>
        <form className="editor-form settings-project-form" onSubmit={onProjectInfoSubmit}>
          <label>
            <span>Project name</span>
            <input
              value={projectInfo.name}
              onChange={(event) => onProjectInfoChange({ ...projectInfo, name: event.target.value })}
            />
          </label>
          <label>
            <span>Customer</span>
            <input
              value={projectInfo.customer}
              onChange={(event) => onProjectInfoChange({ ...projectInfo, customer: event.target.value })}
            />
          </label>
          <label>
            <span>Revision</span>
            <input
              value={projectInfo.revision}
              onChange={(event) => onProjectInfoChange({ ...projectInfo, revision: event.target.value })}
            />
          </label>
          <button type="submit">Save Project Settings</button>
        </form>
      </section>

      <section className="settings-section">
        <div className="section-heading">
          <h2>Cable Prefixes</h2>
          <span>{project.settings.cablePrefixes.length}</span>
        </div>
        <div className="prefix-table">
          {project.settings.cablePrefixes.map((prefix) => {
            const ledger = project.numberingLedgers.find((item) => item.prefix === prefix.prefix);

            return (
              <div className="prefix-row" key={prefix.id}>
                <strong>{prefix.prefix}</strong>
                <span>{prefix.name}</span>
                <span>Next suggested: {ledger?.nextSuggested ?? 1}</span>
              </div>
            );
          })}
        </div>
        <form className="inline-form" onSubmit={onAddCablePrefix}>
          <input
            placeholder="Prefix"
            value={newCablePrefix.prefix}
            onChange={(event) =>
              onNewCablePrefixChange({ ...newCablePrefix, prefix: event.target.value.toUpperCase() })
            }
          />
          <input
            placeholder="Name"
            value={newCablePrefix.name}
            onChange={(event) => onNewCablePrefixChange({ ...newCablePrefix, name: event.target.value })}
          />
          <button type="submit">Add Prefix</button>
        </form>
      </section>
    </div>
  );
}

function ConnectorsPanel({
  connectorTypes,
  newConnectorName,
  onAddConnector,
  onConnectorNameChange,
  onUpdateConnectorType,
}: {
  connectorTypes: ConnectorType[];
  newConnectorName: string;
  onAddConnector: (event: FormEvent<HTMLFormElement>) => void;
  onConnectorNameChange: (value: string) => void;
  onUpdateConnectorType: (id: string, updates: Pick<ConnectorType, 'name'>) => void;
}) {
  return (
    <section className="settings-section settings-tab-panel">
      <div className="section-heading">
        <h2>Connector Catalog</h2>
        <span>{connectorTypes.length}</span>
      </div>
      <div className="settings-table">
        <div className="settings-table-row settings-table-head">
          <span>Connector</span>
          <span>Icon</span>
        </div>
        {connectorTypes.map((connectorType) => (
          <div className="settings-table-row" key={connectorType.id}>
            <input
              aria-label={`${connectorType.name} connector name`}
              defaultValue={connectorType.name}
              onBlur={(event) => {
                const name = event.target.value.trim();

                if (name && name !== connectorType.name) {
                  onUpdateConnectorType(connectorType.id, { name });
                }
              }}
            />
            <span className="settings-future-slot">Future icon</span>
          </div>
        ))}
      </div>
      <form className="inline-form" onSubmit={onAddConnector}>
        <input
          placeholder="New connector"
          value={newConnectorName}
          onChange={(event) => onConnectorNameChange(event.target.value)}
        />
        <button type="submit">Add Connector</button>
      </form>
    </section>
  );
}

function CategoriesPanel({
  activeCategoryId,
  categoryConnectors,
  connectorToAssign,
  newCategory,
  project,
  selectedCategory,
  unassignedConnectors,
  onActiveCategoryChange,
  onAddCategory,
  onAssignConnector,
  onConnectorToAssignChange,
  onNewCategoryChange,
  onRemoveAssignment,
  onUpdateCategory,
}: {
  activeCategoryId: string;
  categoryConnectors: ConnectorType[];
  connectorToAssign: string;
  newCategory: { name: string; defaultCablePrefix: string };
  project: ProjectRoot;
  selectedCategory: ProjectRoot['settings']['categories'][number] | null;
  unassignedConnectors: ConnectorType[];
  onActiveCategoryChange: (categoryId: string) => void;
  onAddCategory: (event: FormEvent<HTMLFormElement>) => void;
  onAssignConnector: (event: FormEvent<HTMLFormElement>) => void;
  onConnectorToAssignChange: (connectorTypeId: string) => void;
  onNewCategoryChange: (value: { name: string; defaultCablePrefix: string }) => void;
  onRemoveAssignment: (input: { categoryId: string; connectorTypeId: string }) => void;
  onUpdateCategory: (id: string, updates: { name: string; defaultCablePrefix: string }) => void;
}) {
  return (
    <div className="settings-tab-panel">
      <section className="settings-section">
        <div className="section-heading">
          <h2>Categories</h2>
          <span>{project.settings.categories.length}</span>
        </div>
        <div className="settings-inner-tabs" role="tablist" aria-label="Categories">
          {project.settings.categories.map((category) => (
            <button
              aria-selected={category.id === activeCategoryId}
              className={category.id === activeCategoryId ? 'active' : ''}
              key={category.id}
              role="tab"
              type="button"
              onClick={() => onActiveCategoryChange(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        <form className="inline-form" onSubmit={onAddCategory}>
          <input
            placeholder="New category"
            value={newCategory.name}
            onChange={(event) => onNewCategoryChange({ ...newCategory, name: event.target.value })}
          />
          <select
            value={newCategory.defaultCablePrefix}
            onChange={(event) => onNewCategoryChange({ ...newCategory, defaultCablePrefix: event.target.value })}
          >
            {project.settings.cablePrefixes.map((prefix) => (
              <option key={prefix.id} value={prefix.prefix}>
                {prefix.prefix}
              </option>
            ))}
          </select>
          <button type="submit">Add Category</button>
        </form>
      </section>

      {selectedCategory ? (
        <section className="settings-section">
          <div className="section-heading">
            <h2>{selectedCategory.name}</h2>
            <span>{categoryConnectors.length} connectors</span>
          </div>
          <div className="settings-detail-grid">
            <label>
              <span>Name</span>
              <input
                defaultValue={selectedCategory.name}
                onBlur={(event) => {
                  const name = event.target.value.trim();

                  if (name && name !== selectedCategory.name) {
                    onUpdateCategory(selectedCategory.id, {
                      name,
                      defaultCablePrefix: selectedCategory.defaultCablePrefix,
                    });
                  }
                }}
              />
            </label>
            <label>
              <span>Default prefix</span>
              <select
                value={selectedCategory.defaultCablePrefix}
                onChange={(event) =>
                  onUpdateCategory(selectedCategory.id, {
                    name: selectedCategory.name,
                    defaultCablePrefix: event.target.value,
                  })
                }
              >
                {project.settings.cablePrefixes.map((prefix) => (
                  <option key={prefix.id} value={prefix.prefix}>
                    {prefix.prefix}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Color</span>
              <input readOnly value="Future color" />
            </label>
          </div>
          <div className="settings-token-list">
            {categoryConnectors.length === 0 ? (
              <span className="settings-empty-inline">No connectors assigned.</span>
            ) : (
              categoryConnectors.map((connectorType) => (
                <button
                  key={connectorType.id}
                  type="button"
                  onClick={() =>
                    onRemoveAssignment({
                      categoryId: selectedCategory.id,
                      connectorTypeId: connectorType.id,
                    })
                  }
                >
                  {connectorType.name}
                  <span>Remove</span>
                </button>
              ))
            )}
          </div>
          <form className="inline-form" onSubmit={onAssignConnector}>
            <select
              disabled={unassignedConnectors.length === 0}
              value={connectorToAssign || unassignedConnectors[0]?.id || ''}
              onChange={(event) => onConnectorToAssignChange(event.target.value)}
            >
              {unassignedConnectors.length === 0 ? <option value="">All connectors assigned</option> : null}
              {unassignedConnectors.map((connectorType) => (
                <option key={connectorType.id} value={connectorType.id}>
                  {connectorType.name}
                </option>
              ))}
            </select>
            <button disabled={unassignedConnectors.length === 0} type="submit">
              Assign Connector
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function ConnectorGroupsPanel({
  activeCategoryId,
  activeGroupId,
  connectorToGroup,
  groupConnectorOptions,
  groupConnectors,
  groupsForCategory,
  newConnectorGroupName,
  project,
  selectedGroup,
  onActiveCategoryChange,
  onActiveGroupChange,
  onAddConnectorGroup,
  onAddConnectorToGroup,
  onConnectorToGroupChange,
  onNewConnectorGroupNameChange,
  onRemoveConnectorFromGroup,
  onUpdateConnectorGroup,
}: {
  activeCategoryId: string;
  activeGroupId: string;
  connectorToGroup: string;
  groupConnectorOptions: ConnectorType[];
  groupConnectors: ConnectorType[];
  groupsForCategory: ConnectorCompatibilityGroup[];
  newConnectorGroupName: string;
  project: ProjectRoot;
  selectedGroup: ConnectorCompatibilityGroup | null;
  onActiveCategoryChange: (categoryId: string) => void;
  onActiveGroupChange: (groupId: string) => void;
  onAddConnectorGroup: (event: FormEvent<HTMLFormElement>) => void;
  onAddConnectorToGroup: (event: FormEvent<HTMLFormElement>) => void;
  onConnectorToGroupChange: (connectorTypeId: string) => void;
  onNewConnectorGroupNameChange: (name: string) => void;
  onRemoveConnectorFromGroup: (input: { groupId: string; connectorTypeId: string }) => void;
  onUpdateConnectorGroup: (id: string, updates: { name: string }) => void;
}) {
  return (
    <div className="settings-tab-panel">
      <section className="settings-section">
        <div className="section-heading">
          <h2>Connector Groups</h2>
          <span>{project.settings.connectorCompatibilityGroups.length}</span>
        </div>
        <div className="settings-inner-tabs" role="tablist" aria-label="Connector group categories">
          {project.settings.categories.map((category) => (
            <button
              aria-selected={category.id === activeCategoryId}
              className={category.id === activeCategoryId ? 'active' : ''}
              key={category.id}
              role="tab"
              type="button"
              onClick={() => onActiveCategoryChange(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        <form className="inline-form" onSubmit={onAddConnectorGroup}>
          <input
            placeholder="New connector group"
            value={newConnectorGroupName}
            onChange={(event) => onNewConnectorGroupNameChange(event.target.value)}
          />
          <button type="submit">Add Group</button>
        </form>
      </section>

      <section className="settings-section">
        <div className="settings-inner-tabs" role="tablist" aria-label="Connector groups">
          {groupsForCategory.length === 0 ? <span className="settings-empty-inline">No groups yet.</span> : null}
          {groupsForCategory.map((group) => (
            <button
              aria-selected={group.id === activeGroupId}
              className={group.id === activeGroupId ? 'active' : ''}
              key={group.id}
              role="tab"
              type="button"
              onClick={() => onActiveGroupChange(group.id)}
            >
              {group.name}
            </button>
          ))}
        </div>

        {selectedGroup ? (
          <>
            <div className="settings-detail-grid">
              <label>
                <span>Group name</span>
                <input
                  defaultValue={selectedGroup.name}
                  onBlur={(event) => {
                    const name = event.target.value.trim();

                    if (name && name !== selectedGroup.name) {
                      onUpdateConnectorGroup(selectedGroup.id, { name });
                    }
                  }}
                />
              </label>
            </div>
            <div className="settings-token-list">
              {groupConnectors.length === 0 ? (
                <span className="settings-empty-inline">No connectors in this group.</span>
              ) : (
                groupConnectors.map((connectorType) => (
                  <button
                    key={connectorType.id}
                    type="button"
                    onClick={() =>
                      onRemoveConnectorFromGroup({
                        groupId: selectedGroup.id,
                        connectorTypeId: connectorType.id,
                      })
                    }
                  >
                    {connectorType.name}
                    <span>Remove</span>
                  </button>
                ))
              )}
            </div>
            <form className="inline-form" onSubmit={onAddConnectorToGroup}>
              <select
                disabled={groupConnectorOptions.length === 0}
                value={connectorToGroup || groupConnectorOptions[0]?.id || ''}
                onChange={(event) => onConnectorToGroupChange(event.target.value)}
              >
                {groupConnectorOptions.length === 0 ? <option value="">No available connectors</option> : null}
                {groupConnectorOptions.map((connectorType) => (
                  <option key={connectorType.id} value={connectorType.id}>
                    {connectorType.name}
                  </option>
                ))}
              </select>
              <button disabled={groupConnectorOptions.length === 0} type="submit">
                Add Connector
              </button>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}

function findCategory(project: ProjectRoot, categoryId: string) {
  return project.settings.categories.find((category) => category.id === categoryId) ?? null;
}

function getUnassignedConnectors(project: ProjectRoot, categoryId: string): ConnectorType[] {
  const assigned = new Set(
    project.settings.categoryConnectorAssignments
      .filter((assignment) => assignment.categoryId === categoryId)
      .map((assignment) => assignment.connectorTypeId),
  );

  return project.settings.connectorTypes
    .filter((connectorType) => !assigned.has(connectorType.id))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getGroupConnectors(project: ProjectRoot, groupId: string): ConnectorType[] {
  const connectorTypesById = new Map(project.settings.connectorTypes.map((connectorType) => [connectorType.id, connectorType]));

  return project.settings.connectorCompatibilityGroupMembers
    .filter((member) => member.groupId === groupId)
    .map((member) => connectorTypesById.get(member.connectorTypeId) ?? null)
    .filter((connectorType): connectorType is ConnectorType => connectorType !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getAvailableGroupConnectors(project: ProjectRoot, categoryId: string, groupId: string): ConnectorType[] {
  const members = new Set(
    project.settings.connectorCompatibilityGroupMembers
      .filter((member) => member.groupId === groupId)
      .map((member) => member.connectorTypeId),
  );

  return getConnectorsForCategory(project.settings, categoryId).filter((connectorType) => !members.has(connectorType.id));
}
