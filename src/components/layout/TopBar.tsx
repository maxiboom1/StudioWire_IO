import { ProjectJsonInput, useProject } from '../../state/ProjectContext';

export function TopBar({
  onProjectLoaded,
  onOpenSettings,
}: {
  onProjectLoaded: () => void;
  onOpenSettings: () => void;
}) {
  const {
    project,
    statusMessage,
    createNewProject,
    loadSampleProject,
    exportProjectJson,
    validateProject,
  } = useProject();

  function handleNewProject() {
    createNewProject();
    onProjectLoaded();
  }

  function handleLoadSample() {
    loadSampleProject();
    onProjectLoaded();
  }

  return (
    <header className="top-bar">
      <button className="brand-block" type="button" onClick={onProjectLoaded} aria-label="Select project">
        <div className="brand-mark">SW</div>
        <div>
          <p className="brand-name">StudioWire IO</p>
          <p className="project-name">{project.project.name}</p>
        </div>
      </button>

      <div className="top-actions" aria-label="Project actions">
        <button type="button" onClick={handleNewProject}>
          New Project
        </button>
        <button type="button" onClick={handleLoadSample}>
          Load Sample
        </button>
        <label className="file-action" htmlFor="project-json-input">
          Import JSON
        </label>
        <ProjectJsonInput className="file-input" id="project-json-input" onImportComplete={onProjectLoaded} />
        <button type="button" onClick={exportProjectJson}>
          Export JSON
        </button>
        <button type="button" onClick={validateProject}>
          Validate
        </button>
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
      </div>

      <p className="status-line" aria-live="polite">
        {statusMessage}
      </p>
    </header>
  );
}
