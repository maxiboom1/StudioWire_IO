import { useEffect, useState, type FormEvent } from 'react';
import { useProject } from '../../state/ProjectContext';
import { WorkspaceHeader } from '../common/WorkspaceBits';

export function SettingsWorkspace() {
  const {
    project,
    updateProjectInfo,
    addCategory,
    updateCategory,
    addConnectorGroup,
    updateConnectorGroup,
    addConnectorType,
    updateConnectorType,
    addCablePrefix,
  } = useProject();
  const firstCategoryId = project.settings.categories[0]?.id ?? '';
  const firstGroupId =
    project.settings.connectorCompatibilityGroups.find((group) => group.categoryId === firstCategoryId)?.id ?? '';
  const [projectInfo, setProjectInfo] = useState({
    name: project.project.name,
    customer: project.project.customer,
    revision: project.project.revision,
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    defaultCablePrefix: project.settings.cablePrefixes[0]?.prefix ?? 'V',
  });
  const [newConnectorGroup, setNewConnectorGroup] = useState({
    categoryId: firstCategoryId,
    name: '',
  });
  const [newConnectorType, setNewConnectorType] = useState({
    name: '',
    categoryId: firstCategoryId,
    compatibilityGroupId: firstGroupId,
  });
  const [newCablePrefix, setNewCablePrefix] = useState({ prefix: '', name: '' });

  useEffect(() => {
    setProjectInfo({
      name: project.project.name,
      customer: project.project.customer,
      revision: project.project.revision,
    });
  }, [project.project.customer, project.project.name, project.project.revision]);

  function handleProjectInfoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProjectInfo(projectInfo);
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newCategory.name.trim()) {
      return;
    }

    addCategory({
      name: newCategory.name.trim(),
      defaultCablePrefix: newCategory.defaultCablePrefix,
    });
    setNewCategory({
      name: '',
      defaultCablePrefix: project.settings.cablePrefixes[0]?.prefix ?? 'V',
    });
  }

  function handleAddConnectorGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newConnectorGroup.name.trim() || !newConnectorGroup.categoryId) {
      return;
    }

    addConnectorGroup({
      categoryId: newConnectorGroup.categoryId,
      name: newConnectorGroup.name.trim(),
    });
    setNewConnectorGroup({
      categoryId: newConnectorGroup.categoryId,
      name: '',
    });
  }

  function handleAddConnectorType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newConnectorType.name.trim() || !newConnectorType.categoryId || !newConnectorType.compatibilityGroupId) {
      return;
    }

    addConnectorType({
      name: newConnectorType.name.trim(),
      categoryId: newConnectorType.categoryId,
      compatibilityGroupId: newConnectorType.compatibilityGroupId,
    });
    setNewConnectorType({
      ...newConnectorType,
      name: '',
    });
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

  return (
    <section className="workspace" aria-label="Project settings">
      <WorkspaceHeader eyebrow="Settings" title="Project Settings" badge="v0.2.6" />

      <form className="editor-form settings-project-form" onSubmit={handleProjectInfoSubmit}>
        <label>
          <span>Project name</span>
          <input
            value={projectInfo.name}
            onChange={(event) => setProjectInfo({ ...projectInfo, name: event.target.value })}
          />
        </label>
        <label>
          <span>Customer</span>
          <input
            value={projectInfo.customer}
            onChange={(event) => setProjectInfo({ ...projectInfo, customer: event.target.value })}
          />
        </label>
        <label>
          <span>Revision</span>
          <input
            value={projectInfo.revision}
            onChange={(event) => setProjectInfo({ ...projectInfo, revision: event.target.value })}
          />
        </label>
        <button type="submit">Save Project Settings</button>
      </form>

      <section className="settings-section">
        <div className="section-heading">
          <h2>Categories</h2>
          <span>{project.settings.categories.length}</span>
        </div>
        <div className="editable-list">
          {project.settings.categories.map((category) => (
            <div className="editable-row" key={category.id}>
              <input
                aria-label={`${category.name} category name`}
                defaultValue={category.name}
                onBlur={(event) => {
                  const name = event.target.value.trim();

                  if (name && name !== category.name) {
                    updateCategory(category.id, {
                      name,
                      defaultCablePrefix: category.defaultCablePrefix,
                    });
                  }
                }}
              />
              <select
                aria-label={`${category.name} default cable prefix`}
                value={category.defaultCablePrefix}
                onChange={(event) =>
                  updateCategory(category.id, {
                    name: category.name,
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
            </div>
          ))}
        </div>
        <form className="inline-form" onSubmit={handleAddCategory}>
          <input
            placeholder="New category"
            value={newCategory.name}
            onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
          />
          <select
            value={newCategory.defaultCablePrefix}
            onChange={(event) =>
              setNewCategory({ ...newCategory, defaultCablePrefix: event.target.value })
            }
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

      <section className="settings-section">
        <div className="section-heading">
          <h2>Connector Groups</h2>
          <span>{project.settings.connectorCompatibilityGroups.length}</span>
        </div>
        <div className="editable-list compact">
          {project.settings.connectorCompatibilityGroups.map((group) => {
            const category = project.settings.categories.find((item) => item.id === group.categoryId);

            return (
              <div className="editable-row" key={group.id}>
                <span>{category?.name ?? group.categoryId}</span>
                <input
                  aria-label={`${group.name} connector group name`}
                  defaultValue={group.name}
                  onBlur={(event) => {
                    const name = event.target.value.trim();

                    if (name && name !== group.name) {
                      updateConnectorGroup(group.id, { name });
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
        <form className="inline-form" onSubmit={handleAddConnectorGroup}>
          <select
            value={newConnectorGroup.categoryId}
            onChange={(event) =>
              setNewConnectorGroup({ ...newConnectorGroup, categoryId: event.target.value })
            }
          >
            {project.settings.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            placeholder="New connector group"
            value={newConnectorGroup.name}
            onChange={(event) => setNewConnectorGroup({ ...newConnectorGroup, name: event.target.value })}
          />
          <button type="submit">Add Group</button>
        </form>
      </section>

      <section className="settings-section">
        <div className="section-heading">
          <h2>Connector Types</h2>
          <span>{project.settings.connectorTypes.length}</span>
        </div>
        <div className="editable-list compact">
          {project.settings.connectorTypes.map((connectorType) => {
            const category = project.settings.categories.find((item) => item.id === connectorType.categoryId);
            const groups = project.settings.connectorCompatibilityGroups.filter(
              (group) => group.categoryId === connectorType.categoryId,
            );

            return (
              <div className="editable-row" key={connectorType.id}>
                <span>{category?.name ?? connectorType.categoryId}</span>
                <input
                  aria-label={`${connectorType.name} connector type name`}
                  defaultValue={connectorType.name}
                  onBlur={(event) => {
                    const name = event.target.value.trim();

                    if (name && name !== connectorType.name) {
                      updateConnectorType(connectorType.id, { name });
                    }
                  }}
                />
                <select
                  aria-label={`${connectorType.name} compatibility group`}
                  value={connectorType.compatibilityGroupId}
                  onChange={(event) =>
                    updateConnectorType(connectorType.id, {
                      compatibilityGroupId: event.target.value,
                    })
                  }
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
        <form className="inline-form" onSubmit={handleAddConnectorType}>
          <input
            placeholder="New connector type"
            value={newConnectorType.name}
            onChange={(event) => setNewConnectorType({ ...newConnectorType, name: event.target.value })}
          />
          <select
            value={newConnectorType.categoryId}
            onChange={(event) => {
              const categoryId = event.target.value;
              const compatibilityGroupId =
                project.settings.connectorCompatibilityGroups.find((group) => group.categoryId === categoryId)?.id ??
                '';

              setNewConnectorType({
                ...newConnectorType,
                categoryId,
                compatibilityGroupId,
              });
            }}
          >
            {project.settings.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={newConnectorType.compatibilityGroupId}
            onChange={(event) =>
              setNewConnectorType({ ...newConnectorType, compatibilityGroupId: event.target.value })
            }
          >
            {project.settings.connectorCompatibilityGroups
              .filter((group) => group.categoryId === newConnectorType.categoryId)
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </select>
          <button type="submit">Add Connector</button>
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
        <form className="inline-form" onSubmit={handleAddCablePrefix}>
          <input
            placeholder="Prefix"
            value={newCablePrefix.prefix}
            onChange={(event) =>
              setNewCablePrefix({ ...newCablePrefix, prefix: event.target.value.toUpperCase() })
            }
          />
          <input
            placeholder="Name"
            value={newCablePrefix.name}
            onChange={(event) => setNewCablePrefix({ ...newCablePrefix, name: event.target.value })}
          />
          <button type="submit">Add Prefix</button>
        </form>
      </section>
    </section>
  );
}
