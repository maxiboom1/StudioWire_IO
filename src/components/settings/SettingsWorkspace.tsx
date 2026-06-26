import { useMemo, useState } from 'react';
import { STUDIOWIRE_CURRENT_VERSION } from '../../domain/version';
import { useProject } from '../../state/ProjectContext';
import { WorkspaceHeader } from '../common/WorkspaceBits';
import { CategoriesPanel } from './CategoriesPanel';
import { ConnectorGroupsPanel } from './ConnectorGroupsPanel';
import { ConnectorsPanel } from './ConnectorsPanel';
import { ProjectSettingsPanel } from './ProjectSettingsPanel';
import { SettingsTabs } from './SettingsTabs';
import { resolveSelectedCategoryId, resolveSelectedGroupId } from './settingsSelection';
import {
  findCategory,
  getAvailableGroupConnectors,
  getCategoryConnectors,
  getGroupConnectors,
  getGroupsForCategory,
  getUnassignedConnectors,
} from './settingsSelectors';
import type { SettingsTab } from './settingsTypes';

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
  const [activeTab, setActiveTab] = useState<SettingsTab>('connectors');
  const [activeCategoryId, setActiveCategoryId] = useState(project.settings.categories[0]?.id ?? '');
  const [activeGroupCategoryId, setActiveGroupCategoryId] = useState(
    project.settings.categories[0]?.id ?? '',
  );
  const [activeGroupId, setActiveGroupId] = useState('');

  const selectedCategoryId = resolveSelectedCategoryId(project.settings.categories, activeCategoryId);
  const selectedGroupCategoryId = resolveSelectedCategoryId(
    project.settings.categories,
    activeGroupCategoryId,
  );
  const selectedCategory = findCategory(project, selectedCategoryId);
  const selectedGroupCategory = findCategory(project, selectedGroupCategoryId);
  const categoryConnectors = useMemo(
    () => getCategoryConnectors(project, selectedCategoryId),
    [project, selectedCategoryId],
  );
  const unassignedConnectors = useMemo(
    () => getUnassignedConnectors(project, selectedCategoryId),
    [project, selectedCategoryId],
  );
  const groupsForCategory = useMemo(
    () => getGroupsForCategory(project, selectedGroupCategoryId),
    [project, selectedGroupCategoryId],
  );
  const selectedGroupId = resolveSelectedGroupId(groupsForCategory, activeGroupId);
  const selectedGroup = groupsForCategory.find((group) => group.id === selectedGroupId) ?? null;
  const groupConnectors = useMemo(
    () => (selectedGroupId ? getGroupConnectors(project, selectedGroupId) : []),
    [project, selectedGroupId],
  );
  const groupConnectorOptions = useMemo(
    () =>
      selectedGroup ? getAvailableGroupConnectors(project, selectedGroupCategoryId, selectedGroup.id) : [],
    [project, selectedGroup, selectedGroupCategoryId],
  );

  return (
    <section className="workspace" aria-label="Project settings">
      <WorkspaceHeader eyebrow="Settings" title="Project Settings" badge={`v${STUDIOWIRE_CURRENT_VERSION}`} />
      <SettingsTabs activeTab={activeTab} onActiveTabChange={setActiveTab} />

      {activeTab === 'project' ? (
        <ProjectSettingsPanel
          cablePrefixes={project.settings.cablePrefixes}
          numberingLedgers={project.numberingLedgers}
          project={project.project}
          schemaVersion={project.schemaVersion}
          onAddCablePrefix={addCablePrefix}
          onUpdateProjectInfo={updateProjectInfo}
        />
      ) : null}

      {activeTab === 'connectors' ? (
        <ConnectorsPanel
          connectorTypes={project.settings.connectorTypes}
          onAddConnectorType={addConnectorType}
          onUpdateConnectorType={updateConnectorType}
        />
      ) : null}

      {activeTab === 'categories' ? (
        <CategoriesPanel
          activeCategoryId={selectedCategoryId}
          cablePrefixes={project.settings.cablePrefixes}
          categories={project.settings.categories}
          categoryConnectors={categoryConnectors}
          selectedCategory={selectedCategory}
          unassignedConnectors={unassignedConnectors}
          onActiveCategoryChange={setActiveCategoryId}
          onAddCategory={(input) => {
            const id = addCategory(input);
            setActiveCategoryId(id);
            setActiveGroupCategoryId(id);
            return id;
          }}
          onAssignConnector={addCategoryConnectorAssignment}
          onRemoveAssignment={removeCategoryConnectorAssignment}
          onUpdateCategory={updateCategory}
        />
      ) : null}

      {activeTab === 'groups' ? (
        <ConnectorGroupsPanel
          activeCategoryId={selectedGroupCategory?.id ?? ''}
          activeGroupId={selectedGroupId}
          categories={project.settings.categories}
          groupConnectorOptions={groupConnectorOptions}
          groupConnectors={groupConnectors}
          groupsForCategory={groupsForCategory}
          selectedGroup={selectedGroup}
          totalGroupCount={project.settings.connectorCompatibilityGroups.length}
          onActiveCategoryChange={(categoryId) => {
            setActiveGroupCategoryId(categoryId);
            setActiveGroupId('');
          }}
          onActiveGroupChange={setActiveGroupId}
          onAddConnectorGroup={(input) => {
            const id = addConnectorGroup(input);
            setActiveGroupId(id);
            return id;
          }}
          onAddConnectorToGroup={addConnectorGroupMember}
          onRemoveConnectorFromGroup={removeConnectorGroupMember}
          onUpdateConnectorGroup={updateConnectorGroup}
        />
      ) : null}
    </section>
  );
}
