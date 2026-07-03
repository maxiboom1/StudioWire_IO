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
  SubLocation,
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
  subLocationId?: string | null;
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
  colorOverride?: string | null;
}

export interface TerminalBlockDraft {
  id?: string;
  name: string;
  categoryId: string;
  locationId: string;
  subLocationId?: string | null;
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
  subLocationId?: string | null;
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
  colorOverride?: string | null;
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
      payload: { id: string; updates: Partial<Pick<Category, 'name' | 'defaultCablePrefix' | 'color'>> };
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
  | {
      type: 'UPDATE_CONNECTOR_TYPE';
      payload: { id: string; updates: Partial<Pick<ConnectorType, 'name' | 'iconKey'>> };
    }
  | { type: 'ADD_CABLE_PREFIX'; payload: CablePrefix }
  | { type: 'ADD_LOCATION'; payload: Location }
  | {
      type: 'UPDATE_LOCATION';
      payload: { id: string; updates: Pick<Location, 'name' | 'type' | 'description'> };
    }
  | { type: 'ADD_SUB_LOCATION'; payload: SubLocation }
  | {
      type: 'UPDATE_SUB_LOCATION';
      payload: { id: string; updates: Pick<SubLocation, 'name' | 'description'> };
    }
  | { type: 'DELETE_SUB_LOCATION'; payload: { id: string } }
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
  | {
      type: 'MOVE_NAVIGATOR_ITEM_TO_FOLDER';
      payload: {
        itemType: 'device' | 'rack';
        itemId: string;
        targetLocationId: string;
        targetFolderId: string | null;
      };
    }
  | { type: 'UNASSIGN_DEVICE_FROM_RACK'; payload: { deviceId: string } }
  | { type: 'DELETE_LOCATION'; payload: { id: string } }
  | { type: 'DELETE_RACK'; payload: { id: string } }
  | { type: 'DELETE_DEVICE'; payload: { id: string } }
  | { type: 'VALIDATE_PROJECT' }
  | { type: 'DISMISS_IMPORT_ERROR' };
