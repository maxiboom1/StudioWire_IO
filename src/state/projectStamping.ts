import { createEmptyProject } from '../domain/projectFactory';
import type { ChangeLogEntry, ProjectRoot } from '../domain/types';
import type { ProjectReducerDependencies } from './projectReducerContext';

export function createNewProject(dependencies: ProjectReducerDependencies): ProjectRoot {
  const timestamp = dependencies.nowIso();

  return createEmptyProject({
    id: dependencies.makeUniqueId('project', 'untitled'),
    name: 'Untitled Project',
    revision: '0.1',
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: 'local',
    updatedBy: 'local',
  });
}

export function stampProject(
  project: ProjectRoot,
  message: string,
  dependencies: ProjectReducerDependencies,
): ProjectRoot {
  const timestamp = dependencies.nowIso();

  return {
    ...project,
    project: {
      ...project.project,
      updatedAt: timestamp,
      updatedBy: 'local',
    },
    changeLog: [...project.changeLog, createChangeLogEntry(message, timestamp, dependencies)],
  };
}

export function createChangeLogEntry(
  message: string,
  timestamp: string,
  dependencies: Pick<ProjectReducerDependencies, 'makeId'>,
): ChangeLogEntry {
  return {
    id: dependencies.makeId('change', `${timestamp}-${message}`),
    timestamp,
    message,
    author: 'local',
  };
}
