import { useEffect, type ReactNode } from 'react';
import { ProjectJsonInput, useProject } from '../../state/ProjectContext';

export function AppActionsModal({
  onClose,
  onProjectLoaded,
  onOpenSettings,
}: {
  onClose: () => void;
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function closeAfter(action: () => void) {
    action();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-start justify-items-end bg-slate-950/20 px-5 py-16 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label="Settings and project actions"
        aria-modal="true"
        className="w-full max-w-[420px] overflow-hidden rounded-lg border border-studio-border bg-studio-panel shadow-2xl shadow-slate-900/18"
        role="dialog"
      >
        <div className="border-b border-studio-border px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-studio-muted">
                Settings
              </p>
              <h2 className="m-0 mt-1 text-lg font-semibold text-studio-text">App menu</h2>
            </div>
            <button
              aria-label="Close settings menu"
              className="h-8 rounded-md border-studio-border px-3 text-xs font-semibold"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
          <p className="m-0 mt-2 truncate text-sm text-studio-muted">{project.project.name}</p>
          <p className="m-0 mt-1 truncate text-xs text-studio-muted" aria-live="polite">
            {statusMessage}
          </p>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <ActionGroup title="Project">
            <ActionButton
              description="Start from a blank local project."
              label="New Project"
              onClick={() =>
                closeAfter(() => {
                  createNewProject();
                  onProjectLoaded();
                })
              }
            />
            <ActionButton
              description="Replace the current workspace with the included sample."
              label="Load Sample"
              onClick={() =>
                closeAfter(() => {
                  loadSampleProject();
                  onProjectLoaded();
                })
              }
            />
            <ActionButton
              description="Open project settings in the workspace."
              label="Settings"
              onClick={() =>
                closeAfter(() => {
                  onOpenSettings();
                })
              }
            />
          </ActionGroup>

          <ActionGroup title="Data">
            <label className="block cursor-pointer rounded-md border border-studio-border bg-white px-3 py-2.5 transition hover:border-studio-accent hover:bg-orange-50/40">
              <span className="block text-sm font-semibold text-studio-text">Import JSON</span>
              <span className="mt-1 block text-xs leading-5 text-studio-muted">
                Load a StudioWire project file from disk.
              </span>
              <ProjectJsonInput
                className="file-input"
                onImportComplete={() => {
                  onProjectLoaded();
                  onClose();
                }}
              />
            </label>
            <ActionButton
              description="Download the current project as JSON."
              label="Export JSON"
              onClick={() => closeAfter(exportProjectJson)}
            />
          </ActionGroup>

          <ActionGroup title="Validation">
            <ActionButton
              description="Run current v0.1 project validation rules."
              label="Validate"
              onClick={() => closeAfter(validateProject)}
            />
          </ActionGroup>
        </div>
      </section>
    </div>
  );
}

function ActionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="m-0 mb-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-studio-muted">
        {title}
      </h3>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function ActionButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-md border-studio-border bg-white px-3 py-2.5 text-left transition hover:border-studio-accent hover:bg-orange-50/40"
      onClick={onClick}
      type="button"
    >
      <span className="block text-sm font-semibold text-studio-text">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-studio-muted">{description}</span>
    </button>
  );
}
