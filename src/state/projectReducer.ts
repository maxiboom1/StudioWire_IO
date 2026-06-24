import { connectPorts, disconnectPort } from '../domain/connections';
import { makeId, makeUniqueId, nowIso } from '../domain/id';
import { createEmptyProject } from '../domain/projectFactory';
import { validateRackPlacement } from '../domain/rackPlacement';
import { sampleProject } from '../domain/sampleProject';
import { validateProject } from '../domain/validators';
import type {
  CablePrefix,
  CategoryConnectorAssignment,
  Category,
  ChangeLogEntry,
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
import { createDeviceInProject, createTerminalBlockInProject } from './projectDeviceCommands';

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
  locationId: string | null;
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
  locationId: string | null;
  rackSizeRu: number | null;
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
  | {
      type: 'MOVE_MOUNTED_DEVICE';
      payload: { deviceId: string; targetRackId: string; targetBottomRu: number };
    }
  | { type: 'DELETE_LOCATION'; payload: { id: string } }
  | { type: 'DELETE_RACK'; payload: { id: string } }
  | { type: 'RETIRE_DEVICE'; payload: { id: string } }
  | { type: 'VALIDATE_PROJECT' }
  | { type: 'DISMISS_IMPORT_ERROR' };

export function createInitialProjectState(): ProjectState {
  return {
    project: createNewProject(),
    statusMessage: 'New project ready',
    importError: null,
    persistenceState: 'unsaved',
  };
}

export function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'NEW_PROJECT': {
      return {
        project: createNewProject(),
        statusMessage: 'New project created',
        importError: null,
        persistenceState: 'unsaved',
      };
    }

    case 'LOAD_SAMPLE_PROJECT': {
      return {
        project: stampProject(structuredClone(sampleProject), 'Sample project loaded'),
        statusMessage: 'Sample project loaded',
        importError: null,
        persistenceState: 'unsaved',
      };
    }

    case 'IMPORT_PROJECT_JSON': {
      return {
        project: stampProject(
          {
            ...action.payload.project,
            validationIssues: action.payload.validationIssues,
          },
          `Project imported from JSON with ${action.payload.validationIssues.length} validation issue(s)`,
        ),
        statusMessage: `Project imported; ${action.payload.validationIssues.length} validation issue(s) found`,
        importError: null,
        persistenceState: 'unsaved',
      };
    }

    case 'IMPORT_PROJECT_FAILED': {
      return {
        ...state,
        statusMessage: 'Import failed',
        importError: action.payload.message,
      };
    }

    case 'SET_PERSISTENCE_STATE': {
      return {
        ...state,
        persistenceState: action.payload.persistenceState,
        statusMessage: action.payload.message ?? state.statusMessage,
      };
    }

    case 'UPDATE_PROJECT_INFO': {
      return {
        project: stampProject(
          {
            ...state.project,
            project: {
              ...state.project.project,
              ...action.payload,
            },
          },
          'Project settings updated',
        ),
        statusMessage: 'Project settings updated',
        importError: null,
      };
    }

    case 'ADD_CATEGORY': {
      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              categories: [...state.project.settings.categories, action.payload],
            },
          },
          `Category added: ${action.payload.name}`,
        ),
        statusMessage: 'Category added',
        importError: null,
      };
    }

    case 'UPDATE_CATEGORY': {
      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              categories: state.project.settings.categories.map((category) =>
                category.id === action.payload.id ? { ...category, ...action.payload.updates } : category,
              ),
            },
          },
          `Category updated: ${action.payload.id}`,
        ),
        statusMessage: 'Category updated',
        importError: null,
      };
    }

    case 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT': {
      const alreadyAssigned = state.project.settings.categoryConnectorAssignments.some(
        (assignment) =>
          assignment.categoryId === action.payload.categoryId &&
          assignment.connectorTypeId === action.payload.connectorTypeId,
      );

      if (alreadyAssigned) {
        return {
          ...state,
          statusMessage: 'Connector already assigned to category',
          importError: null,
        };
      }

      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              categoryConnectorAssignments: [
                ...state.project.settings.categoryConnectorAssignments,
                action.payload,
              ],
            },
          },
          `Connector assigned to category: ${action.payload.connectorTypeId}`,
        ),
        statusMessage: 'Connector assigned to category',
        importError: null,
      };
    }

    case 'REMOVE_CATEGORY_CONNECTOR_ASSIGNMENT': {
      const groupsInCategory = new Set(
        state.project.settings.connectorCompatibilityGroups
          .filter((group) => group.categoryId === action.payload.categoryId)
          .map((group) => group.id),
      );

      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              categoryConnectorAssignments: state.project.settings.categoryConnectorAssignments.filter(
                (assignment) =>
                  assignment.categoryId !== action.payload.categoryId ||
                  assignment.connectorTypeId !== action.payload.connectorTypeId,
              ),
              connectorCompatibilityGroupMembers:
                state.project.settings.connectorCompatibilityGroupMembers.filter(
                  (member) =>
                    member.connectorTypeId !== action.payload.connectorTypeId ||
                    !groupsInCategory.has(member.groupId),
                ),
            },
          },
          `Connector removed from category: ${action.payload.connectorTypeId}`,
        ),
        statusMessage: 'Connector removed from category',
        importError: null,
      };
    }

    case 'ADD_CONNECTOR_GROUP': {
      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              connectorCompatibilityGroups: [
                ...state.project.settings.connectorCompatibilityGroups,
                action.payload,
              ],
            },
          },
          `Connector group added: ${action.payload.name}`,
        ),
        statusMessage: 'Connector group added',
        importError: null,
      };
    }

    case 'UPDATE_CONNECTOR_GROUP': {
      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              connectorCompatibilityGroups: state.project.settings.connectorCompatibilityGroups.map(
                (group) => (group.id === action.payload.id ? { ...group, ...action.payload.updates } : group),
              ),
            },
          },
          `Connector group updated: ${action.payload.id}`,
        ),
        statusMessage: 'Connector group updated',
        importError: null,
      };
    }

    case 'ADD_CONNECTOR_GROUP_MEMBER': {
      const alreadyMember = state.project.settings.connectorCompatibilityGroupMembers.some(
        (member) =>
          member.groupId === action.payload.groupId &&
          member.connectorTypeId === action.payload.connectorTypeId,
      );

      if (alreadyMember) {
        return {
          ...state,
          statusMessage: 'Connector already belongs to group',
          importError: null,
        };
      }

      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              connectorCompatibilityGroupMembers: [
                ...state.project.settings.connectorCompatibilityGroupMembers,
                action.payload,
              ],
            },
          },
          `Connector added to group: ${action.payload.connectorTypeId}`,
        ),
        statusMessage: 'Connector added to group',
        importError: null,
      };
    }

    case 'REMOVE_CONNECTOR_GROUP_MEMBER': {
      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              connectorCompatibilityGroupMembers:
                state.project.settings.connectorCompatibilityGroupMembers.filter(
                  (member) =>
                    member.groupId !== action.payload.groupId ||
                    member.connectorTypeId !== action.payload.connectorTypeId,
                ),
            },
          },
          `Connector removed from group: ${action.payload.connectorTypeId}`,
        ),
        statusMessage: 'Connector removed from group',
        importError: null,
      };
    }

    case 'ADD_CONNECTOR_TYPE': {
      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              connectorTypes: [...state.project.settings.connectorTypes, action.payload],
            },
          },
          `Connector type added: ${action.payload.name}`,
        ),
        statusMessage: 'Connector type added',
        importError: null,
      };
    }

    case 'UPDATE_CONNECTOR_TYPE': {
      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              connectorTypes: state.project.settings.connectorTypes.map((connectorType) =>
                connectorType.id === action.payload.id
                  ? { ...connectorType, ...action.payload.updates }
                  : connectorType,
              ),
            },
          },
          `Connector type updated: ${action.payload.id}`,
        ),
        statusMessage: 'Connector type updated',
        importError: null,
      };
    }

    case 'ADD_CABLE_PREFIX': {
      return {
        project: stampProject(
          {
            ...state.project,
            settings: {
              ...state.project.settings,
              cablePrefixes: [...state.project.settings.cablePrefixes, action.payload],
            },
            numberingLedgers: state.project.numberingLedgers.some(
              (ledger) => ledger.prefix === action.payload.prefix,
            )
              ? state.project.numberingLedgers
              : [
                  ...state.project.numberingLedgers,
                  { prefix: action.payload.prefix, nextSuggested: 1, ranges: [] },
                ],
          },
          `Cable prefix added: ${action.payload.prefix}`,
        ),
        statusMessage: 'Cable prefix added',
        importError: null,
      };
    }

    case 'ADD_LOCATION': {
      return {
        project: stampProject(
          {
            ...state.project,
            locations: [...state.project.locations, action.payload],
          },
          `Location created: ${action.payload.name}`,
        ),
        statusMessage: 'Location created',
        importError: null,
      };
    }

    case 'UPDATE_LOCATION': {
      return {
        project: stampProject(
          {
            ...state.project,
            locations: state.project.locations.map((location) =>
              location.id === action.payload.id ? { ...location, ...action.payload.updates } : location,
            ),
          },
          `Location updated: ${action.payload.id}`,
        ),
        statusMessage: 'Location updated',
        importError: null,
      };
    }

    case 'ADD_RACK': {
      return {
        project: stampProject(
          {
            ...state.project,
            racks: [...state.project.racks, action.payload],
          },
          `Rack created: ${action.payload.name}`,
        ),
        statusMessage: 'Rack created',
        importError: null,
      };
    }

    case 'UPDATE_RACK': {
      return {
        project: stampProject(
          {
            ...state.project,
            racks: state.project.racks.map((rack) =>
              rack.id === action.payload.id ? { ...rack, ...action.payload.updates } : rack,
            ),
          },
          `Rack updated: ${action.payload.id}`,
        ),
        statusMessage: 'Rack updated',
        importError: null,
      };
    }

    case 'ADD_DEVICE': {
      const result = createDeviceInProject(state.project, action.payload);

      if (!result.ok) {
        return {
          ...state,
          statusMessage: result.error,
          importError: null,
        };
      }

      return {
        project: stampProject(result.project, `Device created: ${action.payload.device.name}`),
        statusMessage: 'Device created',
        importError: null,
      };
    }

    case 'ADD_TERMINAL_BLOCK': {
      const result = createTerminalBlockInProject(state.project, action.payload.terminalBlock);

      if (!result.ok) {
        return {
          ...state,
          statusMessage: result.error,
          importError: null,
        };
      }

      return {
        project: stampProject(result.project, `Terminal block created: ${action.payload.terminalBlock.name}`),
        statusMessage: 'Terminal block created',
        importError: null,
      };
    }

    case 'CONNECT_PORTS': {
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
        project: stampProject(result.project, result.message),
        statusMessage: result.message,
        importError: null,
      };
    }

    case 'DISCONNECT_PORT': {
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
        project: stampProject(result.project, result.message),
        statusMessage: result.message,
        importError: null,
      };
    }

    case 'UPDATE_DEVICE': {
      const currentDevice = state.project.devices.find((device) => device.id === action.payload.id);

      if (currentDevice?.status === 'retired') {
        return {
          ...state,
          statusMessage: 'Device update blocked: retired objects are immutable',
          importError: null,
        };
      }

      return {
        project: stampProject(
          {
            ...state.project,
            devices: state.project.devices.map((device) => {
              if (device.id !== action.payload.id) {
                return device;
              }

              const assignedRack = device.rackId
                ? state.project.racks.find((rack) => rack.id === device.rackId)
                : null;
              const locationId =
                device.mountType === 'rack'
                  ? (assignedRack?.locationId ?? device.locationId)
                  : action.payload.updates.locationId;

              return {
                ...device,
                name: action.payload.updates.name,
                ...(device.kind === 'terminal_block'
                  ? {}
                  : {
                      manufacturer: action.payload.updates.manufacturer ?? '',
                      model: action.payload.updates.model ?? '',
                      role: action.payload.updates.role ?? '',
                    }),
                notes: action.payload.updates.notes,
                locationId,
                rackSizeRu:
                  device.kind === 'terminal_block' ? 1 : (action.payload.updates.rackSizeRu ?? null),
                updatedAt: nowIso(),
              };
            }),
          },
          `Device updated: ${action.payload.id}`,
        ),
        statusMessage: 'Device updated',
        importError: null,
      };
    }

    case 'MOVE_MOUNTED_DEVICE': {
      const currentDevice = state.project.devices.find((device) => device.id === action.payload.deviceId);

      if (currentDevice?.status === 'retired') {
        return {
          ...state,
          statusMessage: 'Device move blocked: retired objects are immutable',
          importError: null,
        };
      }

      const placement = validateRackPlacement(state.project, action.payload);

      if (!placement.ok) {
        return {
          ...state,
          statusMessage: `Device move blocked: ${placement.message}`,
          importError: null,
        };
      }

      return {
        project: stampProject(
          {
            ...state.project,
            devices: state.project.devices.map((device) =>
              device.id === action.payload.deviceId
                ? {
                    ...device,
                    mountType: 'rack',
                    rackId: placement.targetRack.id,
                    locationId: placement.targetRack.locationId,
                    rackBottomRu: placement.targetBottomRu,
                    updatedAt: nowIso(),
                  }
                : device,
            ),
          },
          `Device moved: ${placement.device.name} to ${placement.targetRack.name} RU ${placement.targetBottomRu}`,
        ),
        statusMessage: `${placement.device.name} moved to ${placement.targetRack.name} RU ${placement.targetBottomRu}`,
        importError: null,
      };
    }

    case 'DELETE_LOCATION': {
      const hasRacks = state.project.racks.some((rack) => rack.locationId === action.payload.id);
      const hasDevices = state.project.devices.some((device) => device.locationId === action.payload.id);

      if (hasRacks || hasDevices) {
        return {
          ...state,
          statusMessage: 'Location deletion blocked: remove racks and devices first',
        };
      }

      return {
        project: stampProject(
          {
            ...state.project,
            locations: state.project.locations.filter((location) => location.id !== action.payload.id),
          },
          `Location deleted: ${action.payload.id}`,
        ),
        statusMessage: 'Location deleted',
        importError: null,
      };
    }

    case 'DELETE_RACK': {
      const hasDevices = state.project.devices.some((device) => device.rackId === action.payload.id);

      if (hasDevices) {
        return {
          ...state,
          statusMessage: 'Rack deletion blocked: unassign devices first',
        };
      }

      return {
        project: stampProject(
          {
            ...state.project,
            racks: state.project.racks.filter((rack) => rack.id !== action.payload.id),
          },
          `Rack deleted: ${action.payload.id}`,
        ),
        statusMessage: 'Rack deleted',
        importError: null,
      };
    }

    case 'RETIRE_DEVICE': {
      const devicePortGroups = state.project.portGroups.filter(
        (portGroup) => portGroup.deviceId === action.payload.id,
      );
      const rangeIds = new Set(
        devicePortGroups.map((portGroup) => portGroup.numberingRangeId).filter(Boolean),
      );
      const portIds = new Set(
        state.project.ports.filter((port) => port.deviceId === action.payload.id).map((port) => port.id),
      );

      return {
        project: stampProject(
          {
            ...state.project,
            devices: state.project.devices.map((device) =>
              device.id === action.payload.id
                ? { ...device, status: 'retired', updatedAt: nowIso() }
                : device,
            ),
            cables: state.project.cables.map((cable) =>
              (cable.sideAEndpoint.id && portIds.has(cable.sideAEndpoint.id)) ||
              (cable.sideBEndpoint.id && portIds.has(cable.sideBEndpoint.id))
                ? { ...cable, status: 'retired' }
                : cable,
            ),
            numberingLedgers: state.project.numberingLedgers.map((ledger) => ({
              ...ledger,
              ranges: ledger.ranges.map((range) =>
                rangeIds.has(range.id) ? { ...range, status: 'retired' } : range,
              ),
            })),
          },
          `Device retired: ${action.payload.id}`,
        ),
        statusMessage: 'Device retired; cable numbers remain unavailable',
        importError: null,
      };
    }

    case 'VALIDATE_PROJECT': {
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
        ),
        statusMessage:
          validationIssues.length === 0
            ? 'Validation passed'
            : `Validation found ${validationIssues.length} issue(s)`,
        importError: null,
      };
    }

    case 'DISMISS_IMPORT_ERROR': {
      return {
        ...state,
        importError: null,
      };
    }
  }
}

function createNewProject(): ProjectRoot {
  const timestamp = nowIso();

  return createEmptyProject({
    id: makeUniqueId('project', 'untitled'),
    name: 'Untitled Project',
    revision: '0.1',
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: 'local',
    updatedBy: 'local',
  });
}

function stampProject(project: ProjectRoot, message: string): ProjectRoot {
  const timestamp = nowIso();

  return {
    ...project,
    project: {
      ...project.project,
      updatedAt: timestamp,
      updatedBy: 'local',
    },
    changeLog: [...project.changeLog, createChangeLogEntry(message, timestamp)],
  };
}

function createChangeLogEntry(message: string, timestamp: string): ChangeLogEntry {
  return {
    id: makeId('change', `${timestamp}-${message}`),
    timestamp,
    message,
    author: 'local',
  };
}
