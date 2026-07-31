import { validateRackPlacement } from '../../domain/rackPlacement';
import {
  findLocationNameConflict,
  findProjectItemNameConflict,
  formatProjectItemNameConflict,
} from '../../domain/projectItemNames';
import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import { stampProject } from '../projectStamping';
import type { ProjectState } from '../projectTypes';
import type { ActionOf, ProjectHandlerContext } from './shared';

export function handleAddLocation(
  state: ProjectState,
  action: ActionOf<'ADD_LOCATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  if (findLocationNameConflict(state.project, action.payload.name)) {
    return {
      ...state,
      statusMessage: `Location creation blocked: name "${action.payload.name.trim()}" is already used.`,
      importError: null,
    };
  }

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
  if (findLocationNameConflict(state.project, action.payload.updates.name, action.payload.id)) {
    return {
      ...state,
      statusMessage: `Location update blocked: name "${action.payload.updates.name.trim()}" is already used.`,
      importError: null,
    };
  }

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
  const hasSubLocations = state.project.subLocations.some(
    (subLocation) => subLocation.locationId === action.payload.id,
  );

  if (hasRacks || hasDevices || hasSubLocations) {
    return {
      ...state,
      statusMessage: 'Location deletion blocked: remove folders, racks, and devices first',
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

export function handleAddSubLocation(
  state: ProjectState,
  action: ActionOf<'ADD_SUB_LOCATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  const locationExists = state.project.locations.some(
    (location) => location.id === action.payload.locationId,
  );

  if (!locationExists) {
    return {
      ...state,
      statusMessage: 'Folder creation blocked: select a valid location',
      importError: null,
    };
  }

  if (!action.payload.name.trim()) {
    return {
      ...state,
      statusMessage: 'Folder creation blocked: name is required',
      importError: null,
    };
  }

  const nameConflict = findProjectItemNameConflict(state.project, action.payload.name);

  if (nameConflict) {
    return {
      ...state,
      statusMessage: `Folder creation blocked: ${formatProjectItemNameConflict(nameConflict)}`,
      importError: null,
    };
  }

  return {
    project: stampProject(
      {
        ...state.project,
        subLocations: [...state.project.subLocations, action.payload],
      },
      `Folder created: ${action.payload.name}`,
      context.dependencies,
    ),
    statusMessage: 'Folder created',
    importError: null,
  };
}

export function handleUpdateSubLocation(
  state: ProjectState,
  action: ActionOf<'UPDATE_SUB_LOCATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  if (!action.payload.updates.name.trim()) {
    return {
      ...state,
      statusMessage: 'Folder update blocked: name is required',
      importError: null,
    };
  }

  const nameConflict = findProjectItemNameConflict(state.project, action.payload.updates.name, {
    id: action.payload.id,
    type: 'folder',
  });

  if (nameConflict) {
    return {
      ...state,
      statusMessage: `Folder update blocked: ${formatProjectItemNameConflict(nameConflict)}`,
      importError: null,
    };
  }

  return {
    project: stampProject(
      {
        ...state.project,
        subLocations: state.project.subLocations.map((subLocation) =>
          subLocation.id === action.payload.id ? { ...subLocation, ...action.payload.updates } : subLocation,
        ),
      },
      `Folder updated: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Folder updated',
    importError: null,
  };
}

export function handleDeleteSubLocation(
  state: ProjectState,
  action: ActionOf<'DELETE_SUB_LOCATION'>,
  context: ProjectHandlerContext,
): ProjectState {
  const hasRacks = state.project.racks.some((rack) => rack.subLocationId === action.payload.id);
  const hasDevices = state.project.devices.some((device) => device.subLocationId === action.payload.id);

  if (hasRacks || hasDevices) {
    return {
      ...state,
      statusMessage: 'Folder deletion blocked: move all racks, devices, and TBs out first',
      importError: null,
    };
  }

  return {
    project: stampProject(
      {
        ...state.project,
        subLocations: state.project.subLocations.filter(
          (subLocation) => subLocation.id !== action.payload.id,
        ),
      },
      `Folder deleted: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Folder deleted',
    importError: null,
  };
}

export function handleAddRack(
  state: ProjectState,
  action: ActionOf<'ADD_RACK'>,
  context: ProjectHandlerContext,
): ProjectState {
  const nameConflict = findProjectItemNameConflict(state.project, action.payload.name);

  if (nameConflict) {
    return {
      ...state,
      statusMessage: `Rack creation blocked: ${formatProjectItemNameConflict(nameConflict)}`,
      importError: null,
    };
  }

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
  const nameConflict = findProjectItemNameConflict(state.project, action.payload.updates.name, {
    id: action.payload.id,
    type: 'rack',
  });

  if (nameConflict) {
    return {
      ...state,
      statusMessage: `Rack update blocked: ${formatProjectItemNameConflict(nameConflict)}`,
      importError: null,
    };
  }

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
                subLocationId: normalizeSubLocationForLocation(
                  state.project,
                  device.subLocationId,
                  placement.targetRack.locationId,
                ),
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

export function handleMoveNavigatorItemToFolder(
  state: ProjectState,
  action: ActionOf<'MOVE_NAVIGATOR_ITEM_TO_FOLDER'>,
  context: ProjectHandlerContext,
): ProjectState {
  const targetLocation = state.project.locations.find(
    (location) => location.id === action.payload.targetLocationId,
  );

  if (!targetLocation) {
    return {
      ...state,
      statusMessage: 'Move blocked: target location no longer exists',
      importError: null,
    };
  }

  const targetFolder = action.payload.targetFolderId
    ? state.project.subLocations.find((candidate) => candidate.id === action.payload.targetFolderId)
    : null;

  if (action.payload.targetFolderId && !targetFolder) {
    return {
      ...state,
      statusMessage: 'Move blocked: target folder no longer exists',
      importError: null,
    };
  }

  if (targetFolder && targetFolder.locationId !== targetLocation.id) {
    return {
      ...state,
      statusMessage: 'Move blocked: target folder is not inside the target location',
      importError: null,
    };
  }

  if (action.payload.itemType === 'device') {
    const device = state.project.devices.find((candidate) => candidate.id === action.payload.itemId);

    if (!device) {
      return {
        ...state,
        statusMessage: 'Move blocked: selected device no longer exists',
        importError: null,
      };
    }

    const assignedRack = device.rackId ? state.project.racks.find((rack) => rack.id === device.rackId) : null;

    if (assignedRack && assignedRack.locationId !== targetLocation.id) {
      return {
        ...state,
        statusMessage: 'Move blocked: item is assigned to a rack in this location; release it first.',
        importError: null,
      };
    }

    return {
      project: stampProject(
        {
          ...state.project,
          devices: state.project.devices.map((candidate) =>
            candidate.id === device.id
              ? {
                  ...candidate,
                  locationId: targetLocation.id,
                  subLocationId: targetFolder?.id ?? null,
                  updatedAt: context.dependencies.nowIso(),
                }
              : candidate,
          ),
        },
        `Navigator item moved to folder: ${device.name} -> ${targetFolder?.name ?? targetLocation.name}`,
        context.dependencies,
      ),
      statusMessage: `${device.name} moved to ${targetFolder?.name ?? targetLocation.name}`,
      importError: null,
    };
  }

  const rack = state.project.racks.find((candidate) => candidate.id === action.payload.itemId);

  if (!rack) {
    return {
      ...state,
      statusMessage: 'Move blocked: selected rack no longer exists',
      importError: null,
    };
  }

  const mountedDevices = state.project.devices.filter((device) => device.rackId === rack.id);
  const locationChanged = rack.locationId !== targetLocation.id;

  if (locationChanged && mountedDevices.length > 0) {
    return {
      ...state,
      statusMessage: 'Move blocked: rack has mounted devices; unassign them first.',
      importError: null,
    };
  }

  return {
    project: stampProject(
      {
        ...state.project,
        racks: state.project.racks.map((candidate) =>
          candidate.id === rack.id
            ? {
                ...candidate,
                locationId: targetLocation.id,
                subLocationId: targetFolder?.id ?? null,
              }
            : candidate,
        ),
        devices: state.project.devices.map((device) =>
          device.rackId === rack.id
            ? {
                ...device,
                locationId: targetLocation.id,
                subLocationId: locationChanged
                  ? normalizeSubLocationForLocation(state.project, device.subLocationId, targetLocation.id)
                  : device.subLocationId,
                updatedAt: context.dependencies.nowIso(),
              }
            : device,
        ),
      },
      `Rack moved to folder: ${rack.name} -> ${targetFolder?.name ?? targetLocation.name}`,
      context.dependencies,
    ),
    statusMessage:
      mountedDevices.length > 0
        ? `${rack.name} moved to ${targetFolder?.name ?? targetLocation.name}; ${mountedDevices.length} mounted item(s) updated`
        : `${rack.name} moved to ${targetFolder?.name ?? targetLocation.name}`,
    importError: null,
  };
}

export function handleUnassignDeviceFromRack(
  state: ProjectState,
  action: ActionOf<'UNASSIGN_DEVICE_FROM_RACK'>,
  context: ProjectHandlerContext,
): ProjectState {
  const device = state.project.devices.find((candidate) => candidate.id === action.payload.deviceId);

  if (!device) {
    return {
      ...state,
      statusMessage: 'Rack unassign blocked: selected device no longer exists',
      importError: null,
    };
  }

  if (device.kind === 'terminal_block') {
    return {
      ...state,
      statusMessage: 'Rack unassign blocked: terminal blocks use the TB workflow',
      importError: null,
    };
  }

  if (device.mountType !== 'rack' || !device.rackId) {
    return {
      ...state,
      statusMessage: 'Rack unassign blocked: device is not rack-mounted',
      importError: null,
    };
  }

  const rack = state.project.racks.find((candidate) => candidate.id === device.rackId);
  const locationId = rack?.locationId ?? device.locationId;

  return {
    project: stampProject(
      {
        ...state.project,
        devices: state.project.devices.map((candidate) =>
          candidate.id === device.id
            ? {
                ...candidate,
                mountType: 'non_rack',
                rackId: null,
                rackBottomRu: null,
                locationId,
                subLocationId: normalizeSubLocationForLocation(
                  state.project,
                  candidate.subLocationId,
                  locationId,
                ),
                updatedAt: context.dependencies.nowIso(),
              }
            : candidate,
        ),
      },
      `Device unassigned from rack: ${device.name}`,
      context.dependencies,
    ),
    statusMessage: `${device.name} unassigned from rack`,
    importError: null,
  };
}
