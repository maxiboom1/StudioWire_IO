import { describe, expect, it } from 'vitest';
import { projectReducer, type ProjectState } from '../state/projectReducer';
import { connectPorts } from './connections';
import { deleteTerminalBlockFromProject } from './deviceDeletion';
import { sampleProject } from './sampleProject';
import { editTerminalBlockInProject } from './terminalBlockOperations';
import type { ProjectRoot } from './types';

function createState(project: ProjectRoot = structuredClone(sampleProject)): ProjectState {
  return {
    project,
    statusMessage: 'ready',
    importError: null,
  };
}

function addTerminalBlock(count = 2): ProjectRoot {
  return projectReducer(createState(), {
    type: 'ADD_TERMINAL_BLOCK',
    payload: {
      terminalBlock: {
        id: 'device-tb-operations',
        name: 'TB Operations',
        categoryId: 'category-video',
        locationId: 'location-machine-room',
        labelPrefix: 'TB-OPS',
        rackId: 'rack-mcr-a',
        rackBottomRu: 1,
        connectorTypeId: 'connector-bnc',
        count,
        notes: '',
      },
    },
  }).project;
}

function editInput(count: number) {
  return {
    deviceId: 'device-tb-operations',
    name: 'TB Operations',
    labelPrefix: 'TB-OPS',
    categoryId: 'category-video',
    connectorTypeId: 'connector-bnc',
    count,
    rackId: 'rack-mcr-a',
    rackBottomRu: 1,
    notes: '',
  };
}

describe('terminal block operations', () => {
  it('preserves existing face/index port IDs and appends ports when count increases', () => {
    const project = addTerminalBlock();
    const existingIds = project.ports
      .filter((port) => port.deviceId === 'device-tb-operations')
      .map((port) => port.id);
    const result = editTerminalBlockInProject(project, editInput(3), '2026-07-31T00:00:00.000Z');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const ports = result.project.ports.filter((port) => port.deviceId === 'device-tb-operations');
    expect(ports).toHaveLength(6);
    expect(existingIds.every((id) => ports.some((port) => port.id === id))).toBe(true);
    expect(ports.every((port) => port.plannedCableId === null)).toBe(true);
  });

  it('blocks count reduction while a removed port is connected', () => {
    const project = addTerminalBlock();
    const routerPort = project.ports.find((port) => port.deviceId === 'device-router-1' && port.index === 2);
    const terminalBlockPort = project.ports.find(
      (port) => port.deviceId === 'device-tb-operations' && port.direction === 'rear' && port.index === 2,
    );

    if (!routerPort || !terminalBlockPort) {
      throw new Error('Expected test ports');
    }

    const connected = connectPorts(project, {
      fromPortId: routerPort.id,
      toPortId: terminalBlockPort.id,
    });
    expect(connected.ok).toBe(true);
    if (!connected.ok) {
      return;
    }

    const result = editTerminalBlockInProject(connected.project, editInput(1), '2026-07-31T00:00:00.000Z');

    expect(result).toEqual({
      ok: false,
      error: 'TB edit blocked: disconnect ports above the new connector count first.',
    });
  });

  it('deletes TB topology and restores a surviving device-owned planned cable slot', () => {
    const project = addTerminalBlock(1);
    const routerPort = project.ports.find((port) => port.deviceId === 'device-router-1' && port.index === 1);
    const terminalBlockPort = project.ports.find(
      (port) => port.deviceId === 'device-tb-operations' && port.direction === 'rear' && port.index === 1,
    );

    if (!routerPort || !terminalBlockPort) {
      throw new Error('Expected test ports');
    }

    const connected = connectPorts(project, {
      fromPortId: routerPort.id,
      toPortId: terminalBlockPort.id,
    });
    expect(connected.ok).toBe(true);
    if (!connected.ok) {
      return;
    }

    const deleted = deleteTerminalBlockFromProject(connected.project, 'device-tb-operations');
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) {
      return;
    }

    const cable = deleted.project.cables.find((candidate) => candidate.id === routerPort.plannedCableId);
    expect(deleted.project.devices.some((device) => device.id === 'device-tb-operations')).toBe(false);
    expect(deleted.project.ports.some((port) => port.deviceId === 'device-tb-operations')).toBe(false);
    expect(cable).toMatchObject({
      status: 'planned',
      sideAEndpoint: expect.objectContaining({ id: routerPort.id }),
      sideBEndpoint: expect.objectContaining({ type: 'unknown' }),
    });
  });
});
