import { useEffect, useState, type FormEvent } from 'react';
import { useProject } from '../../state/ProjectContext';
import { WorkspaceHeader } from '../common/WorkspaceBits';

export function SettingsWorkspace() {
  const {
    project,
    updateProjectInfo,
    addCategory,
    updateCategory,
    addConnectorType,
    updateConnectorType,
    addCablePrefix,
  } = useProject();
  const [projectInfo, setProjectInfo] = useState({
    name: project.project.name,
    customer: project.project.customer,
    revision: project.project.revision,
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    defaultCablePrefix: project.settings.cablePrefixes[0]?.prefix ?? 'V',
  });
  const [newConnectorType, setNewConnectorType] = useState('');
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

  function handleAddConnectorType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newConnectorType.trim()) {
      return;
    }

    addConnectorType({ name: newConnectorType.trim() });
    setNewConnectorType('');
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
      <WorkspaceHeader eyebrow="Settings" title="Project Settings" badge="v0.1" />

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
          <h2>Connector Types</h2>
          <span>{project.settings.connectorTypes.length}</span>
        </div>
        <div className="editable-list compact">
          {project.settings.connectorTypes.map((connectorType) => (
            <div className="editable-row" key={connectorType.id}>
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
            </div>
          ))}
        </div>
        <form className="inline-form" onSubmit={handleAddConnectorType}>
          <input
            placeholder="New connector type"
            value={newConnectorType}
            onChange={(event) => setNewConnectorType(event.target.value)}
          />
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
