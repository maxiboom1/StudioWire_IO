import { makeUniqueId } from '../domain/id';
import { getDefaultCategoryColor, getDefaultConnectorIconKey } from '../domain/defaults';
import { createProjectView, createViewPlacement } from '../domain/viewOperations';
import type { ProjectRoot } from '../domain/types';
import { importProjectFile, exportProjectFile, type ProjectFileLike } from './projectFileTransfer';
import type {
  AddDeviceInput,
  AddViewLineInput,
  AddViewPlacementInput,
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
  MoveNavigatorItemToFolderInput,
  ProjectCommands,
  ProjectInfoUpdates,
  RackInput,
  RackUpdates,
  SubLocationInput,
  SubLocationUpdates,
  ViewAnnotationInput,
  ViewCanvasInput,
  ViewInput,
  ViewLineUpdates,
  ViewPlacementUpdates,
  ViewUpdates,
} from './projectContextTypes';
import type { ProjectAction, TerminalBlockDraft, TerminalBlockEditInput, DeviceUpdate } from './projectTypes';

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
          color: getDefaultCategoryColor(dependencies.getProject().settings.categories.length),
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
          iconKey: getDefaultConnectorIconKey(input.name),
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
          description: input.description,
        },
      });

      return id;
    },
    updateLocation: (id: string, updates: LocationUpdates) =>
      dispatch({ type: 'UPDATE_LOCATION', payload: { id, updates } }),
    deleteLocation: (id: string) => dispatch({ type: 'DELETE_LOCATION', payload: { id } }),
    addSubLocation: (input: SubLocationInput) => {
      const id = dependencies.makeUniqueId('sub-location', `${input.locationId}-${input.name}`);

      dispatch({
        type: 'ADD_SUB_LOCATION',
        payload: {
          id,
          locationId: input.locationId,
          name: input.name,
          description: input.description,
        },
      });

      return id;
    },
    updateSubLocation: (id: string, updates: SubLocationUpdates) =>
      dispatch({ type: 'UPDATE_SUB_LOCATION', payload: { id, updates } }),
    deleteSubLocation: (id: string) => dispatch({ type: 'DELETE_SUB_LOCATION', payload: { id } }),
    addRack: (input: RackInput) => {
      const id = dependencies.makeUniqueId('rack', `${input.locationId}-${input.name}`);

      dispatch({
        type: 'ADD_RACK',
        payload: {
          id,
          locationId: input.locationId,
          subLocationId: input.subLocationId ?? null,
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
    addView: (input: ViewInput) => {
      const id = dependencies.makeUniqueId('view', input.name);
      dispatch({ type: 'ADD_VIEW', payload: createProjectView({ id, ...input }) });
      return id;
    },
    updateView: (id: string, updates: ViewUpdates) =>
      dispatch({ type: 'UPDATE_VIEW', payload: { id, updates } }),
    deleteView: (id: string) => dispatch({ type: 'DELETE_VIEW', payload: { id } }),
    addViewPlacement: (viewId: string, input: AddViewPlacementInput) => {
      const id = dependencies.makeUniqueId(
        'view-placement',
        `${viewId}-${input.sourceType}-${input.sourceId}`,
      );
      dispatch({
        type: 'ADD_VIEW_PLACEMENT',
        payload: { viewId, placement: createViewPlacement({ id, ...input }) },
      });
      return id;
    },
    updateViewPlacement: (viewId: string, placementId: string, updates: ViewPlacementUpdates) =>
      dispatch({ type: 'UPDATE_VIEW_PLACEMENT', payload: { viewId, placementId, updates } }),
    removeViewPlacement: (viewId: string, placementId: string) =>
      dispatch({ type: 'REMOVE_VIEW_PLACEMENT', payload: { viewId, placementId } }),
    addViewLine: (viewId: string, input: AddViewLineInput) => {
      const id = dependencies.makeUniqueId(
        'view-line',
        `${viewId}-${input.from.placementId}-${input.to.placementId}`,
      );
      dispatch({ type: 'ADD_VIEW_LINE', payload: { viewId, line: { id, ...input } } });
      return id;
    },
    updateViewLine: (viewId: string, lineId: string, updates: ViewLineUpdates) =>
      dispatch({ type: 'UPDATE_VIEW_LINE', payload: { viewId, lineId, updates } }),
    removeViewLine: (viewId: string, lineId: string) =>
      dispatch({ type: 'REMOVE_VIEW_LINE', payload: { viewId, lineId } }),
    addViewAnnotation: (viewId: string, input: ViewAnnotationInput) => {
      const id = dependencies.makeUniqueId('view-annotation', `${viewId}-${input.kind}`);
      dispatch({ type: 'ADD_VIEW_ANNOTATION', payload: { viewId, annotation: { id, ...input } } });
      return id;
    },
    updateViewAnnotation: (viewId: string, annotationId: string, input: ViewAnnotationInput) =>
      dispatch({
        type: 'UPDATE_VIEW_ANNOTATION',
        payload: { viewId, annotationId, annotation: { id: annotationId, ...input } },
      }),
    removeViewAnnotation: (viewId: string, annotationId: string) =>
      dispatch({ type: 'REMOVE_VIEW_ANNOTATION', payload: { viewId, annotationId } }),
    replaceViewCanvas: (viewId: string, canvas: ViewCanvasInput) =>
      dispatch({ type: 'REPLACE_VIEW_CANVAS', payload: { viewId, canvas } }),
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
    editTerminalBlock: (input: TerminalBlockEditInput) =>
      dispatch({ type: 'EDIT_TERMINAL_BLOCK', payload: input }),
    deleteTerminalBlock: (id: string) => dispatch({ type: 'DELETE_TERMINAL_BLOCK', payload: { id } }),
    connectPorts: (input: ConnectPortsInput) => dispatch({ type: 'CONNECT_PORTS', payload: input }),
    disconnectPort: (input: DisconnectPortInput) => dispatch({ type: 'DISCONNECT_PORT', payload: input }),
    moveMountedDevice: (input: MoveMountedDeviceInput) =>
      dispatch({ type: 'MOVE_MOUNTED_DEVICE', payload: input }),
    moveNavigatorItemToFolder: (input: MoveNavigatorItemToFolderInput) =>
      dispatch({ type: 'MOVE_NAVIGATOR_ITEM_TO_FOLDER', payload: input }),
    unassignDeviceFromRack: (deviceId: string) =>
      dispatch({ type: 'UNASSIGN_DEVICE_FROM_RACK', payload: { deviceId } }),
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
    payload: {
      project: result.project,
      validationIssues: result.validationIssues,
      removedViewLineCount: result.removedViewLineCount,
    },
  });
  return true;
}
