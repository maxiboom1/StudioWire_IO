import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { Cable, Endpoint, ProjectRoot } from './types';
import {
  checkEndpointCompatibility,
  classifyEndpointOccupancy,
  connectCableEndpoint,
  disconnectCableEndpoint,
  findActiveCablesAttachedToEndpoint,
  findRetiredCablesAttachedToEndpoint,
  getCompatibleTargetEndpointCandidates,
  getCompatibleTargetEndpointCandidatesForObject,
  resolveEndpointInfo,
} from './crosspointing';

const output1: Endpoint = {
  type: 'device_port',
  id: 'port-group-router-outputs-port-0001',
  label: 'RTR1-OUT-001',
};
const output2: Endpoint = {
  type: 'device_port',
  id: 'port-group-router-outputs-port-0002',
  label: 'RTR1-OUT-002',
};
const input1: Endpoint = {
  type: 'device_port',
  id: 'port-group-multiviewer-inputs-port-0001',
  label: 'MV1-IN-001',
};
const input2: Endpoint = {
  type: 'device_port',
  id: 'port-group-multiviewer-inputs-port-0002',
  label: 'MV1-IN-002',
};
const tbRear1: Endpoint = {
  type: 'tb_port',
  id: 'tb-port-tb-port-group-mcr-bnc-1-rear-01',
  label: 'TB1-REAR-01',
};
const tbFront1: Endpoint = {
  type: 'tb_port',
  id: 'tb-port-tb-port-group-mcr-bnc-1-front-01',
  label: 'TB1-FRONT-01',
};

function createProject(): ProjectRoot {
  return structuredClone(sampleProject);
}

function addInputStub(project: ProjectRoot, portEndpoint = input1): Cable {
  const cable: Cable = {
    id: 'cable-v-0100',
    number: 'V-0100',
    prefix: 'V',
    index: 100,
    status: 'planned',
    sourceEndpoint: { type: 'unknown', id: null, label: 'Unknown' },
    destinationEndpoint: portEndpoint,
    labelTop: '',
    labelMiddle: 'V-0100',
    labelBottom: portEndpoint.label,
    notes: '',
  };

  project.cables.push(cable);
  project.ports = project.ports.map((port) =>
    port.id === portEndpoint.id ? { ...port, plannedCableId: cable.id } : port,
  );

  return cable;
}

describe('crosspoint endpoint resolution and compatibility', () => {
  it('resolves device ports and terminal block ports', () => {
    const project = createProject();
    const deviceInfo = resolveEndpointInfo(project, output1);
    const tbInfo = resolveEndpointInfo(project, tbRear1);

    expect(deviceInfo).toMatchObject({
      objectType: 'device',
      objectName: 'Router 1',
      label: 'RTR1-OUT-001',
      direction: 'output',
    });
    expect(tbInfo).toMatchObject({
      objectType: 'terminalBlock',
      objectName: 'MCR BNC TB 1',
      label: 'TB1-REAR-01',
      face: 'rear',
    });
  });

  it('applies compatibility rules', () => {
    const project = createProject();

    expect(checkEndpointCompatibility(project, input1, input2).ok).toBe(false);
    expect(checkEndpointCompatibility(project, output1, output2).ok).toBe(false);
    expect(checkEndpointCompatibility(project, output1, input1).ok).toBe(true);
    expect(checkEndpointCompatibility(project, output1, tbRear1).ok).toBe(true);
    expect(checkEndpointCompatibility(project, tbRear1, input1).ok).toBe(true);
    expect(
      checkEndpointCompatibility(project, tbRear1, {
        type: 'tb_port',
        id: project.terminalBlockPorts[2].id,
        label: project.terminalBlockPorts[2].label,
      }).ok,
    ).toBe(true);
  });

  it('blocks rear/front internal continuity on the same terminal block position', () => {
    const project = createProject();
    const result = checkEndpointCompatibility(project, tbRear1, tbFront1);

    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.reason).toContain('continuity');
  });

  it('returns compatible target candidates without active connected endpoints', () => {
    const project = createProject();
    const result = connectCableEndpoint(project, {
      anchorEndpoint: output1,
      anchorCableId: 'cable-v-0001',
      anchorSide: 'destination',
      targetEndpoint: input1,
    });

    expect(result.ok).toBe(true);
    const candidates = getCompatibleTargetEndpointCandidates(result.project, output2);

    expect(candidates.some((candidate) => candidate.endpoint.id === input1.id)).toBe(false);
    expect(candidates.some((candidate) => candidate.endpoint.id === input2.id)).toBe(true);
  });

  it('filters compatible targets to a specific object for object-level drops', () => {
    const project = createProject();
    const inputDevice = project.devices.find((device) => device.id === 'device-multiviewer-1');

    expect(inputDevice).toBeDefined();
    const candidates = getCompatibleTargetEndpointCandidatesForObject(project, output1, {
      objectType: 'device',
      objectId: inputDevice!.id,
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.display.objectId === inputDevice!.id)).toBe(true);
    expect(candidates.some((candidate) => candidate.endpoint.id === input1.id)).toBe(true);
    expect(candidates.some((candidate) => candidate.endpoint.id === output2.id)).toBe(false);
  });
});

describe('crosspoint connection behavior', () => {
  it('attaches an anchor cable unknown endpoint to a target endpoint', () => {
    const project = createProject();
    const result = connectCableEndpoint(project, {
      anchorEndpoint: output1,
      anchorCableId: 'cable-v-0001',
      anchorSide: 'destination',
      targetEndpoint: input1,
    });
    const cable = result.project.cables.find((candidate) => candidate.id === 'cable-v-0001');

    expect(result.ok).toBe(true);
    expect(cable?.destinationEndpoint).toMatchObject(input1);
    expect(cable?.labelBottom).toBe(input1.label);
  });

  it('anchor cable wins over a target planned cable and retires the loser', () => {
    const project = createProject();
    const losingCable = addInputStub(project);
    const result = connectCableEndpoint(project, {
      anchorEndpoint: output1,
      anchorCableId: 'cable-v-0001',
      anchorSide: 'destination',
      targetEndpoint: input1,
    });
    const anchorCable = result.project.cables.find((candidate) => candidate.id === 'cable-v-0001');
    const retiredCable = result.project.cables.find((candidate) => candidate.id === losingCable.id);

    expect(result.ok).toBe(true);
    expect(anchorCable?.destinationEndpoint.id).toBe(input1.id);
    expect(retiredCable?.status).toBe('retired');
    expect(findRetiredCablesAttachedToEndpoint(result.project, input1).map((cable) => cable.id)).toContain(losingCable.id);
  });

  it('blocks a target endpoint with an active connected cable', () => {
    const project = createProject();
    const first = connectCableEndpoint(project, {
      anchorEndpoint: output1,
      anchorCableId: 'cable-v-0001',
      anchorSide: 'destination',
      targetEndpoint: input1,
    });
    const second = connectCableEndpoint(first.project, {
      anchorEndpoint: output2,
      anchorCableId: 'cable-v-0002',
      anchorSide: 'destination',
      targetEndpoint: input1,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.message).toContain('active connected cable');
  });

  it('allows terminal block endpoint connections and retired cables are not active occupancy', () => {
    const project = createProject();
    const result = connectCableEndpoint(project, {
      anchorEndpoint: output1,
      anchorCableId: 'cable-v-0001',
      anchorSide: 'destination',
      targetEndpoint: tbRear1,
    });
    const retiredProject = {
      ...result.project,
      cables: result.project.cables.map((cable) =>
        cable.id === 'cable-v-0001' ? { ...cable, status: 'retired' as const } : cable,
      ),
    };

    expect(result.ok).toBe(true);
    expect(findActiveCablesAttachedToEndpoint(retiredProject, tbRear1)).toHaveLength(0);
    expect(classifyEndpointOccupancy(retiredProject, tbRear1)).toBe('retired_history_only');
  });

  it('creates a new cable when neither endpoint has a planned stub', () => {
    const project = createProject();
    const before = project.cables.length;
    const result = connectCableEndpoint(project, {
      anchorEndpoint: input1,
      targetEndpoint: tbRear1,
    });

    expect(result.ok).toBe(true);
    expect(result.project.cables).toHaveLength(before + 1);
    expect(result.project.cables[result.project.cables.length - 1]?.number).toBe('V-0009');
  });
});

describe('crosspoint disconnect behavior', () => {
  it('returns an endpoint to unknown without retiring the cable or changing ledgers', () => {
    const project = createProject();
    const connected = connectCableEndpoint(project, {
      anchorEndpoint: output1,
      anchorCableId: 'cable-v-0001',
      anchorSide: 'destination',
      targetEndpoint: input1,
    });
    const beforeLedgers = structuredClone(connected.project.numberingLedgers);
    const result = disconnectCableEndpoint(connected.project, {
      cableId: 'cable-v-0001',
      side: 'destination',
    });
    const cable = result.project.cables.find((candidate) => candidate.id === 'cable-v-0001');

    expect(result.ok).toBe(true);
    expect(cable?.destinationEndpoint).toMatchObject({ type: 'unknown', id: null });
    expect(cable?.status).toBe('planned');
    expect(result.project.numberingLedgers).toEqual(beforeLedgers);
  });

  it('disconnect on an already-unknown endpoint reports clearly', () => {
    const project = createProject();
    const result = disconnectCableEndpoint(project, {
      cableId: 'cable-v-0001',
      side: 'destination',
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('already disconnected');
  });

  it('connect then disconnect leaves the anchor cable as an unresolved stub with original number intact', () => {
    const project = createProject();
    const connected = connectCableEndpoint(project, {
      anchorEndpoint: output1,
      anchorCableId: 'cable-v-0001',
      anchorSide: 'destination',
      targetEndpoint: input1,
    });
    const disconnected = disconnectCableEndpoint(connected.project, {
      cableId: 'cable-v-0001',
      side: 'destination',
    });
    const cable = disconnected.project.cables.find((candidate) => candidate.id === 'cable-v-0001');

    expect(cable?.number).toBe('V-0001');
    expect(cable?.destinationEndpoint.type).toBe('unknown');
    expect(cable?.status).toBe('planned');
  });
});
