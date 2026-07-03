import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import schema from '../../schema/studiowire.project.schema.json';
import { connectPorts } from './connections';
import { createEmptyProject } from './projectFactory';
import { importProjectJsonText, importProjectValue } from './projectImport';
import { sampleProject } from './sampleProject';
import {
  CABLE_STATUS_VALUES,
  CONNECTOR_ICON_KEY_VALUES,
  DEVICE_KIND_VALUES,
  DEVICE_MOUNT_TYPE_VALUES,
  ENDPOINT_TYPE_VALUES,
  NUMBERING_RANGE_STATUS_VALUES,
  OBJECT_STATUS_VALUES,
  PORT_DIRECTION_VALUES,
  PROJECT_STATUS_VALUES,
  RACK_NUMBERING_DIRECTION_VALUES,
  VALIDATION_SEVERITY_VALUES,
  type Port,
  type ProjectRoot,
} from './types';
import { STUDIOWIRE_CURRENT_VERSION } from './version';
import { projectReducer, type ProjectState } from '../state/projectReducer';

describe('current project contract', () => {
  it('accepts a fresh empty project from the factory', () => {
    const project = createEmptyProject({ name: 'Contract Empty Project' });
    const result = importProjectValue(JSON.parse(JSON.stringify(project)));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
    }
  });

  it('accepts the current sample fixture', () => {
    const result = importProjectJsonText(readFileSync('docs/samples/sample-project.studiowire.json', 'utf8'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.schemaVersion).toBe(STUDIOWIRE_CURRENT_VERSION);
      expect(result.validationIssues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
    }
  });

  it('accepts a representative project with rack, device, terminal block, ports, planned cables, and connections', () => {
    const project = createRepresentativeProject();
    const result = importProjectValue(JSON.parse(JSON.stringify(project)));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.devices.some((device) => device.kind === 'terminal_block')).toBe(true);
      expect(result.project.cables.some((cable) => cable.status === 'connected')).toBe(true);
    }
  });

  it('keeps export/import/export structurally equivalent', () => {
    const project = createRepresentativeProject();
    const first = importProjectJsonText(JSON.stringify(project));

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const second = importProjectJsonText(JSON.stringify(first.project));

    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(JSON.parse(JSON.stringify(second.project))).toEqual(JSON.parse(JSON.stringify(first.project)));
    }
  });

  it('rejects invalid enums, primitive type drift, missing required fields, and additional properties', () => {
    const cases: Array<(project: any) => void> = [
      (project) => (project.devices[0].status = 'active'),
      (project) => (project.devices[0].status = 'retired'),
      (project) => (project.devices[0].locationId = null),
      (project) => (project.racks[0].heightRu = '42'),
      (project) => delete project.project.name,
      (project) => (project.ports[0].unexpected = true),
    ];

    for (const mutate of cases) {
      const project = JSON.parse(JSON.stringify(sampleProject));
      mutate(project);
      const result = importProjectValue(project);

      expect(result.ok).toBe(false);
    }
  });

  it('rejects older internal dev schema versions instead of migrating them', () => {
    const project = JSON.parse(JSON.stringify(sampleProject));
    project.schemaVersion = '0.2.8.10';

    const result = importProjectValue(project);

    expect(result.ok).toBe(false);
  });

  it('keeps TypeScript union values aligned with JSON Schema enums', () => {
    const defs = schema.$defs;

    expect(schema.properties.project.$ref).toBe('#/$defs/ProjectInfo');
    expect(schema.properties.subLocations.items.$ref).toBe('#/$defs/SubLocation');
    expect(defs.ProjectInfo.properties.status.enum).toEqual([...PROJECT_STATUS_VALUES]);
    expect(defs.ConnectorIconKey.enum).toEqual([...CONNECTOR_ICON_KEY_VALUES]);
    expect(defs.Device.properties.status.enum).toEqual([...OBJECT_STATUS_VALUES]);
    expect(defs.Cable.properties.status.enum).toEqual([...CABLE_STATUS_VALUES]);
    expect(defs.NumberingRange.properties.status.enum).toEqual([...NUMBERING_RANGE_STATUS_VALUES]);
    expect(defs.RackNumberingDirection.enum).toEqual([...RACK_NUMBERING_DIRECTION_VALUES]);
    expect(defs.DeviceMountType.enum).toEqual([...DEVICE_MOUNT_TYPE_VALUES]);
    expect(defs.DeviceKind.enum).toEqual([...DEVICE_KIND_VALUES]);
    expect(defs.PortDirection.enum).toEqual([...PORT_DIRECTION_VALUES]);
    expect(defs.Endpoint.properties.type.enum).toEqual([...ENDPOINT_TYPE_VALUES]);
    expect(defs.ValidationIssue.properties.severity.enum).toEqual([...VALIDATION_SEVERITY_VALUES]);
  });
});

function createState(project: ProjectRoot): ProjectState {
  return {
    project,
    statusMessage: 'ready',
    importError: null,
  };
}

function createRepresentativeProject(): ProjectRoot {
  let project = structuredClone(sampleProject);

  project = projectReducer(createState(project), {
    type: 'ADD_TERMINAL_BLOCK',
    payload: {
      terminalBlock: {
        id: 'device-contract-tb',
        name: 'Contract TB',
        categoryId: 'category-video',
        locationId: 'location-machine-room',
        labelPrefix: 'CTB',
        rackId: 'rack-mcr-a',
        rackBottomRu: 1,
        connectorTypeId: 'connector-bnc',
        count: 1,
        cablePrefix: 'V',
        firstCableNumber: 9,
        createPlannedCables: true,
        notes: '',
      },
    },
  }).project;

  project = projectReducer(createState(project), {
    type: 'ADD_DEVICE',
    payload: {
      device: {
        id: 'device-contract-monitor',
        name: 'Contract Monitor',
        code: 'CMON',
        manufacturer: '',
        model: '',
        categoryId: 'category-video',
        locationId: 'location-control-room',
        subLocationId: null,
        role: '',
        labelPrefix: 'CMON',
        mountType: 'non_rack',
        rackId: null,
        rackSizeRu: null,
        rackBottomRu: null,
        notes: '',
      },
      portGroups: [
        {
          name: 'IN',
          direction: 'input',
          categoryId: 'category-video',
          connectorTypeId: 'connector-bnc',
          count: 1,
          portLabelPattern: '{DEVICE}-IN-{000}',
          cablePrefix: 'V',
          firstCableNumber: 10,
          createPlannedCables: true,
        },
      ],
    },
  }).project;

  const routerOut = getPort(project, 'device-router-1', 'output');
  const tbRear = getPort(project, 'device-contract-tb', 'rear');
  const rear = connectPorts(project, { fromPortId: routerOut.id, toPortId: tbRear.id });

  if (!rear.ok) {
    throw new Error(rear.error);
  }

  const tbFront = getPort(rear.project, 'device-contract-tb', 'front');
  const monitorIn = getPort(rear.project, 'device-contract-monitor', 'input');
  const front = connectPorts(rear.project, { fromPortId: tbFront.id, toPortId: monitorIn.id });

  if (!front.ok) {
    throw new Error(front.error);
  }

  return front.project;
}

function getPort(project: ProjectRoot, deviceId: string, direction: Port['direction']): Port {
  const port = project.ports.find(
    (candidate) => candidate.deviceId === deviceId && candidate.direction === direction,
  );

  if (!port) {
    throw new Error(`Missing ${deviceId} ${direction} port.`);
  }

  return port;
}
