import { validateRackPlacement } from '../../domain/rackPlacement';
import { stampProject } from '../projectStamping';
import type { ProjectState } from '../projectTypes';
import type { ActionOf, ProjectHandlerContext } from './shared';

export function handleAddLocation(
  state: ProjectState,
  action: ActionOf<'ADD_LOCATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        locations: [...state.project.locations, action.payload],
      },
      `Location created: ${action.payload.name}`,
      context.dependencies,
    ),
    statusMessage: 'Location created',
    importError: null,
  };
}

export function handleUpdateLocation(
  state: ProjectState,
  action: ActionOf<'UPDATE_LOCATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        locations: state.project.locations.map((location) =>
          location.id === action.payload.id ? { ...location, ...action.payload.updates } : location,
        ),
      },
      `Location updated: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Location updated',
    importError: null,
  };
}

export function handleDeleteLocation(
  state: ProjectState,
  action: ActionOf<'DELETE_LOCATION'>,
  context: ProjectHandlerContext,
): ProjectState {
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
      context.dependencies,
    ),
    statusMessage: 'Location deleted',
    importError: null,
  };
}

export function handleAddRack(
  state: ProjectState,
  action: ActionOf<'ADD_RACK'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        racks: [...state.project.racks, action.payload],
      },
      `Rack created: ${action.payload.name}`,
      context.dependencies,
    ),
    statusMessage: 'Rack created',
    importError: null,
  };
}

export function handleUpdateRack(
  state: ProjectState,
  action: ActionOf<'UPDATE_RACK'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        racks: state.project.racks.map((rack) =>
          rack.id === action.payload.id ? { ...rack, ...action.payload.updates } : rack,
        ),
      },
      `Rack updated: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Rack updated',
    importError: null,
  };
}

export function handleDeleteRack(
  state: ProjectState,
  action: ActionOf<'DELETE_RACK'>,
  context: ProjectHandlerContext,
): ProjectState {
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
      context.dependencies,
    ),
    statusMessage: 'Rack deleted',
    importError: null,
  };
}

export function handleMoveMountedDevice(
  state: ProjectState,
  action: ActionOf<'MOVE_MOUNTED_DEVICE'>,
  context: ProjectHandlerContext,
): ProjectState {
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
                updatedAt: context.dependencies.nowIso(),
              }
            : device,
        ),
      },
      `Device moved: ${placement.device.name} to ${placement.targetRack.name} RU ${placement.targetBottomRu}`,
      context.dependencies,
    ),
    statusMessage: `${placement.device.name} moved to ${placement.targetRack.name} RU ${placement.targetBottomRu}`,
    importError: null,
  };
}
