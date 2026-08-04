import {
  addProjectView,
  addViewAnnotation,
  addViewLine,
  addViewPlacement,
  deleteProjectView,
  removeViewAnnotation,
  removeViewLine,
  removeViewPlacement,
  replaceViewCanvas,
  updateProjectView,
  updateViewAnnotation,
  updateViewLine,
  updateViewPlacement,
  type ViewOperationResult,
} from '../../domain/viewOperations';
import { stampProject } from '../projectStamping';
import type { ProjectState } from '../projectTypes';
import type { ActionOf, ProjectHandlerContext } from './shared';

export function handleAddView(
  state: ProjectState,
  action: ActionOf<'ADD_VIEW'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    addProjectView(state.project, action.payload),
    `View created: ${action.payload.name.trim()}`,
    'View created',
    context,
  );
}

export function handleUpdateView(
  state: ProjectState,
  action: ActionOf<'UPDATE_VIEW'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    updateProjectView(state.project, action.payload.id, action.payload.updates),
    `View updated: ${action.payload.id}`,
    'View updated',
    context,
  );
}

export function handleDeleteView(
  state: ProjectState,
  action: ActionOf<'DELETE_VIEW'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    deleteProjectView(state.project, action.payload.id),
    `View deleted: ${action.payload.id}`,
    'View deleted',
    context,
  );
}

export function handleAddViewPlacement(
  state: ProjectState,
  action: ActionOf<'ADD_VIEW_PLACEMENT'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    addViewPlacement(state.project, action.payload.viewId, action.payload.placement),
    `View placement created: ${action.payload.placement.id}`,
    'View placement created',
    context,
  );
}

export function handleUpdateViewPlacement(
  state: ProjectState,
  action: ActionOf<'UPDATE_VIEW_PLACEMENT'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    updateViewPlacement(
      state.project,
      action.payload.viewId,
      action.payload.placementId,
      action.payload.updates,
    ),
    `View placement updated: ${action.payload.placementId}`,
    'View placement updated',
    context,
  );
}

export function handleRemoveViewPlacement(
  state: ProjectState,
  action: ActionOf<'REMOVE_VIEW_PLACEMENT'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    removeViewPlacement(state.project, action.payload.viewId, action.payload.placementId),
    `View placement removed: ${action.payload.placementId}`,
    'View placement and attached drawing items removed',
    context,
  );
}

export function handleAddViewLine(
  state: ProjectState,
  action: ActionOf<'ADD_VIEW_LINE'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    addViewLine(state.project, action.payload.viewId, action.payload.line),
    `View line created: ${action.payload.line.id}`,
    'View line created',
    context,
  );
}

export function handleUpdateViewLine(
  state: ProjectState,
  action: ActionOf<'UPDATE_VIEW_LINE'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    updateViewLine(state.project, action.payload.viewId, action.payload.lineId, action.payload.updates),
    `View line updated: ${action.payload.lineId}`,
    'View line updated',
    context,
  );
}

export function handleRemoveViewLine(
  state: ProjectState,
  action: ActionOf<'REMOVE_VIEW_LINE'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    removeViewLine(state.project, action.payload.viewId, action.payload.lineId),
    `View line removed: ${action.payload.lineId}`,
    'View line removed',
    context,
  );
}

export function handleAddViewAnnotation(
  state: ProjectState,
  action: ActionOf<'ADD_VIEW_ANNOTATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    addViewAnnotation(state.project, action.payload.viewId, action.payload.annotation),
    `View annotation created: ${action.payload.annotation.id}`,
    'View annotation created',
    context,
  );
}

export function handleUpdateViewAnnotation(
  state: ProjectState,
  action: ActionOf<'UPDATE_VIEW_ANNOTATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    updateViewAnnotation(
      state.project,
      action.payload.viewId,
      action.payload.annotationId,
      action.payload.annotation,
    ),
    `View annotation updated: ${action.payload.annotationId}`,
    'View annotation updated',
    context,
  );
}

export function handleRemoveViewAnnotation(
  state: ProjectState,
  action: ActionOf<'REMOVE_VIEW_ANNOTATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    removeViewAnnotation(state.project, action.payload.viewId, action.payload.annotationId),
    `View annotation removed: ${action.payload.annotationId}`,
    'View annotation removed',
    context,
  );
}

export function handleReplaceViewCanvas(
  state: ProjectState,
  action: ActionOf<'REPLACE_VIEW_CANVAS'>,
  context: ProjectHandlerContext,
): ProjectState {
  return applyViewResult(
    state,
    replaceViewCanvas(state.project, action.payload.viewId, action.payload.canvas),
    `View canvas replaced: ${action.payload.viewId}`,
    'View canvas updated',
    context,
  );
}

function applyViewResult(
  state: ProjectState,
  result: ViewOperationResult,
  changeMessage: string,
  statusMessage: string,
  context: ProjectHandlerContext,
): ProjectState {
  if (!result.ok) {
    return {
      ...state,
      statusMessage: result.error,
      importError: null,
    };
  }

  return {
    project: stampProject(result.project, changeMessage, context.dependencies),
    statusMessage,
    importError: null,
  };
}
