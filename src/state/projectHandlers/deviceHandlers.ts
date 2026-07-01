import { stampProject } from '../projectStamping';
import type { ProjectState } from '../projectTypes';
import { createDeviceInProject, createTerminalBlockInProject } from '../projectDeviceCommands';
import { deleteNormalDeviceFromProject } from '../../domain/deviceDeletion';
import type { ActionOf, ProjectHandlerContext } from './shared';

export function handleAddDevice(
  state: ProjectState,
  action: ActionOf<'ADD_DEVICE'>,
  context: ProjectHandlerContext,
): ProjectState {
  const result = createDeviceInProject(state.project, action.payload);

  if (!result.ok) {
    return {
      ...state,
      statusMessage: result.error,
      importError: null,
    };
  }

  return {
    project: stampProject(
      result.project,
      `Device created: ${action.payload.device.name}`,
      context.dependencies,
    ),
    statusMessage: 'Device created',
    importError: null,
  };
}

export function handleAddTerminalBlock(
  state: ProjectState,
  action: ActionOf<'ADD_TERMINAL_BLOCK'>,
  context: ProjectHandlerContext,
): ProjectState {
  const result = createTerminalBlockInProject(state.project, action.payload.terminalBlock);

  if (!result.ok) {
    return {
      ...state,
      statusMessage: result.error,
      importError: null,
    };
  }

  return {
    project: stampProject(
      result.project,
      `Terminal block created: ${action.payload.terminalBlock.name}`,
      context.dependencies,
    ),
    statusMessage: 'Terminal block created',
    importError: null,
  };
}

export function handleUpdateDevice(
  state: ProjectState,
  action: ActionOf<'UPDATE_DEVICE'>,
  context: ProjectHandlerContext,
): ProjectState {
  const currentDevice = state.project.devices.find((device) => device.id === action.payload.id);

  if (!currentDevice) {
    return {
      ...state,
      statusMessage: 'Device update blocked: selected device no longer exists',
      importError: null,
    };
  }

  if (currentDevice.kind !== 'terminal_block') {
    const locationExists = state.project.locations.some(
      (location) => location.id === action.payload.updates.locationId,
    );

    if (!locationExists) {
      return {
        ...state,
        statusMessage: 'Device update blocked: select a valid location',
        importError: null,
      };
    }
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
            rackSizeRu: device.kind === 'terminal_block' ? 1 : (action.payload.updates.rackSizeRu ?? null),
            updatedAt: context.dependencies.nowIso(),
          };
        }),
      },
      `Device updated: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Device updated',
    importError: null,
  };
}

export function handleDeleteDevice(
  state: ProjectState,
  action: ActionOf<'DELETE_DEVICE'>,
  context: ProjectHandlerContext,
): ProjectState {
  const result = deleteNormalDeviceFromProject(state.project, action.payload.id);

  if (!result.ok) {
    return {
      ...state,
      statusMessage: result.error,
      importError: null,
    };
  }

  return {
    project: stampProject(
      result.project,
      `Device deleted: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Device deleted; cable numbers released',
    importError: null,
  };
}
