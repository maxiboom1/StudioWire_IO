import { useEffect, useMemo, useRef } from 'react';
import type { ProjectRoot } from '../domain/types';
import {
  createProjectCommands,
  defaultProjectCommandServices,
  type ProjectDispatch,
} from './projectCommands';
import type { ProjectCommands } from './projectContextTypes';

export function useProjectCommands(project: ProjectRoot, dispatch: ProjectDispatch): ProjectCommands {
  const projectRef = useRef(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  return useMemo(
    () =>
      createProjectCommands({
        dispatch,
        makeUniqueId: defaultProjectCommandServices.makeUniqueId,
        getProject: () => projectRef.current,
        importProjectFile: defaultProjectCommandServices.importProjectFile,
        exportProjectFile: defaultProjectCommandServices.exportProjectFile,
      }),
    [dispatch],
  );
}
