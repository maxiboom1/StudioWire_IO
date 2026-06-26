import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { loadInitialProjectState } from './projectInitialState';
import { projectReducer } from './projectReducer';
import type { ProjectContextValue } from './projectContextTypes';
import { useProjectAutosave } from './useProjectAutosave';
import { useProjectCommands } from './useProjectCommands';

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, undefined, loadInitialProjectState);
  const commands = useProjectCommands(state.project, dispatch);

  useProjectAutosave(state.project, dispatch);

  const value = useMemo<ProjectContextValue>(
    () => ({
      ...state,
      persistenceState: state.persistenceState ?? 'unsaved',
      ...commands,
    }),
    [state, commands],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used inside ProjectProvider');
  }

  return context;
}
