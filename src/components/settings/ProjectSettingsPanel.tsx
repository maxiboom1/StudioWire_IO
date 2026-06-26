import { useEffect, useState, type FormEvent } from 'react';
import type { CablePrefix, NumberingLedger, ProjectInfo, SchemaVersion } from '../../domain/types';
import type { CablePrefixInput, ProjectInfoUpdates } from '../../state/projectContextTypes';
import type { NewCablePrefixFormValue, ProjectInfoFormValue } from './settingsTypes';

export function ProjectSettingsPanel({
  cablePrefixes,
  numberingLedgers,
  project,
  schemaVersion,
  onAddCablePrefix,
  onUpdateProjectInfo,
}: {
  cablePrefixes: CablePrefix[];
  numberingLedgers: NumberingLedger[];
  project: Pick<ProjectInfo, 'name' | 'customer' | 'revision'>;
  schemaVersion: SchemaVersion;
  onAddCablePrefix: (input: CablePrefixInput) => string;
  onUpdateProjectInfo: (updates: ProjectInfoUpdates) => void;
}) {
  const [projectInfo, setProjectInfo] = useState<ProjectInfoFormValue>({
    name: project.name,
    customer: project.customer,
    revision: project.revision,
  });
  const [newCablePrefix, setNewCablePrefix] = useState<NewCablePrefixFormValue>({ prefix: '', name: '' });

  useEffect(() => {
    setProjectInfo({
      name: project.name,
      customer: project.customer,
      revision: project.revision,
    });
  }, [project.customer, project.name, project.revision]);

  function handleProjectInfoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdateProjectInfo(projectInfo);
  }

  function handleAddCablePrefix(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newCablePrefix.prefix.trim() || !newCablePrefix.name.trim()) {
      return;
    }

    onAddCablePrefix({
      prefix: newCablePrefix.prefix,
      name: newCablePrefix.name.trim(),
    });
    setNewCablePrefix({ prefix: '', name: '' });
  }

  return (
    <div className="settings-tab-panel">
      <section className="settings-section">
        <div className="section-heading">
          <h2>Project</h2>
          <span>{schemaVersion}</span>
        </div>
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
      </section>

      <section className="settings-section">
        <div className="section-heading">
          <h2>Cable Prefixes</h2>
          <span>{cablePrefixes.length}</span>
        </div>
        <div className="prefix-table">
          {cablePrefixes.map((prefix) => {
            const ledger = numberingLedgers.find((item) => item.prefix === prefix.prefix);

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
    </div>
  );
}
