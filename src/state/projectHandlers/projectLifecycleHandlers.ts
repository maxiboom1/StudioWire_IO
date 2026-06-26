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
  };
}

export function handleNewProject(
  _state: ProjectState,
  _action: ActionOf<'NEW_PROJECT'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: createNewProject(context.dependencies),
    statusMessage: 'New project created',
    importError: null,
    persistenceState: 'unsaved',
  };
}

export function handleLoadSampleProject(
  _state: ProjectState,
  _action: ActionOf<'LOAD_SAMPLE_PROJECT'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(structuredClone(sampleProject), 'Sample project loaded', context.dependencies),
    statusMessage: 'Sample project loaded',
    importError: null,
    persistenceState: 'unsaved',
  };
}

export function handleImportProjectJson(
  _state: ProjectState,
  action: ActionOf<'IMPORT_PROJECT_JSON'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...action.payload.project,
        validationIssues: action.payload.validationIssues,
      },
      `Project imported from JSON with ${action.payload.validationIssues.length} validation issue(s)`,
      context.dependencies,
    ),
    statusMessage: `Project imported; ${action.payload.validationIssues.length} validation issue(s) found`,
    importError: null,
    persistenceState: 'unsaved',
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
