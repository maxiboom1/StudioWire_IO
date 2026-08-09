import { describe, expect, it } from 'vitest';
import { connectPorts } from '../../domain/connections';
import { createPlannedCableForPort } from '../../domain/plannedCables';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import { projectReducer, type ProjectState } from '../../state/projectReducer';
import { buildCableTableRows } from './cableRows';

function createState(project: ProjectRoot = structuredClone(sampleProject)): ProjectState {
  return {
    project,
    statusMessage: 'ready',
    importError: null,
  };
}

describe('buildCableTableRows', () => {
  it('resolves output planned cable source and unknown destination', () => {
    const rows = buildCableTableRows(structuredClone(sampleProject));
    const row = rows.find((candidate) => candidate.cableNumber === 'V-001');

    expect(row).toMatchObject({
      sideALabel: 'OUT-001',
      sideBLabel: 'N/C',
      locationA: 'Machine Room',
      locationB: 'N/C',
      connectorA: 'BNC',
      connectorB: 'N/C',
      status: 'planned',
    });
  });

  it('resolves input planned cable destination and unknown source', () => {
    const project = structuredClone(sampleProject);
    const inputPort = project.ports.find(
      (port) => port.portGroupId === 'port-group-multiviewer-inputs' && port.index === 1,
    );

    if (!inputPort) {
      throw new Error('Expected multiviewer input port');
    }

    const cable = createPlannedCableForPort(inputPort, 'V', 20);
    inputPort.plannedCableId = cable.id;
    project.cables.push(cable);

    const row = buildCableTableRows(project).find((candidate) => candidate.cableNumber === 'V-020');

    expect(row).toMatchObject({
      sideALabel: 'N/C',
      sideBLabel: 'IN-001',
      locationA: 'N/C',
      locationB: 'Control Room',
      connectorA: 'N/C',
      connectorB: 'BNC',
    });
  });

  it('resolves the cable allocated by a TB front-to-front patch', () => {
    const firstResult = projectReducer(createState(), {
      type: 'ADD_TERMINAL_BLOCK',
      payload: {
        terminalBlock: {
          id: 'device-tb-cable-row',
          name: 'TB Cable Row',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          labelPrefix: 'TB-CR',
          rackId: 'rack-mcr-a',
          rackBottomRu: 1,
          connectorTypeId: 'connector-bnc',
          count: 1,
          notes: '',
        },
      },
    });
    const secondResult = projectReducer(createState(firstResult.project), {
      type: 'ADD_TERMINAL_BLOCK',
      payload: {
        terminalBlock: {
          id: 'device-tb-cable-row-b',
          name: 'TB Cable Row B',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          labelPrefix: 'TB-B',
          rackId: 'rack-mcr-a',
          rackBottomRu: 2,
          connectorTypeId: 'connector-bnc',
          count: 1,
          notes: '',
        },
      },
    });
    const frontPorts = secondResult.project.ports.filter(
      (port) =>
        (port.deviceId === 'device-tb-cable-row' || port.deviceId === 'device-tb-cable-row-b') &&
        port.direction === 'front',
    );
    const connected = connectPorts(secondResult.project, {
      fromPortId: frontPorts[0].id,
      toPortId: frontPorts[1].id,
    });

    expect(connected.ok).toBe(true);
    if (!connected.ok) {
      return;
    }

    const row = buildCableTableRows(connected.project).find((candidate) => candidate.cableNumber === 'V-009');

    expect(row).toMatchObject({
      sideALabel: 'TB-CR (F)-01',
      sideBLabel: 'TB-B (F)-01',
      locationA: 'Machine Room',
      locationB: 'Machine Room',
      connectorA: 'BNC',
      connectorB: 'BNC',
    });
  });

  it('degrades missing endpoint references to N/C', () => {
    const project = structuredClone(sampleProject);
    project.cables[0] = {
      ...project.cables[0],
      sideAEndpoint: {
        type: 'device_port',
        id: 'missing-port',
        label: 'Stale label',
      },
    };
    const row = buildCableTableRows(project)[0];

    expect(row).toMatchObject({
      sideALabel: 'N/C',
      locationA: 'N/C',
      connectorA: 'N/C',
    });
  });
});
