import type {
  CablePrefix,
  Category,
  CategoryConnectorAssignment,
  ConnectorCompatibilityGroup,
  ConnectorCompatibilityGroupMember,
  ConnectorType,
  Device,
  Location,
  PortDirection,
  ProjectInfo,
  ProjectRoot,
  Rack,
} from '../domain/types';

export interface ProjectState {
  project: ProjectRoot;
  statusMessage: string;
  importError: string | null;
  persistenceState?: 'saving' | 'saved' | 'unsaved' | 'failed';
}

export interface DeviceDraft {
  id?: string;
  name: string;
  code: string;
  manufacturer: string;
  model: string;
  categoryId: string;
  locationId: string;
  role: string;
  labelPrefix: string;
  mountType: Device['mountType'];
  rackId: string | null;
  rackSizeRu: number | null;
  rackBottomRu: number | null;
  notes: string;
}

export interface DevicePortGroupDraft {
  name: string;
  direction: PortDirection;
  categoryId: string;
  connectorTypeId: string;
  count: number;
  portLabelPattern: string;
  cablePrefix: string;
  firstCableNumber: number | null;
  createPlannedCables: boolean;
}

export interface TerminalBlockDraft {
  id?: string;
  name: string;
  categoryId: string;
  locationId: string;
  labelPrefix: string;
  rackId: string;
  rackBottomRu: number;
  connectorTypeId: string;
  count: number;
  cablePrefix: string;
  firstCableNumber: number | null;
  createPlannedCables: boolean;
  notes: string;
}

export interface DeviceUpdate {
  name: string;
  manufacturer?: string;
  model?: string;
  role?: string;
  notes: string;
  locationId: string;
  rackSizeRu: number | null;
}

export interface DeviceEditUpdate extends DeviceUpdate {
  code: string;
  categoryId: string;
  labelPrefix: string;
}

export interface ExistingDevicePortGroupEdit {
  id: string;
  name: string;
  portLabelPattern: string;
}

export interface EditDeviceInput {
  deviceId: string;
  deviceUpdates: DeviceEditUpdate;
  existingPortGroups: ExistingDevicePortGroupEdit[];
  newPortGroups: DevicePortGroupDraft[];
}

export type ProjectAction =
  | { type: 'NEW_PROJECT' }
  | { type: 'LOAD_SAMPLE_PROJECT' }
  | {
      type: 'IMPORT_PROJECT_JSON';
      payload: { project: ProjectRoot; validationIssues: ProjectRoot['validationIssues'] };
    }
  | { type: 'IMPORT_PROJECT_FAILED'; payload: { message: string } }
  | {
      type: 'SET_PERSISTENCE_STATE';
      payload: { persistenceState: ProjectState['persistenceState']; message?: string };
    }
  | { type: 'UPDATE_PROJECT_INFO'; payload: Pick<ProjectInfo, 'name' | 'customer' | 'revision'> }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | {
      type: 'UPDATE_CATEGORY';
      payload: { id: string; updates: Pick<Category, 'name' | 'defaultCablePrefix'> };
    }
  | { type: 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT'; payload: CategoryConnectorAssignment }
  | { type: 'REMOVE_CATEGORY_CONNECTOR_ASSIGNMENT'; payload: { categoryId: string; connectorTypeId: string } }
  | { type: 'ADD_CONNECTOR_GROUP'; payload: ConnectorCompatibilityGroup }
  | {
      type: 'UPDATE_CONNECTOR_GROUP';
      payload: { id: string; updates: Pick<ConnectorCompatibilityGroup, 'name'> };
    }
  | { type: 'ADD_CONNECTOR_GROUP_MEMBER'; payload: ConnectorCompatibilityGroupMember }
  | { type: 'REMOVE_CONNECTOR_GROUP_MEMBER'; payload: { groupId: string; connectorTypeId: string } }
  | { type: 'ADD_CONNECTOR_TYPE'; payload: ConnectorType }
  | { type: 'UPDATE_CONNECTOR_TYPE'; payload: { id: string; updates: Pick<ConnectorType, 'name'> } }
  | { type: 'ADD_CABLE_PREFIX'; payload: CablePrefix }
  | { type: 'ADD_LOCATION'; payload: Location }
  | {
      type: 'UPDATE_LOCATION';
      payload: { id: string; updates: Pick<Location, 'name' | 'type' | 'description'> };
    }
  | { type: 'ADD_RACK'; payload: Rack }
  | {
      type: 'UPDATE_RACK';
      payload: { id: string; updates: Pick<Rack, 'name' | 'heightRu' | 'numberingDirection'> };
    }
  | { type: 'ADD_DEVICE'; payload: { device: DeviceDraft; portGroups: DevicePortGroupDraft[] } }
  | { type: 'ADD_TERMINAL_BLOCK'; payload: { terminalBlock: TerminalBlockDraft } }
  | { type: 'CONNECT_PORTS'; payload: { fromPortId: string; toPortId: string } }
  | { type: 'DISCONNECT_PORT'; payload: { portId: string } }
  | { type: 'UPDATE_DEVICE'; payload: { id: string; updates: DeviceUpdate } }
  | { type: 'EDIT_DEVICE'; payload: EditDeviceInput }
  | {
      type: 'MOVE_MOUNTED_DEVICE';
      payload: { deviceId: string; targetRackId: string; targetBottomRu: number };
    }
  | { type: 'DELETE_LOCATION'; payload: { id: string } }
  | { type: 'DELETE_RACK'; payload: { id: string } }
  | { type: 'DELETE_DEVICE'; payload: { id: string } }
  | { type: 'VALIDATE_PROJECT' }
  | { type: 'DISMISS_IMPORT_ERROR' };
