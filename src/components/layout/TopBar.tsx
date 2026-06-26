import { Settings } from 'lucide-react';
import { useRef } from 'react';
import logoUrl from '../../assets/studiowire-logo.png';
import { ProjectJsonInput } from '../../state/ProjectJsonInput';
import { useProject } from '../../state/ProjectContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export type AppView = 'workspace' | 'cables';

export function TopBar({
  activeView,
  onSelectProject,
  onSelectSettings,
  onViewChange,
}: {
  activeView: AppView;
  onSelectProject: () => void;
  onSelectSettings: () => void;
  onViewChange: (view: AppView) => void;
}) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const {
    project,
    persistenceState,
    createNewProject,
    loadSampleProject,
    exportProjectJson,
    validateProject,
  } = useProject();

  function showWorkspace() {
    onViewChange('workspace');
  }

  function loadSampleAndSelectProject() {
    loadSampleProject();
    onSelectProject();
    showWorkspace();
  }

  function createNewAndSelectProject() {
    createNewProject();
    onSelectProject();
    showWorkspace();
  }

  function openSettings() {
    onSelectSettings();
    showWorkspace();
  }

  return (
    <header className="app-topbar">
      <div className="app-brand">
        <button
          aria-label="Open project workspace"
          className="app-brand-button"
          data-ui="app-brand-button"
          onClick={() => {
            onSelectProject();
            showWorkspace();
          }}
          type="button"
        >
          <span className="app-brand-project">{project.project.name}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Project actions"
              className="app-settings-button"
              data-ui="project-actions-trigger"
              type="button"
            >
              <Settings className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Project actions</DropdownMenuLabel>
            <DropdownMenuItem onSelect={createNewAndSelectProject}>New Project</DropdownMenuItem>
            <DropdownMenuItem onSelect={loadSampleAndSelectProject}>Load Sample</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => importInputRef.current?.click()}>Import JSON</DropdownMenuItem>
            <DropdownMenuItem onSelect={exportProjectJson}>Export JSON</DropdownMenuItem>
            <DropdownMenuItem onSelect={validateProject}>Validate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={openSettings}>Project Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ProjectJsonInput
          className="file-input"
          inputRef={importInputRef}
          onImportComplete={() => {
            onSelectProject();
            showWorkspace();
          }}
        />
      </div>

      <nav className="app-section-tabs" aria-label="Primary workspace sections">
        <button
          className="app-section-tab"
          data-active={activeView === 'workspace'}
          data-ui="app-section-tab"
          onClick={showWorkspace}
          type="button"
        >
          Workspace
        </button>
        <button
          className="app-section-tab"
          data-active={activeView === 'cables'}
          data-ui="app-section-tab"
          onClick={() => onViewChange('cables')}
          type="button"
        >
          Cables
        </button>
      </nav>

      <div className="app-logo-zone">
        <span className="app-persistence-state" data-state={persistenceState ?? 'unsaved'}>
          {persistenceState ?? 'unsaved'}
        </span>
        {persistenceState === 'failed' ? (
          <button className="app-export-now" type="button" onClick={exportProjectJson}>
            Export JSON
          </button>
        ) : null}
        <img alt="StudioWire IO logo" className="app-topbar-logo" src={logoUrl} />
      </div>
    </header>
  );
}
