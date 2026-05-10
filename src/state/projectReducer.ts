import { allocateCableRange } from '../domain/cableNumbers';
import { makeId, makeIndexedId, nowIso } from '../domain/id';
import { createLinkedPlannedCablesForPorts } from '../domain/plannedCables';
import { createEmptyProject } from '../domain/projectFactory';
import { validateRackPlacement } from '../domain/rackPlacement';
import { sampleProject } from '../domain/sampleProject';
import { STUDIOWIRE_SCHEMA_VERSION } from '../domain/types';
import { validateProject } from '../domain/validators';
import type {
  CablePrefix,
  Category,
  Cable,
  ChangeLogEntry,
  ConnectorType,
  Device,
  Location,
  Port,
  PortDirection,
  PortGroup,
  ProjectInfo,
  ProjectRoot,
  Rack,
} from '../domain/types';

export interface ProjectState {
  project: ProjectRoot;
  statusMessage: string;
  importError: string | null;
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

export type DeviceUpdate = Pick<
  Device,
  'name' | 'manufacturer' | 'model' | 'role' | 'notes' | 'locationId' | 'rackSizeRu'
>;

export type ProjectAction =
  | { type: 'NEW_PROJECT' }
  | { type: 'LOAD_SAMPLE_PROJECT' }
  | { type: 'IMPORT_PROJECT_JSON'; payload: unknown }
  | { type: 'UPDATE_PROJECT_INFO'; payload: Pick<ProjectInfo, 'name' | 'customer' | 'revision'> }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: { id: string; updates: Pick<Category, 'name' | 'defaultCablePrefix'> } }
  | { type: 'ADD_CONNECTOR_TYPE'; payload: ConnectorType }
  | { type: 'UPDATE_CONNECTOR_TYPE'; payload: { id: string; updates: Pick<ConnectorType, 'name'> } }
  | { type: 'ADD_CABLE_PREFIX'; payload: CablePrefix }
  | { type: 'ADD_LOCATION'; payload: Location }
  | { type: 'UPDATE_LOCATION'; payload: { id: string; updates: Pick<Location, 'name' | 'type' | 'description'> } }
  | { type: 'ADD_RACK'; payload: Rack }
  | { type: 'UPDATE_RACK'; payload: { id: string; updates: Pick<Rack, 'name' | 'heightRu' | 'numberingDirection'> } }
  | { type: 'ADD_DEVICE'; payload: { device: DeviceDraft; portGroups: DevicePortGroupDraft[] } }
  | { type: 'UPDATE_DEVICE'; payload: { id: string; updates: DeviceUpdate } }
  | { type: 'MOVE_MOUNTED_DEVICE'; payload: { deviceId: string; targetRackId: string; targetBottomRu: number } }
  | { type: 'DELETE_LOCATION'; payload: { id: string } }
  | { type: 'DELETE_RACK'; payload: { id: string } }
  | { type: 'RETIRE_DEVICE'; payload: { id: string } }
  | { type: 'VALIDATE_PROJECT' }
  | { type: 'DISMISS_IMPORT_ERROR' };

const REQUIRED_ARRAY_FIELDS = [
  'locations',
  'racks',
  'devices',
  'terminalBlocks',
  'portGroups',
  'terminalBlockPortGroups',
  'ports',
  'terminalBlockPorts',
  'cables',
  'numberingLedgers',
  'validationIssues',
  'changeLog',
] as const;

const LEGACY_SCHEMA_VERSIONS = ['0.1.0'] as const;
const LEGACY_ARRAY_FIELDS = REQUIRED_ARRAY_FIELDS.filter(
  (field) => !['terminalBlocks', 'terminalBlockPortGroups', 'terminalBlockPorts'].includes(field),
);

export function createInitialProjectState(): ProjectState {
  return {
    project: createNewProject(),
    statusMessage: 'New project ready',
    importError: null,
  };
}

export function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'NEW_PROJECT': {
      return {
        project: createNewProject(),
        statusMessage: 'New project created',
        importError: null,
      };
    }

    case 'LOAD_SAMPLE_PROJECT': {
      return {
        project: stampProject(structuredClone(sampleProject), 'Sample project loaded'),
        statusMessage: 'Sample project loaded',
        importError: null,
      };
    }

    case 'IMPORT_PROJECT_JSON': {
      const result = parseImportedProject(action.payload);

      if (!result.ok) {
        return {
          ...state,
          statusMessage: 'Import failed',
          importError: result.error,
        };
      }

      const validationIssues = validateProject(result.project);

      return {
        project: stampProject(
          {
            ...result.project,
            validationIssues,
          },
          `Project imported from JSON with ${validationIssues.length} validation issue(s)`,
        ),
        statusMessage: `Project imported; ${validationIssues.length} validation issue(s) found`,
        importError: null,
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

    case 'UPDATE_DEVICE': {
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
                  ? assignedRack?.locationId ?? device.locationId
                  : action.payload.updates.locationId;

              return {
                ...device,
                name: action.payload.updates.name,
                manufacturer: action.payload.updates.manufacturer,
                model: action.payload.updates.model,
                role: action.payload.updates.role,
                notes: action.payload.updates.notes,
                locationId,
                rackSizeRu: action.payload.updates.rackSizeRu ?? null,
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
      const rangeIds = new Set(devicePortGroups.map((portGroup) => portGroup.numberingRangeId).filter(Boolean));
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
              (cable.sourceEndpoint.id && portIds.has(cable.sourceEndpoint.id)) ||
              (cable.destinationEndpoint.id && portIds.has(cable.destinationEndpoint.id))
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

function createDeviceInProject(
  project: ProjectRoot,
  payload: { device: DeviceDraft; portGroups: DevicePortGroupDraft[] },
): { ok: true; project: ProjectRoot } | { ok: false; error: string } {
  const timestamp = nowIso();
  const deviceId = payload.device.id ?? makeId('device', `${payload.device.code || payload.device.name}-${timestamp}`);
  const labelPrefix = payload.device.labelPrefix || payload.device.code || payload.device.name;
  const device: Device = {
    id: deviceId,
    name: payload.device.name,
    code: payload.device.code,
    manufacturer: payload.device.manufacturer,
    model: payload.device.model,
    categoryId: payload.device.categoryId,
    locationId: payload.device.locationId,
    role: payload.device.role,
    labelPrefix,
    mountType: payload.device.mountType,
    rackId: payload.device.mountType === 'rack' ? payload.device.rackId : null,
    rackSizeRu: payload.device.mountType === 'rack' ? payload.device.rackSizeRu : null,
    rackBottomRu: payload.device.mountType === 'rack' ? payload.device.rackBottomRu : null,
    status: 'planned',
    notes: payload.device.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  let nextProject: ProjectRoot = {
    ...project,
    devices: [...project.devices, device],
  };
  const newPortGroups: PortGroup[] = [];
  const newPorts: Port[] = [];
  const newCables: Cable[] = [];

  for (let groupIndex = 0; groupIndex < payload.portGroups.length; groupIndex += 1) {
    const draft = payload.portGroups[groupIndex];
    const portGroupId = makeId('port-group', `${deviceId}-${draft.name}-${groupIndex + 1}`);
    const createPlannedCables = draft.createPlannedCables;
    const firstCableNumber = createPlannedCables ? draft.firstCableNumber : null;
    const lastCableNumber =
      createPlannedCables && firstCableNumber !== null && draft.count > 0
        ? firstCableNumber + draft.count - 1
        : null;
    let numberingRangeId: string | null = null;

    if (createPlannedCables && firstCableNumber === null) {
      return {
        ok: false,
        error: `Device creation blocked: missing first cable number for ${draft.name}.`,
      };
    }

    if (createPlannedCables && firstCableNumber !== null) {
      const allocation = allocateCableRange(nextProject, {
        prefix: draft.cablePrefix,
        firstCableNumber,
        count: draft.count,
        ownerType: 'portGroup',
        ownerId: portGroupId,
        reason: `Planned cables for ${device.name} ${draft.name}`,
      });

      if (allocation.preview.errors.length > 0 || !allocation.allocatedRange) {
        return {
          ok: false,
          error: `Device creation blocked: cable allocation failed for ${draft.name}.`,
        };
      }

      nextProject = allocation.project;
      numberingRangeId = allocation.allocatedRange.id;
    }

    const groupPorts = createPortsForDraft({
      device,
      portGroupId,
      draft,
      labelPrefix,
    });

    if (createPlannedCables && firstCableNumber !== null) {
      if (!numberingRangeId) {
        return {
          ok: false,
          error: `Device creation blocked: no allocated cable range for ${draft.name}.`,
        };
      }
      const linked = createLinkedPlannedCablesForPorts(groupPorts, draft.cablePrefix, firstCableNumber);

      if (linked.cables.length !== groupPorts.length || linked.ports.some((port) => !port.plannedCableId)) {
        return {
          ok: false,
          error: `Device creation blocked: planned cable creation failed for ${draft.name}.`,
        };
      }

      groupPorts.splice(0, groupPorts.length, ...linked.ports);
      newCables.push(...linked.cables);
    }

    newPortGroups.push({
      id: portGroupId,
      deviceId,
      name: draft.name,
      direction: draft.direction,
      categoryId: draft.categoryId,
      connectorTypeId: draft.connectorTypeId,
      count: draft.count,
      portLabelPattern: draft.portLabelPattern,
      cablePrefix: draft.cablePrefix,
      firstCableNumber,
      lastCableNumber,
      numberingRangeId,
      createPlannedCables,
      locked: true,
    });
    newPorts.push(...groupPorts);
  }

  return {
    ok: true,
    project: {
      ...nextProject,
      portGroups: [...nextProject.portGroups, ...newPortGroups],
      ports: [...nextProject.ports, ...newPorts],
      cables: [...nextProject.cables, ...newCables],
    },
  };
}

function createPortsForDraft({
  device,
  portGroupId,
  draft,
  labelPrefix,
}: {
  device: Device;
  portGroupId: string;
  draft: DevicePortGroupDraft;
  labelPrefix: string;
}): Port[] {
  return Array.from({ length: Math.max(0, draft.count) }, (_, offset) => {
    const index = offset + 1;

    return {
      id: makeIndexedId(`${portGroupId}-port`, index),
      deviceId: device.id,
      portGroupId,
      index,
      name: `${draft.name} ${index}`,
      label: formatPortLabel(draft.portLabelPattern, labelPrefix, index),
      direction: draft.direction,
      categoryId: draft.categoryId,
      connectorTypeId: draft.connectorTypeId,
      plannedCableId: null,
      notes: '',
    };
  });
}

function formatPortLabel(pattern: string, deviceLabelPrefix: string, index: number): string {
  return pattern
    .split('{DEVICE}')
    .join(deviceLabelPrefix)
    .split('{000}')
    .join(String(index).padStart(3, '0'));
}

export function parseImportedProject(payload: unknown):
  | { ok: true; project: ProjectRoot }
  | { ok: false; error: string } {
  if (!isRecord(payload)) {
    return { ok: false, error: 'Imported JSON must be an object.' };
  }

  const isCurrentSchema = payload.schemaVersion === STUDIOWIRE_SCHEMA_VERSION;
  const isLegacySchema = LEGACY_SCHEMA_VERSIONS.includes(payload.schemaVersion as '0.1.0');

  if (!isCurrentSchema && !isLegacySchema) {
    return {
      ok: false,
      error: `Unsupported schemaVersion. Expected ${STUDIOWIRE_SCHEMA_VERSION} or legacy 0.1.0.`,
    };
  }

  if (!isRecord(payload.project)) {
    return { ok: false, error: 'Imported JSON is missing project metadata.' };
  }

  if (!isRecord(payload.settings)) {
    return { ok: false, error: 'Imported JSON is missing settings.' };
  }

  for (const field of isLegacySchema ? LEGACY_ARRAY_FIELDS : REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(payload[field])) {
      return { ok: false, error: `Imported JSON field "${field}" must be an array.` };
    }
  }

  const project = payload.project;

  if (
    typeof project.id !== 'string' ||
    typeof project.name !== 'string' ||
    typeof project.customer !== 'string' ||
    typeof project.revision !== 'string' ||
    typeof project.status !== 'string' ||
    typeof project.createdAt !== 'string' ||
    typeof project.updatedAt !== 'string' ||
    typeof project.createdBy !== 'string' ||
    typeof project.updatedBy !== 'string'
  ) {
    return { ok: false, error: 'Imported project metadata has invalid required fields.' };
  }

  if (!Array.isArray(payload.settings.categories) || !Array.isArray(payload.settings.connectorTypes)) {
    return { ok: false, error: 'Imported settings must include categories and connectorTypes arrays.' };
  }

  if (!Array.isArray(payload.settings.cablePrefixes) || !isRecord(payload.settings.rackDefaults)) {
    return { ok: false, error: 'Imported settings must include cablePrefixes and rackDefaults.' };
  }

  const normalizedProject = normalizeImportedProject(payload, isLegacySchema);

  for (const field of REQUIRED_ARRAY_FIELDS) {
    const entries = normalizedProject[field];

    if (!Array.isArray(entries) || entries.some((item: unknown) => !isRecord(item))) {
      return { ok: false, error: `Imported JSON field "${field}" contains malformed entries.` };
    }
  }

  return {
    ok: true,
    project: normalizedProject,
  };
}

function normalizeImportedProject(payload: Record<string, unknown>, isLegacySchema: boolean): ProjectRoot {
  return {
    ...(payload as unknown as ProjectRoot),
    schemaVersion: STUDIOWIRE_SCHEMA_VERSION,
    terminalBlocks: isLegacySchema ? [] : ((payload.terminalBlocks as ProjectRoot['terminalBlocks']) ?? []),
    terminalBlockPortGroups: isLegacySchema
      ? []
      : ((payload.terminalBlockPortGroups as ProjectRoot['terminalBlockPortGroups']) ?? []),
    terminalBlockPorts: isLegacySchema ? [] : ((payload.terminalBlockPorts as ProjectRoot['terminalBlockPorts']) ?? []),
  };
}

function createNewProject(): ProjectRoot {
  const timestamp = nowIso();

  return createEmptyProject({
    id: makeId('project', `untitled-${timestamp}`),
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
