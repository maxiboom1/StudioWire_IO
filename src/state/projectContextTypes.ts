import type { Ref } from 'react';
import type {
  CablePrefix,
  Category,
  CategoryConnectorAssignment,
  ConnectorCompatibilityGroup,
  ConnectorCompatibilityGroupMember,
  ConnectorType,
  Location,
  ProjectInfo,
  ProjectView,
  Rack,
  SubLocation,
  ViewGroupAnnotation,
  ViewLine,
  ViewPlacement,
  ViewTextAnnotation,
} from '../domain/types';
import type {
  DeviceDraft,
  DevicePortGroupDraft,
  DeviceUpdate,
  EditDeviceInput,
  ProjectState,
  TerminalBlockDraft,
  TerminalBlockEditInput,
} from './projectTypes';

export type ProjectInfoUpdates = Pick<ProjectInfo, 'name' | 'customer' | 'revision'>;
export type CategoryInput = Pick<Category, 'name' | 'defaultCablePrefix'>;
export type CategoryUpdates = Partial<Pick<Category, 'name' | 'defaultCablePrefix' | 'color'>>;
export type CategoryConnectorAssignmentInput = Pick<
  CategoryConnectorAssignment,
  'categoryId' | 'connectorTypeId'
>;
export type ConnectorGroupInput = Pick<ConnectorCompatibilityGroup, 'categoryId' | 'name'>;
export type ConnectorGroupUpdates = Pick<ConnectorCompatibilityGroup, 'name'>;
export type ConnectorGroupMemberInput = Pick<
  ConnectorCompatibilityGroupMember,
  'groupId' | 'connectorTypeId'
>;
export type ConnectorTypeInput = Pick<ConnectorType, 'name'>;
export type ConnectorTypeUpdates = Partial<Pick<ConnectorType, 'name' | 'iconKey'>>;
export type CablePrefixInput = Pick<CablePrefix, 'prefix' | 'name'>;
export type LocationInput = Pick<Location, 'name' | 'description'>;
export type LocationUpdates = Pick<Location, 'name' | 'description'>;
export type SubLocationInput = Pick<SubLocation, 'locationId' | 'name' | 'description'>;
export type SubLocationUpdates = Pick<SubLocation, 'name' | 'description'>;
export type RackInput = Pick<Rack, 'locationId' | 'name' | 'heightRu' | 'numberingDirection'> &
  Partial<Pick<Rack, 'subLocationId'>>;
export type RackUpdates = Pick<Rack, 'name' | 'heightRu' | 'numberingDirection'>;
export type ViewInput = Pick<ProjectView, 'name'> &
  Partial<Pick<ProjectView, 'description' | 'pageSize' | 'orientation'>>;
export type ViewUpdates = Partial<Pick<ProjectView, 'name' | 'description' | 'pageSize' | 'orientation'>>;
export type AddViewPlacementInput = Omit<ViewPlacement, 'id' | 'scale' | 'labelOverride'> &
  Partial<Pick<ViewPlacement, 'scale' | 'labelOverride'>>;
export type ViewPlacementUpdates = Partial<Pick<ViewPlacement, 'xMm' | 'yMm' | 'scale' | 'labelOverride'>>;
export type AddViewLineInput = Omit<ViewLine, 'id'>;
export type ViewLineUpdates = Partial<Pick<ViewLine, 'from' | 'to' | 'label' | 'waypoints'>>;
export type ViewAnnotationInput = Omit<ViewTextAnnotation, 'id'> | Omit<ViewGroupAnnotation, 'id'>;
export type ViewCanvasInput = Pick<ProjectView, 'placements' | 'lines' | 'annotations'>;
export type AddDeviceInput = { device: DeviceDraft; portGroups: DevicePortGroupDraft[] };
export type { EditDeviceInput };
export type ConnectPortsInput = { fromPortId: string; toPortId: string };
export type DisconnectPortInput = { portId: string };
export type MoveMountedDeviceInput = { deviceId: string; targetRackId: string; targetBottomRu: number };
export type MoveNavigatorItemToFolderInput = {
  itemType: 'device' | 'rack';
  itemId: string;
  targetLocationId: string;
  targetFolderId: string | null;
};

export interface ProjectCommands {
  createNewProject: () => void;
  loadSampleProject: () => void;
  importProjectJson: (file: File) => Promise<boolean>;
  exportProjectJson: () => void;
  validateProject: () => void;
  dismissImportError: () => void;
  updateProjectInfo: (updates: ProjectInfoUpdates) => void;
  addCategory: (input: CategoryInput) => string;
  updateCategory: (id: string, updates: CategoryUpdates) => void;
  addCategoryConnectorAssignment: (input: CategoryConnectorAssignmentInput) => string;
  removeCategoryConnectorAssignment: (input: CategoryConnectorAssignmentInput) => void;
  addConnectorGroup: (input: ConnectorGroupInput) => string;
  updateConnectorGroup: (id: string, updates: ConnectorGroupUpdates) => void;
  addConnectorGroupMember: (input: ConnectorGroupMemberInput) => string;
  removeConnectorGroupMember: (input: ConnectorGroupMemberInput) => void;
  addConnectorType: (input: ConnectorTypeInput) => string;
  updateConnectorType: (id: string, updates: ConnectorTypeUpdates) => void;
  addCablePrefix: (input: CablePrefixInput) => string;
  addLocation: (input: LocationInput) => string;
  updateLocation: (id: string, updates: LocationUpdates) => void;
  deleteLocation: (id: string) => void;
  addSubLocation: (input: SubLocationInput) => string;
  updateSubLocation: (id: string, updates: SubLocationUpdates) => void;
  deleteSubLocation: (id: string) => void;
  addRack: (input: RackInput) => string;
  updateRack: (id: string, updates: RackUpdates) => void;
  deleteRack: (id: string) => void;
  addView: (input: ViewInput) => string;
  updateView: (id: string, updates: ViewUpdates) => void;
  deleteView: (id: string) => void;
  addViewPlacement: (viewId: string, input: AddViewPlacementInput) => string;
  updateViewPlacement: (viewId: string, placementId: string, updates: ViewPlacementUpdates) => void;
  removeViewPlacement: (viewId: string, placementId: string) => void;
  addViewLine: (viewId: string, input: AddViewLineInput) => string;
  updateViewLine: (viewId: string, lineId: string, updates: ViewLineUpdates) => void;
  removeViewLine: (viewId: string, lineId: string) => void;
  addViewAnnotation: (viewId: string, input: ViewAnnotationInput) => string;
  updateViewAnnotation: (viewId: string, annotationId: string, input: ViewAnnotationInput) => void;
  removeViewAnnotation: (viewId: string, annotationId: string) => void;
  replaceViewCanvas: (viewId: string, canvas: ViewCanvasInput) => void;
  addDevice: (input: AddDeviceInput) => string;
  addTerminalBlock: (input: TerminalBlockDraft) => string;
  editTerminalBlock: (input: TerminalBlockEditInput) => void;
  deleteTerminalBlock: (id: string) => void;
  connectPorts: (input: ConnectPortsInput) => void;
  disconnectPort: (input: DisconnectPortInput) => void;
  moveMountedDevice: (input: MoveMountedDeviceInput) => void;
  moveNavigatorItemToFolder: (input: MoveNavigatorItemToFolderInput) => void;
  unassignDeviceFromRack: (deviceId: string) => void;
  updateDevice: (id: string, updates: DeviceUpdate) => void;
  editDevice: (input: EditDeviceInput) => void;
  deleteDevice: (id: string) => void;
}

export interface ProjectContextValue extends ProjectState, ProjectCommands {}

export interface ProjectJsonInputProps {
  className?: string;
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  onImportComplete?: () => void;
}
