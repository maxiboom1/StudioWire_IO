import { useState } from 'react';
import logoUrl from '../../assets/studiowire-logo.svg';
import { useProject } from '../../state/ProjectContext';
import { AppActionsModal } from './AppActionsModal';

export function TopBar({
  onProjectLoaded,
  onOpenSettings,
}: {
  onProjectLoaded: () => void;
  onOpenSettings: () => void;
}) {
  const { project, statusMessage } = useProject();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative z-10 flex min-h-[58px] items-center justify-between gap-5 border-b border-studio-border bg-white px-4 shadow-sm shadow-slate-900/[0.03]">
      <button
        aria-label="Select project"
        className="flex min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left hover:border-transparent hover:bg-transparent"
        onClick={onProjectLoaded}
        type="button"
      >
        <img alt="StudioWire IO logo" className="h-9 w-24 shrink-0 object-contain" src={logoUrl} />
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate text-[0.96rem] font-semibold leading-tight text-studio-text">
            StudioWire IO
          </span>
          <span className="truncate text-xs leading-tight text-studio-muted">{project.project.name}</span>
        </span>
      </button>

      <p className="m-0 hidden min-w-0 flex-1 truncate text-center text-xs text-studio-muted lg:block" aria-live="polite">
        {statusMessage}
      </p>

      <button
        aria-expanded={isMenuOpen}
        className="rounded-md border-studio-border bg-white px-3 py-2 text-sm font-semibold text-studio-text shadow-sm transition hover:border-studio-accent hover:bg-orange-50/50"
        onClick={() => setIsMenuOpen(true)}
        type="button"
      >
        Settings
      </button>

      {isMenuOpen ? (
        <AppActionsModal
          onClose={() => setIsMenuOpen(false)}
          onOpenSettings={onOpenSettings}
          onProjectLoaded={onProjectLoaded}
        />
      ) : null}
    </header>
  );
}
