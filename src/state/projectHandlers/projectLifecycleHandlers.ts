import { sampleProject } from '../../domain/sampleProject';
import { validateProject } from '../../domain/validators';
import { createNewProject, stampProject } from '../projectStamping';
import type { ProjectState } from '../projectTypes';
import type { ActionOf, ProjectHandlerContext } from './shared';

export function createInitialProjectState(context: ProjectHandlerContext): ProjectState {
  return {
    project: createNewProject(context.dependencies),
    statusMessage: 'New project ready',
    importError: null,
    persistenceState: 'unsaved',
    projectLifecycleRevision: 0,
  };
}

export function handleNewProject(
  state: ProjectState,
  _action: ActionOf<'NEW_PROJECT'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: createNewProject(context.dependencies),
    statusMessage: 'New project created',
    importError: null,
    persistenceState: 'unsaved',
    projectLifecycleRevision: (state.projectLifecycleRevision ?? 0) + 1,
  };
}

export function handleLoadSampleProject(
  state: ProjectState,
  _action: ActionOf<'LOAD_SAMPLE_PROJECT'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(structuredClone(sampleProject), 'Sample project loaded', context.dependencies),
    statusMessage: 'Sample project loaded',
    importError: null,
    persistenceState: 'unsaved',
    projectLifecycleRevision: (state.projectLifecycleRevision ?? 0) + 1,
  };
}

export function handleImportProjectJson(
  state: ProjectState,
  action: ActionOf<'IMPORT_PROJECT_JSON'>,
  context: ProjectHandlerContext,
): ProjectState {
  const migrationStatus =
    action.payload.removedViewLineCount > 0
      ? `; removed ${action.payload.removedViewLineCount} legacy View line(s)`
      : '';
  return {
    project: stampProject(
      {
        ...action.payload.project,
        validationIssues: action.payload.validationIssues,
      },
      `Project imported from JSON with ${action.payload.validationIssues.length} validation issue(s)${migrationStatus}`,
      context.dependencies,
    ),
    statusMessage: `Project imported; ${action.payload.validationIssues.length} validation issue(s) found${migrationStatus}`,
    importError: null,
    persistenceState: 'unsaved',
    projectLifecycleRevision: (state.projectLifecycleRevision ?? 0) + 1,
  };
}

export function handleImportProjectFailed(
  state: ProjectState,
  action: ActionOf<'IMPORT_PROJECT_FAILED'>,
  _context: ProjectHandlerContext,
): ProjectState {
  return {
    ...state,
    statusMessage: 'Import failed',
    importError: action.payload.message,
  };
}

export function handleSetPersistenceState(
  state: ProjectState,
  action: ActionOf<'SET_PERSISTENCE_STATE'>,
  _context: ProjectHandlerContext,
): ProjectState {
  return {
    ...state,
    persistenceState: action.payload.persistenceState,
    statusMessage: action.payload.message ?? state.statusMessage,
  };
}

export function handleValidateProject(
  state: ProjectState,
  _action: ActionOf<'VALIDATE_PROJECT'>,
  context: ProjectHandlerContext,
): ProjectState {
  const validationIssues = validateProject(state.project);

  return {
    project: stampProject(
      {
        ...state.project,
        validationIssues,
      },
      validationIssues.length === 0
        ? 'Project validation completed with no issues'
        : `Project validation found ${validationIssues.length} issue(s)`,
      context.dependencies,
    ),
    statusMessage:
      validationIssues.length === 0
        ? 'Validation passed'
        : `Validation found ${validationIssues.length} issue(s)`,
    importError: null,
  };
}

export function handleDismissImportError(
  state: ProjectState,
  _action: ActionOf<'DISMISS_IMPORT_ERROR'>,
  _context: ProjectHandlerContext,
): ProjectState {
  return {
    ...state,
    importError: null,
  };
}
