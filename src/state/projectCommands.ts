import { makeUniqueId } from '../domain/id';
import type { ProjectRoot } from '../domain/types';
import { importProjectFile, exportProjectFile, type ProjectFileLike } from './projectFileTransfer';
import type {
  AddDeviceInput,
  CablePrefixInput,
  CategoryConnectorAssignmentInput,
  CategoryInput,
  CategoryUpdates,
  ConnectPortsInput,
  ConnectorGroupInput,
  ConnectorGroupMemberInput,
  ConnectorGroupUpdates,
  ConnectorTypeInput,
  ConnectorTypeUpdates,
  DisconnectPortInput,
  EditDeviceInput,
  LocationInput,
  LocationUpdates,
  MoveMountedDeviceInput,
  ProjectCommands,
  ProjectInfoUpdates,
  RackInput,
  RackUpdates,
} from './projectContextTypes';
import type { ProjectAction, TerminalBlockDraft, DeviceUpdate } from './projectTypes';

export type ProjectDispatch = (action: ProjectAction) => void;

export interface ProjectCommandDependencies {
  dispatch: ProjectDispatch;
  makeUniqueId: (prefix: string, value: string) => string;
  getProject: () => ProjectRoot;
  importProjectFile: typeof importProjectFile;
  exportProjectFile: typeof exportProjectFile;
}

export const defaultProjectCommandServices = {
  makeUniqueId,
  importProjectFile,
  exportProjectFile,
};

export function createProjectCommands(dependencies: ProjectCommandDependencies): ProjectCommands {
  const dispatch = dependencies.dispatch;

  return {
    createNewProject: () => dispatch({ type: 'NEW_PROJECT' }),
    loadSampleProject: () => dispatch({ type: 'LOAD_SAMPLE_PROJECT' }),
    importProjectJson: async (file: File) => importProjectJson(file, dependencies),
    exportProjectJson: () => dependencies.exportProjectFile(dependencies.getProject()),
    validateProject: () => dispatch({ type: 'VALIDATE_PROJECT' }),
    dismissImportError: () => dispatch({ type: 'DISMISS_IMPORT_ERROR' }),
    updateProjectInfo: (updates: ProjectInfoUpdates) =>
      dispatch({ type: 'UPDATE_PROJECT_INFO', payload: updates }),
    addCategory: (input: CategoryInput) => {
      const id = dependencies.makeUniqueId('category', input.name);

      dispatch({
        type: 'ADD_CATEGORY',
        payload: {
          id,
          name: input.name,
          defaultCablePrefix: input.defaultCablePrefix,
        },
      });

      return id;
    },
    updateCategory: (id: string, updates: CategoryUpdates) =>
      dispatch({ type: 'UPDATE_CATEGORY', payload: { id, updates } }),
    addCategoryConnectorAssignment: (input: CategoryConnectorAssignmentInput) => {
      const id = dependencies.makeUniqueId('assignment', `${input.categoryId}-${input.connectorTypeId}`);

      dispatch({
        type: 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT',
        payload: {
          id,
          categoryId: input.categoryId,
          connectorTypeId: input.connectorTypeId,
        },
      });

      return id;
    },
    removeCategoryConnectorAssignment: (input: CategoryConnectorAssignmentInput) =>
      dispatch({ type: 'REMOVE_CATEGORY_CONNECTOR_ASSIGNMENT', payload: input }),
    addConnectorGroup: (input: ConnectorGroupInput) => {
      const id = dependencies.makeUniqueId('group', `${input.categoryId}-${input.name}`);

      dispatch({
        type: 'ADD_CONNECTOR_GROUP',
        payload: {
          id,
          categoryId: input.categoryId,
          name: input.name,
        },
      });

      return id;
    },
    updateConnectorGroup: (id: string, updates: ConnectorGroupUpdates) =>
      dispatch({ type: 'UPDATE_CONNECTOR_GROUP', payload: { id, updates } }),
    addConnectorGroupMember: (input: ConnectorGroupMemberInput) => {
      const id = dependencies.makeUniqueId('member', `${input.groupId}-${input.connectorTypeId}`);

      dispatch({
        type: 'ADD_CONNECTOR_GROUP_MEMBER',
        payload: {
          id,
          groupId: input.groupId,
          connectorTypeId: input.connectorTypeId,
        },
      });

      return id;
    },
    removeConnectorGroupMember: (input: ConnectorGroupMemberInput) =>
      dispatch({ type: 'REMOVE_CONNECTOR_GROUP_MEMBER', payload: input }),
    addConnectorType: (input: ConnectorTypeInput) => {
      const id = dependencies.makeUniqueId('connector', input.name);

      dispatch({
        type: 'ADD_CONNECTOR_TYPE',
        payload: {
          id,
          name: input.name,
        },
      });

      return id;
    },
    updateConnectorType: (id: string, updates: ConnectorTypeUpdates) =>
      dispatch({ type: 'UPDATE_CONNECTOR_TYPE', payload: { id, updates } }),
    addCablePrefix: (input: CablePrefixInput) => {
      const normalizedPrefix = input.prefix.trim().toUpperCase();
      const id = dependencies.makeUniqueId('prefix', normalizedPrefix);

      dispatch({
        type: 'ADD_CABLE_PREFIX',
        payload: {
          id,
          prefix: normalizedPrefix,
          name: input.name,
        },
      });

      return id;
    },
    addLocation: (input: LocationInput) => {
      const id = dependencies.makeUniqueId('location', input.name);

      dispatch({
        type: 'ADD_LOCATION',
        payload: {
          id,
          name: input.name,
          type: input.type,
          description: input.description,
        },
      });

      return id;
    },
    updateLocation: (id: string, updates: LocationUpdates) =>
      dispatch({ type: 'UPDATE_LOCATION', payload: { id, updates } }),
    deleteLocation: (id: string) => dispatch({ type: 'DELETE_LOCATION', payload: { id } }),
    addRack: (input: RackInput) => {
      const id = dependencies.makeUniqueId('rack', `${input.locationId}-${input.name}`);

      dispatch({
        type: 'ADD_RACK',
        payload: {
          id,
          locationId: input.locationId,
          name: input.name,
          heightRu: input.heightRu,
          numberingDirection: input.numberingDirection,
        },
      });

      return id;
    },
    updateRack: (id: string, updates: RackUpdates) =>
      dispatch({ type: 'UPDATE_RACK', payload: { id, updates } }),
    deleteRack: (id: string) => dispatch({ type: 'DELETE_RACK', payload: { id } }),
    addDevice: (input: AddDeviceInput) => {
      const id =
        input.device.id ?? dependencies.makeUniqueId('device', input.device.code || input.device.name);

      dispatch({ type: 'ADD_DEVICE', payload: { ...input, device: { ...input.device, id } } });

      return id;
    },
    addTerminalBlock: (input: TerminalBlockDraft) => {
      const id = input.id ?? dependencies.makeUniqueId('terminal-block', input.labelPrefix || input.name);

      dispatch({ type: 'ADD_TERMINAL_BLOCK', payload: { terminalBlock: { ...input, id } } });

      return id;
    },
    connectPorts: (input: ConnectPortsInput) => dispatch({ type: 'CONNECT_PORTS', payload: input }),
    disconnectPort: (input: DisconnectPortInput) => dispatch({ type: 'DISCONNECT_PORT', payload: input }),
    moveMountedDevice: (input: MoveMountedDeviceInput) =>
      dispatch({ type: 'MOVE_MOUNTED_DEVICE', payload: input }),
    updateDevice: (id: string, updates: DeviceUpdate) =>
      dispatch({ type: 'UPDATE_DEVICE', payload: { id, updates } }),
    editDevice: (input: EditDeviceInput) => dispatch({ type: 'EDIT_DEVICE', payload: input }),
    deleteDevice: (id: string) => dispatch({ type: 'DELETE_DEVICE', payload: { id } }),
  };
}

async function importProjectJson(
  file: ProjectFileLike,
  dependencies: ProjectCommandDependencies,
): Promise<boolean> {
  const result = await dependencies.importProjectFile(file);

  if (!result.ok) {
    dependencies.dispatch({ type: 'IMPORT_PROJECT_FAILED', payload: { message: result.error } });
    return false;
  }

  dependencies.dispatch({
    type: 'IMPORT_PROJECT_JSON',
    payload: { project: result.project, validationIssues: result.validationIssues },
  });
  return true;
}
