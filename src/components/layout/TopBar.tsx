import { useProject } from '../../state/ProjectContext';

export function TopBar() {
  const { project, statusMessage } = useProject();

  return (
    <header className="relative z-10 flex min-h-[50px] items-center justify-between gap-4 border-b border-studio-border bg-white px-4 shadow-sm shadow-slate-900/[0.03]">
      <div className="min-w-0">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-studio-muted">
          Workspace
        </p>
        <h1 className="m-0 truncate text-sm font-semibold text-studio-text">{project.project.name}</h1>
      </div>
      <p className="m-0 hidden min-w-0 truncate text-xs text-studio-muted md:block" aria-live="polite">
        {statusMessage}
      </p>
    </header>
  );
}
