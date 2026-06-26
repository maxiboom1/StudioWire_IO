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
  Rack,
} from '../domain/types';
import type {
  DeviceDraft,
  DevicePortGroupDraft,
  DeviceUpdate,
  ProjectState,
  TerminalBlockDraft,
} from './projectTypes';

export type ProjectInfoUpdates = Pick<ProjectInfo, 'name' | 'customer' | 'revision'>;
export type CategoryInput = Pick<Category, 'name' | 'defaultCablePrefix'>;
export type CategoryUpdates = Pick<Category, 'name' | 'defaultCablePrefix'>;
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
export type ConnectorTypeUpdates = Pick<ConnectorType, 'name'>;
export type CablePrefixInput = Pick<CablePrefix, 'prefix' | 'name'>;
export type LocationInput = Pick<Location, 'name' | 'type' | 'description'>;
export type LocationUpdates = Pick<Location, 'name' | 'type' | 'description'>;
export type RackInput = Pick<Rack, 'locationId' | 'name' | 'heightRu' | 'numberingDirection'>;
export type RackUpdates = Pick<Rack, 'name' | 'heightRu' | 'numberingDirection'>;
export type AddDeviceInput = { device: DeviceDraft; portGroups: DevicePortGroupDraft[] };
export type ConnectPortsInput = { fromPortId: string; toPortId: string };
export type DisconnectPortInput = { portId: string };
export type MoveMountedDeviceInput = { deviceId: string; targetRackId: string; targetBottomRu: number };

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
  addRack: (input: RackInput) => string;
  updateRack: (id: string, updates: RackUpdates) => void;
  deleteRack: (id: string) => void;
  addDevice: (input: AddDeviceInput) => string;
  addTerminalBlock: (input: TerminalBlockDraft) => string;
  connectPorts: (input: ConnectPortsInput) => void;
  disconnectPort: (input: DisconnectPortInput) => void;
  moveMountedDevice: (input: MoveMountedDeviceInput) => void;
  updateDevice: (id: string, updates: DeviceUpdate) => void;
  retireDevice: (id: string) => void;
}

export interface ProjectContextValue extends ProjectState, ProjectCommands {}

export interface ProjectJsonInputProps {
  className?: string;
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  onImportComplete?: () => void;
}
