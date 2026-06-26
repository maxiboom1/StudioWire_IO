import { connectPorts, disconnectPort } from '../../domain/connections';
import { stampProject } from '../projectStamping';
import type { ProjectState } from '../projectTypes';
import type { ActionOf, ProjectHandlerContext } from './shared';

export function handleConnectPorts(
  state: ProjectState,
  action: ActionOf<'CONNECT_PORTS'>,
  context: ProjectHandlerContext,
): ProjectState {
  const result = connectPorts(state.project, action.payload);

  if (!result.ok) {
    return {
      ...state,
      statusMessage: result.error,
      importError: null,
    };
  }

  return {
    ...state,
    project: stampProject(result.project, result.message, context.dependencies),
    statusMessage: result.message,
    importError: null,
  };
}

export function handleDisconnectPort(
  state: ProjectState,
  action: ActionOf<'DISCONNECT_PORT'>,
  context: ProjectHandlerContext,
): ProjectState {
  const result = disconnectPort(state.project, action.payload);

  if (!result.ok) {
    return {
      ...state,
      statusMessage: result.error,
      importError: null,
    };
  }

  return {
    ...state,
    project: stampProject(result.project, result.message, context.dependencies),
    statusMessage: result.message,
    importError: null,
  };
}
