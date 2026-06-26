import { stampProject } from '../projectStamping';
import type { ProjectState } from '../projectTypes';
import { createDeviceInProject, createTerminalBlockInProject } from '../projectDeviceCommands';
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

export function handleRetireDevice(
  state: ProjectState,
  action: ActionOf<'RETIRE_DEVICE'>,
  context: ProjectHandlerContext,
): ProjectState {
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
            ? { ...device, status: 'retired', updatedAt: context.dependencies.nowIso() }
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
      context.dependencies,
    ),
    statusMessage: 'Device retired; cable numbers remain unavailable',
    importError: null,
  };
}
