import { describe, expect, it } from 'vitest';
import { connectPorts, describePortConnection, disconnectPort } from './connections';
import { sampleProject } from './sampleProject';
import { validateProject } from './validators';
import { projectReducer, type ProjectState } from '../state/projectReducer';
import type { Port, ProjectRoot } from './types';

function createState(project: ProjectRoot = structuredClone(sampleProject)): ProjectState {
  return {
    project,
    statusMessage: 'ready',
    importError: null,
  };
}

function addDevicePort(
  project: ProjectRoot,
  input: {
    id: string;
    labelPrefix: string;
    direction: Port['direction'];
    firstCableNumber: number | null;
    connectorTypeId?: string;
  },
) {
  return projectReducer(createState(project), {
    type: 'ADD_DEVICE',
    payload: {
      device: {
        id: input.id,
        name: input.labelPrefix,
        code: input.labelPrefix,
        manufacturer: '',
        model: '',
        categoryId: 'category-video',
        locationId: 'location-control-room',
        role: '',
        labelPrefix: input.labelPrefix,
        mountType: 'non_rack',
        rackId: null,
        rackSizeRu: null,
        rackBottomRu: null,
        notes: '',
      },
      portGroups: [
        {
          name: input.direction === 'input' ? 'IN' : 'OUT',
          direction: input.direction,
          categoryId: 'category-video',
          connectorTypeId: input.connectorTypeId ?? 'connector-bnc',
          count: 1,
          portLabelPattern: `{DEVICE}-${input.direction === 'input' ? 'IN' : 'OUT'}-{000}`,
          cablePrefix: 'V',
          firstCableNumber: input.firstCableNumber,
          createPlannedCables: input.firstCableNumber !== null,
        },
      ],
    },
  }).project;
}

function addTerminalBlock(project: ProjectRoot, input: { id: string; labelPrefix: string; ru: number }) {
  return projectReducer(createState(project), {
    type: 'ADD_TERMINAL_BLOCK',
    payload: {
      terminalBlock: {
        id: input.id,
        name: input.labelPrefix,
        categoryId: 'category-video',
        locationId: 'location-machine-room',
        labelPrefix: input.labelPrefix,
        rackId: 'rack-mcr-a',
        rackBottomRu: input.ru,
        connectorTypeId: 'connector-bnc',
        count: 1,
        notes: '',
      },
    },
  }).project;
}

function getPort(project: ProjectRoot, deviceId: string, direction: Port['direction']) {
  const port = project.ports.find(
    (candidate) => candidate.deviceId === deviceId && candidate.direction === direction,
  );

  if (!port) {
    throw new Error(`Missing ${deviceId} ${direction} port`);
  }

  return port;
}

function getCableByNumber(project: ProjectRoot, number: string) {
  const cable = project.cables.find((candidate) => candidate.number === number);

  if (!cable) {
    throw new Error(`Missing cable ${number}`);
  }

  return cable;
}

describe('connectPorts', () => {
  it('connects output to input with the lower planned cable winning', () => {
    let project = structuredClone(sampleProject);
    project = addDevicePort(project, {
      id: 'device-switcher',
      labelPrefix: 'SW',
      direction: 'input',
      firstCableNumber: 9,
    });
    const routerOut = getPort(project, 'device-router-1', 'output');
    const switcherIn = getPort(project, 'device-switcher', 'input');
    const result = connectPorts(project, { fromPortId: routerOut.id, toPortId: switcherIn.id });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const winner = getCableByNumber(result.project, 'V-0001');
    const loser = getCableByNumber(result.project, 'V-0009');

    expect(winner.status).toBe('connected');
    expect(winner.sideAEndpoint.id).toBe(routerOut.id);
    expect(winner.sideBEndpoint.id).toBe(switcherIn.id);
    expect(loser.status).toBe('retired');
  });

  it('allows a connected cable to terminate on a no-planned-cables port group', () => {
    const project = structuredClone(sampleProject);
    const routerOut = getPort(project, 'device-router-1', 'output');
    const multiviewerIn = getPort(project, 'device-multiviewer-1', 'input');
    const result = connectPorts(project, { fromPortId: routerOut.id, toPortId: multiviewerIn.id });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const codes = validateProject(result.project).map((issue) => issue.code);

    expect(codes).not.toContain('port-group-no-planned-cables-cable-reference');
  });

  it('blocks invalid direct device directions', () => {
    let project = structuredClone(sampleProject);
    project = addDevicePort(project, {
      id: 'device-switcher-a',
      labelPrefix: 'SWA',
      direction: 'input',
      firstCableNumber: 9,
    });
    project = addDevicePort(project, {
      id: 'device-switcher-b',
      labelPrefix: 'SWB',
      direction: 'input',
      firstCableNumber: 10,
    });
    const left = getPort(project, 'device-switcher-a', 'input');
    const right = getPort(project, 'device-switcher-b', 'input');
    const result = connectPorts(project, { fromPortId: left.id, toPortId: right.id });

    expect(result.ok).toBe(false);
  });

  it('allows different connector types in the same compatibility group', () => {
    let project = structuredClone(sampleProject);
    project = addDevicePort(project, {
      id: 'device-switcher-sdi-din',
      labelPrefix: 'SWDIN',
      direction: 'input',
      firstCableNumber: 9,
      connectorTypeId: 'connector-sdi-din',
    });
    const routerOut = getPort(project, 'device-router-1', 'output');
    const switcherIn = getPort(project, 'device-switcher-sdi-din', 'input');
    const result = connectPorts(project, { fromPortId: routerOut.id, toPortId: switcherIn.id });

    expect(result.ok).toBe(true);
  });

  it('blocks connector types in different compatibility groups', () => {
    let project = structuredClone(sampleProject);
    project = addDevicePort(project, {
      id: 'device-monitor-hdmi',
      labelPrefix: 'MON',
      direction: 'input',
      firstCableNumber: 9,
      connectorTypeId: 'connector-hdmi',
    });
    const routerOut = getPort(project, 'device-router-1', 'output');
    const monitorIn = getPort(project, 'device-monitor-hdmi', 'input');
    const result = connectPorts(project, { fromPortId: routerOut.id, toPortId: monitorIn.id });

    expect(result.ok).toBe(false);
  });

  it('validates and describes a device to TB to device chain', () => {
    let project = structuredClone(sampleProject);
    project = addTerminalBlock(project, {
      id: 'device-tb-a',
      labelPrefix: 'TB-A',
      ru: 1,
    });
    project = addDevicePort(project, {
      id: 'device-switcher',
      labelPrefix: 'SW',
      direction: 'input',
      firstCableNumber: 10,
    });

    const routerOut = getPort(project, 'device-router-1', 'output');
    const tbRear = getPort(project, 'device-tb-a', 'rear');
    const tbFront = getPort(project, 'device-tb-a', 'front');
    const switcherIn = getPort(project, 'device-switcher', 'input');
    const rearResult = connectPorts(project, { fromPortId: routerOut.id, toPortId: tbRear.id });

    expect(rearResult.ok).toBe(true);
    if (!rearResult.ok) {
      return;
    }

    const rearOnlySummary = describePortConnection(rearResult.project, routerOut.id);
    const rearOnlyTbPart = rearOnlySummary.chainParts.find((part) => part.type === 'terminal_block');

    expect(rearOnlyTbPart).toMatchObject({
      entryPortId: tbRear.id,
      exitPortId: tbFront.id,
      continuationCable: null,
    });

    const frontResult = connectPorts(rearResult.project, { fromPortId: tbFront.id, toPortId: switcherIn.id });

    expect(frontResult.ok).toBe(true);
    if (!frontResult.ok) {
      return;
    }

    const codes = validateProject(frontResult.project).map((issue) => issue.code);
    const summary = describePortConnection(frontResult.project, routerOut.id);
    const tbPart = summary.chainParts.find((part) => part.type === 'terminal_block');

    expect(codes).not.toContain('connection-chain-direction-invalid');
    expect(summary.chainLabel).toContain('| TB-A-01 >');
    expect(summary.chainLabel).toContain('SW-IN-001');
    expect(tbPart).toMatchObject({
      marker: '| TB-A-01 >',
      orientation: 'rear-to-front',
      entryPortId: tbRear.id,
      exitPortId: tbFront.id,
    });
    expect(tbPart?.continuationCable?.number).toBe('V-0010');
  });

  it('allocates a cable only when two TB front ports are patched', () => {
    let project = structuredClone(sampleProject);
    project = addTerminalBlock(project, {
      id: 'device-tb-a',
      labelPrefix: 'TB-A',
      ru: 1,
    });
    project = addTerminalBlock(project, {
      id: 'device-tb-b',
      labelPrefix: 'TB-B',
      ru: 2,
    });
    const tbAFront = getPort(project, 'device-tb-a', 'front');
    const tbBFront = getPort(project, 'device-tb-b', 'front');
    const result = connectPorts(project, { fromPortId: tbAFront.id, toPortId: tbBFront.id });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(getCableByNumber(result.project, 'V-0009').status).toBe('connected');
    expect(result.project.numberingLedgers[0].ranges).toContainEqual(
      expect.objectContaining({
        from: 9,
        to: 9,
        ownerType: 'connection',
      }),
    );
  });

  it('replaces existing connections and restores previous cable slots', () => {
    let project = structuredClone(sampleProject);
    project = addDevicePort(project, {
      id: 'device-switcher',
      labelPrefix: 'SW',
      direction: 'input',
      firstCableNumber: 9,
    });
    project = addDevicePort(project, {
      id: 'device-camera',
      labelPrefix: 'CAM',
      direction: 'output',
      firstCableNumber: 10,
    });
    const routerOut = getPort(project, 'device-router-1', 'output');
    const switcherIn = getPort(project, 'device-switcher', 'input');
    const cameraOut = getPort(project, 'device-camera', 'output');
    const firstResult = connectPorts(project, { fromPortId: routerOut.id, toPortId: switcherIn.id });

    expect(firstResult.ok).toBe(true);
    if (!firstResult.ok) {
      return;
    }

    const secondResult = connectPorts(firstResult.project, {
      fromPortId: switcherIn.id,
      toPortId: cameraOut.id,
    });

    expect(secondResult.ok).toBe(true);
    if (!secondResult.ok) {
      return;
    }

    expect(getCableByNumber(secondResult.project, 'V-0001').status).toBe('planned');
    expect(getCableByNumber(secondResult.project, 'V-0009').status).toBe('connected');
    expect(getCableByNumber(secondResult.project, 'V-0010').status).toBe('retired');
  });

  it('clears a connection and restores both planned cable slots', () => {
    let project = structuredClone(sampleProject);
    project = addDevicePort(project, {
      id: 'device-switcher',
      labelPrefix: 'SW',
      direction: 'input',
      firstCableNumber: 9,
    });
    const routerOut = getPort(project, 'device-router-1', 'output');
    const switcherIn = getPort(project, 'device-switcher', 'input');
    const connectResult = connectPorts(project, { fromPortId: routerOut.id, toPortId: switcherIn.id });

    expect(connectResult.ok).toBe(true);
    if (!connectResult.ok) {
      return;
    }

    const disconnectResult = disconnectPort(connectResult.project, { portId: routerOut.id });

    expect(disconnectResult.ok).toBe(true);
    if (!disconnectResult.ok) {
      return;
    }

    expect(getCableByNumber(disconnectResult.project, 'V-0001').status).toBe('planned');
    expect(getCableByNumber(disconnectResult.project, 'V-0009').status).toBe('planned');
    expect(describePortConnection(disconnectResult.project, routerOut.id).isConnected).toBe(false);
    expect(describePortConnection(disconnectResult.project, switcherIn.id).isConnected).toBe(false);
  });

  it('restores bidirectional planned cable slots to side A by convention', () => {
    let project = structuredClone(sampleProject);
    project = addDevicePort(project, {
      id: 'device-intercom',
      labelPrefix: 'COM',
      direction: 'bidirectional',
      firstCableNumber: 20,
    });
    project = addDevicePort(project, {
      id: 'device-switcher',
      labelPrefix: 'SW',
      direction: 'input',
      firstCableNumber: 21,
    });
    const bidirectional = getPort(project, 'device-intercom', 'bidirectional');
    const switcherIn = getPort(project, 'device-switcher', 'input');
    const connectResult = connectPorts(project, { fromPortId: bidirectional.id, toPortId: switcherIn.id });

    expect(connectResult.ok).toBe(true);
    if (!connectResult.ok) {
      return;
    }

    const disconnectResult = disconnectPort(connectResult.project, { portId: bidirectional.id });

    expect(disconnectResult.ok).toBe(true);
    if (!disconnectResult.ok) {
      return;
    }

    const slot = getCableByNumber(disconnectResult.project, 'V-0020');

    expect(slot.status).toBe('planned');
    expect(slot.sideAEndpoint.id).toBe(bidirectional.id);
    expect(slot.sideBEndpoint.type).toBe('unknown');
  });

  it('blocks a pair with no planned cable slot on either side', () => {
    let project = structuredClone(sampleProject);
    project = addDevicePort(project, {
      id: 'device-no-cable-out',
      labelPrefix: 'NCO',
      direction: 'output',
      firstCableNumber: null,
    });
    const output = getPort(project, 'device-no-cable-out', 'output');
    const input = getPort(project, 'device-multiviewer-1', 'input');
    const result = connectPorts(project, { fromPortId: output.id, toPortId: input.id });

    expect(result.ok).toBe(false);
  });
});
