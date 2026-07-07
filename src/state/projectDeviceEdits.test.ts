import { describe, expect, it } from 'vitest';
import { connectPorts } from '../domain/connections';
import { sampleProject } from '../domain/sampleProject';
import type { Device, ProjectRoot } from '../domain/types';
import { editDeviceInProject } from './projectDeviceEdits';
import type { EditDeviceInput } from './projectTypes';

const TEST_TIMESTAMP = '2026-07-01T10:00:00.000Z';

function baseEdit(project: ProjectRoot = structuredClone(sampleProject)): EditDeviceInput {
  const device = project.devices.find((item) => item.id === 'device-router-1') as Device;

  return {
    deviceId: device.id,
    deviceUpdates: {
      name: device.name,
      code: device.kind === 'device' ? (device.code ?? '') : '',
      manufacturer: device.kind === 'device' ? (device.manufacturer ?? '') : '',
      model: device.kind === 'device' ? (device.model ?? '') : '',
      categoryId: device.categoryId,
      locationId: device.locationId,
      role: device.kind === 'device' ? (device.role ?? '') : '',
      labelPrefix: device.labelPrefix,
      notes: device.notes,
      rackSizeRu: device.rackSizeRu,
    },
    existingPortGroups: project.portGroups
      .filter((group) => group.deviceId === device.id)
      .map((group) => ({
        id: group.id,
        name: group.name,
        portLabelPattern: group.portLabelPattern,
      })),
    newPortGroups: [],
  };
}

describe('editDeviceInProject', () => {
  it('edits existing interface labels and cascades planned/connected cable labels', () => {
    const connected = connectPorts(structuredClone(sampleProject), {
      fromPortId: 'port-group-router-outputs-port-0001',
      toPortId: 'port-group-multiviewer-inputs-port-0001',
    });

    expect(connected.ok).toBe(true);
    if (!connected.ok) {
      return;
    }

    const input = baseEdit(connected.project);
    input.existingPortGroups = input.existingPortGroups.map((group) =>
      group.id === 'port-group-router-outputs'
        ? { ...group, name: 'PROGRAM', portLabelPattern: '{DEVICE}-PROGRAM-{000}' }
        : group,
    );
    const result = editDeviceInProject(connected.project, input, TEST_TIMESTAMP);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.project.portGroups.find((group) => group.id === 'port-group-router-outputs')).toMatchObject(
      {
        name: 'PROGRAM',
        portLabelPattern: '{DEVICE}-PROGRAM-{000}',
      },
    );
    expect(
      result.project.ports.find((port) => port.id === 'port-group-router-outputs-port-0001'),
    ).toMatchObject({
      name: 'PROGRAM 1',
      label: 'RTR1-PROGRAM-001',
    });
    expect(result.project.cables.find((cable) => cable.id === 'cable-v-0001')).toMatchObject({
      status: 'connected',
      sideAEndpoint: { id: 'port-group-router-outputs-port-0001', label: 'RTR1-PROGRAM-001' },
      labelTop: 'RTR1-PROGRAM-001',
      labelMiddle: 'V-0001',
      labelBottom: 'MV1-IN-001',
    });
  });

  it('adds a new interface with ports, planned cables, and numbering ledger allocation', () => {
    const input = baseEdit();
    input.newPortGroups = [
      {
        name: 'MGMT',
        direction: 'bidirectional',
        categoryId: 'category-network',
        connectorTypeId: 'connector-rj45',
        count: 1,
        localId: 'new-mgmt',
        portLabelPattern: '{DEVICE}-MGMT-{000}',
        cablePrefix: 'N',
        firstCableNumber: 1,
        createPlannedCables: true,
      },
    ];

    const result = editDeviceInProject(structuredClone(sampleProject), input, TEST_TIMESTAMP);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const group = result.project.portGroups.find((candidate) => candidate.name === 'MGMT');
    expect(group).toMatchObject({
      deviceId: 'device-router-1',
      count: 1,
      firstCableNumber: 1,
      lastCableNumber: 1,
      numberingRangeId: expect.any(String),
    });
    expect(result.project.ports.find((port) => port.portGroupId === group?.id)).toMatchObject({
      label: 'RTR1-MGMT-001',
      plannedCableId: 'cable-n-0001',
    });
    expect(result.project.cables.find((cable) => cable.id === 'cable-n-0001')).toMatchObject({
      number: 'N-0001',
      labelTop: 'RTR1-MGMT-001',
    });
    expect(result.project.numberingLedgers.find((ledger) => ledger.prefix === 'N')?.ranges[0]).toMatchObject({
      from: 1,
      to: 1,
      status: 'allocated',
    });
  });

  it('persists combined existing and new interface order', () => {
    const input = baseEdit();
    input.newPortGroups = [
      {
        name: 'MGMT',
        direction: 'bidirectional',
        categoryId: 'category-network',
        connectorTypeId: 'connector-rj45',
        count: 1,
        localId: 'new-mgmt',
        portLabelPattern: '{DEVICE}-MGMT-{000}',
        cablePrefix: 'N',
        firstCableNumber: 1,
        createPlannedCables: true,
      },
    ];
    input.portGroupOrder = [
      { kind: 'new', localId: 'new-mgmt' },
      { kind: 'existing', id: 'port-group-router-outputs' },
    ];

    const result = editDeviceInProject(structuredClone(sampleProject), input, TEST_TIMESTAMP);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(
      result.project.portGroups
        .filter((group) => group.deviceId === 'device-router-1')
        .map((group) => group.name),
    ).toEqual(['MGMT', 'OUT']);
  });

  it('persists existing interface order without changing port or cable IDs', () => {
    const project = structuredClone(sampleProject);
    const monitorGroup = {
      ...project.portGroups.find((group) => group.id === 'port-group-router-outputs')!,
      id: 'port-group-router-monitor',
      name: 'MONITOR',
      portLabelPattern: '{DEVICE}-MON-{000}',
      numberingRangeId: null,
      firstCableNumber: null,
      lastCableNumber: null,
      createPlannedCables: false,
    };

    project.portGroups.splice(1, 0, monitorGroup);

    const input = baseEdit(project);
    input.existingPortGroups = [...input.existingPortGroups].reverse();

    const result = editDeviceInProject(project, input, TEST_TIMESTAMP);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(
      result.project.portGroups
        .filter((group) => group.deviceId === 'device-router-1')
        .map((group) => group.id),
    ).toEqual(['port-group-router-monitor', 'port-group-router-outputs']);
    expect(result.project.ports.map((port) => port.id)).toEqual(project.ports.map((port) => port.id));
    expect(result.project.cables.map((cable) => cable.id)).toEqual(project.cables.map((cable) => cable.id));
  });

  it('rejects reserved-gap reuse and terminal-block edits', () => {
    const input = baseEdit();
    input.newPortGroups = [
      {
        name: 'BAD',
        direction: 'output',
        categoryId: 'category-video',
        connectorTypeId: 'connector-bnc',
        count: 1,
        localId: 'new-bad',
        portLabelPattern: '{DEVICE}-BAD-{000}',
        cablePrefix: 'V',
        firstCableNumber: 5,
        createPlannedCables: true,
      },
    ];
    const gapResult = editDeviceInProject(structuredClone(sampleProject), input, TEST_TIMESTAMP);
    const terminalBlockProject: ProjectRoot = {
      ...structuredClone(sampleProject),
      devices: [
        {
          ...sampleProject.devices[0],
          id: 'device-tb-edit',
          kind: 'terminal_block',
          rackSizeRu: 1,
        } as Device,
      ],
    };
    const tbResult = editDeviceInProject(
      terminalBlockProject,
      { ...input, deviceId: 'device-tb-edit', existingPortGroups: [], newPortGroups: [] },
      TEST_TIMESTAMP,
    );

    expect(gapResult.ok).toBe(false);
    if (!gapResult.ok) {
      expect(gapResult.error).toContain('cable allocation failed');
    }
    expect(tbResult.ok).toBe(false);
    if (!tbResult.ok) {
      expect(tbResult.error).toContain('terminal blocks');
    }
  });
});
