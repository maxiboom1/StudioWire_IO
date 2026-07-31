import { stampProject } from '../projectStamping';
import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import type { ProjectState } from '../projectTypes';
import { createDeviceInProject, createTerminalBlockInProject } from '../projectDeviceCommands';
import { editDeviceInProject } from '../projectDeviceEdits';
import { deleteNormalDeviceFromProject, deleteTerminalBlockFromProject } from '../../domain/deviceDeletion';
import { editTerminalBlockInProject } from '../../domain/terminalBlockOperations';
import { findProjectItemNameConflict, formatProjectItemNameConflict } from '../../domain/projectItemNames';
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

  const nameConflict = findProjectItemNameConflict(state.project, action.payload.updates.name, {
    id: currentDevice.id,
    type: currentDevice.kind === 'terminal_block' ? 'terminal block' : 'device',
  });

  if (nameConflict) {
    return {
      ...state,
      statusMessage: `Device update blocked: ${formatProjectItemNameConflict(nameConflict)}`,
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
          const subLocationId = normalizeSubLocationForLocation(
            state.project,
            action.payload.updates.subLocationId ?? device.subLocationId,
            locationId,
          );

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
            subLocationId,
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

export function handleEditDevice(
  state: ProjectState,
  action: ActionOf<'EDIT_DEVICE'>,
  context: ProjectHandlerContext,
): ProjectState {
  const result = editDeviceInProject(state.project, action.payload, context.dependencies.nowIso());

  if (!result.ok) {
    return {
      ...state,
      statusMessage: result.error,
      importError: null,
    };
  }

  return {
    project: stampProject(result.project, `Device edited: ${action.payload.deviceId}`, context.dependencies),
    statusMessage: 'Device edited',
    importError: null,
  };
}

export function handleEditTerminalBlock(
  state: ProjectState,
  action: ActionOf<'EDIT_TERMINAL_BLOCK'>,
  context: ProjectHandlerContext,
): ProjectState {
  const result = editTerminalBlockInProject(state.project, action.payload, context.dependencies.nowIso());

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
      `Terminal block edited: ${action.payload.deviceId}`,
      context.dependencies,
    ),
    statusMessage: 'Terminal block edited',
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
    project: stampProject(result.project, `Device deleted: ${action.payload.id}`, context.dependencies),
    statusMessage: 'Device deleted; cable numbers released',
    importError: null,
  };
}

export function handleDeleteTerminalBlock(
  state: ProjectState,
  action: ActionOf<'DELETE_TERMINAL_BLOCK'>,
  context: ProjectHandlerContext,
): ProjectState {
  const result = deleteTerminalBlockFromProject(state.project, action.payload.id);

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
      `Terminal block deleted: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Terminal block deleted',
    importError: null,
  };
}
