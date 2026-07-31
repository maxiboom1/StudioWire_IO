import { handleConnectPorts, handleDisconnectPort } from './projectHandlers/connectionHandlers';
import {
  handleAddDevice,
  handleAddTerminalBlock,
  handleDeleteDevice,
  handleDeleteTerminalBlock,
  handleEditDevice,
  handleEditTerminalBlock,
  handleUpdateDevice,
} from './projectHandlers/deviceHandlers';
import {
  handleAddLocation,
  handleAddRack,
  handleAddSubLocation,
  handleDeleteLocation,
  handleDeleteRack,
  handleDeleteSubLocation,
  handleMoveMountedDevice,
  handleMoveNavigatorItemToFolder,
  handleUnassignDeviceFromRack,
  handleUpdateLocation,
  handleUpdateRack,
  handleUpdateSubLocation,
} from './projectHandlers/hierarchyHandlers';
import {
  createInitialProjectState as createInitialProjectStateWithContext,
  handleDismissImportError,
  handleImportProjectFailed,
  handleImportProjectJson,
  handleLoadSampleProject,
  handleNewProject,
  handleSetPersistenceState,
  handleValidateProject,
} from './projectHandlers/projectLifecycleHandlers';
import {
  handleAddCablePrefix,
  handleAddCategory,
  handleAddCategoryConnectorAssignment,
  handleAddConnectorGroup,
  handleAddConnectorGroupMember,
  handleAddConnectorType,
  handleRemoveCategoryConnectorAssignment,
  handleRemoveConnectorGroupMember,
  handleUpdateCategory,
  handleUpdateConnectorGroup,
  handleUpdateConnectorType,
  handleUpdateProjectInfo,
} from './projectHandlers/settingsHandlers';
import type { ProjectHandlerContext } from './projectHandlers/shared';
import { defaultProjectReducerDependencies, type ProjectReducerDependencies } from './projectReducerContext';
import type { ProjectAction, ProjectState } from './projectTypes';

export type {
  DeviceDraft,
  DevicePortGroupDraft,
  DeviceUpdate,
  ProjectAction,
  ProjectState,
  TerminalBlockDraft,
} from './projectTypes';

const defaultContext: ProjectHandlerContext = {
  dependencies: defaultProjectReducerDependencies,
};

export function createInitialProjectState(): ProjectState {
  return createInitialProjectStateWithContext(defaultContext);
}

export function createProjectReducer(dependencies: ProjectReducerDependencies) {
  const context: ProjectHandlerContext = { dependencies };

  return (state: ProjectState, action: ProjectAction): ProjectState =>
    reduceProjectState(state, action, context);
}

export function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  return reduceProjectState(state, action, defaultContext);
}

function reduceProjectState(
  state: ProjectState,
  action: ProjectAction,
  context: ProjectHandlerContext,
): ProjectState {
  switch (action.type) {
    case 'NEW_PROJECT':
      return handleNewProject(state, action, context);
    case 'LOAD_SAMPLE_PROJECT':
      return handleLoadSampleProject(state, action, context);
    case 'IMPORT_PROJECT_JSON':
      return handleImportProjectJson(state, action, context);
    case 'IMPORT_PROJECT_FAILED':
      return handleImportProjectFailed(state, action, context);
    case 'SET_PERSISTENCE_STATE':
      return handleSetPersistenceState(state, action, context);
    case 'UPDATE_PROJECT_INFO':
      return handleUpdateProjectInfo(state, action, context);
    case 'ADD_CATEGORY':
      return handleAddCategory(state, action, context);
    case 'UPDATE_CATEGORY':
      return handleUpdateCategory(state, action, context);
    case 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT':
      return handleAddCategoryConnectorAssignment(state, action, context);
    case 'REMOVE_CATEGORY_CONNECTOR_ASSIGNMENT':
      return handleRemoveCategoryConnectorAssignment(state, action, context);
    case 'ADD_CONNECTOR_GROUP':
      return handleAddConnectorGroup(state, action, context);
    case 'UPDATE_CONNECTOR_GROUP':
      return handleUpdateConnectorGroup(state, action, context);
    case 'ADD_CONNECTOR_GROUP_MEMBER':
      return handleAddConnectorGroupMember(state, action, context);
    case 'REMOVE_CONNECTOR_GROUP_MEMBER':
      return handleRemoveConnectorGroupMember(state, action, context);
    case 'ADD_CONNECTOR_TYPE':
      return handleAddConnectorType(state, action, context);
    case 'UPDATE_CONNECTOR_TYPE':
      return handleUpdateConnectorType(state, action, context);
    case 'ADD_CABLE_PREFIX':
      return handleAddCablePrefix(state, action, context);
    case 'ADD_LOCATION':
      return handleAddLocation(state, action, context);
    case 'UPDATE_LOCATION':
      return handleUpdateLocation(state, action, context);
    case 'ADD_SUB_LOCATION':
      return handleAddSubLocation(state, action, context);
    case 'UPDATE_SUB_LOCATION':
      return handleUpdateSubLocation(state, action, context);
    case 'DELETE_SUB_LOCATION':
      return handleDeleteSubLocation(state, action, context);
    case 'ADD_RACK':
      return handleAddRack(state, action, context);
    case 'UPDATE_RACK':
      return handleUpdateRack(state, action, context);
    case 'ADD_DEVICE':
      return handleAddDevice(state, action, context);
    case 'ADD_TERMINAL_BLOCK':
      return handleAddTerminalBlock(state, action, context);
    case 'EDIT_TERMINAL_BLOCK':
      return handleEditTerminalBlock(state, action, context);
    case 'DELETE_TERMINAL_BLOCK':
      return handleDeleteTerminalBlock(state, action, context);
    case 'CONNECT_PORTS':
      return handleConnectPorts(state, action, context);
    case 'DISCONNECT_PORT':
      return handleDisconnectPort(state, action, context);
    case 'UPDATE_DEVICE':
      return handleUpdateDevice(state, action, context);
    case 'EDIT_DEVICE':
      return handleEditDevice(state, action, context);
    case 'MOVE_MOUNTED_DEVICE':
      return handleMoveMountedDevice(state, action, context);
    case 'MOVE_NAVIGATOR_ITEM_TO_FOLDER':
      return handleMoveNavigatorItemToFolder(state, action, context);
    case 'UNASSIGN_DEVICE_FROM_RACK':
      return handleUnassignDeviceFromRack(state, action, context);
    case 'DELETE_LOCATION':
      return handleDeleteLocation(state, action, context);
    case 'DELETE_RACK':
      return handleDeleteRack(state, action, context);
    case 'DELETE_DEVICE':
      return handleDeleteDevice(state, action, context);
    case 'VALIDATE_PROJECT':
      return handleValidateProject(state, action, context);
    case 'DISMISS_IMPORT_ERROR':
      return handleDismissImportError(state, action, context);
    default:
      return assertNever(action);
  }
}

function assertNever(action: never): never {
  throw new Error(`Unhandled project action: ${JSON.stringify(action)}`);
}
