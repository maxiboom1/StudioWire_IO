import {
  createDevice,
  createEmptyProject,
  createLocation,
  createNumberingLedger,
  createPlannedCablesForPorts,
  createPortGroup,
  createPortsForGroup,
  createRack,
} from './projectFactory';
import type { ProjectRoot } from './types';

const SAMPLE_TIMESTAMP = '2026-05-06T00:00:00.000Z';

const project = createEmptyProject({
  id: 'project-demo-studio',
  name: 'Demo Studio',
  customer: 'Example Broadcast',
  revision: '0.1',
  status: 'draft',
  createdAt: SAMPLE_TIMESTAMP,
  updatedAt: SAMPLE_TIMESTAMP,
  createdBy: 'StudioWire IO',
  updatedBy: 'StudioWire IO',
});

const controlRoom = createLocation({
  id: 'location-control-room',
  name: 'Control Room',
  type: 'control_room',
  description: 'Primary production control room.',
});

const machineRoom = createLocation({
  id: 'location-machine-room',
  name: 'Machine Room',
  type: 'machine_room',
  description: 'Central equipment rack area.',
});

const rackA = createRack({
  id: 'rack-mcr-a',
  locationId: machineRoom.id,
  name: 'MCR Rack A',
  heightRu: 42,
  numberingDirection: 'bottom_to_top',
});

const router = createDevice({
  id: 'device-router-1',
  name: 'Router 1',
  code: 'RTR1',
  manufacturer: 'Example Systems',
  model: 'XR-16',
  categoryId: 'category-video',
  locationId: machineRoom.id,
  role: 'Video router',
  labelPrefix: 'RTR1',
  mountType: 'rack',
  rackId: rackA.id,
  rackSizeRu: 2,
  rackBottomRu: 20,
  status: 'planned',
  createdAt: SAMPLE_TIMESTAMP,
  updatedAt: SAMPLE_TIMESTAMP,
});

const multiviewer = createDevice({
  id: 'device-multiviewer-1',
  name: 'Multiviewer 1',
  code: 'MV1',
  manufacturer: 'Example Vision',
  model: 'MV-4',
  categoryId: 'category-video',
  locationId: controlRoom.id,
  role: 'Monitoring',
  labelPrefix: 'MV1',
  mountType: 'non_rack',
  status: 'planned',
  createdAt: SAMPLE_TIMESTAMP,
  updatedAt: SAMPLE_TIMESTAMP,
});

const routerOutputs = createPortGroup({
  id: 'port-group-router-outputs',
  deviceId: router.id,
  name: 'OUT',
  direction: 'output',
  categoryId: 'category-video',
  connectorTypeId: 'connector-bnc',
  count: 4,
  portLabelPattern: '{DEVICE}-OUT-{000}',
  cablePrefix: 'V',
  firstCableNumber: 1,
  lastCableNumber: 4,
  numberingRangeId: 'range-v-router-outputs',
  createPlannedCables: true,
  locked: false,
});

const multiviewerInputs = createPortGroup({
  id: 'port-group-multiviewer-inputs',
  deviceId: multiviewer.id,
  name: 'IN',
  direction: 'input',
  categoryId: 'category-video',
  connectorTypeId: 'connector-bnc',
  count: 4,
  portLabelPattern: '{DEVICE}-IN-{000}',
  cablePrefix: 'V',
  firstCableNumber: null,
  lastCableNumber: null,
  numberingRangeId: null,
  createPlannedCables: false,
  locked: false,
});

const routerPorts = createPortsForGroup(routerOutputs, router.labelPrefix);
const multiviewerPorts = createPortsForGroup(multiviewerInputs, multiviewer.labelPrefix);
const routerCables = createPlannedCablesForPorts({
  portGroup: routerOutputs,
  ports: routerPorts,
});

const videoLedger = createNumberingLedger({
  prefix: 'V',
  nextSuggested: 5,
  ranges: [
    {
      id: 'range-v-router-outputs',
      prefix: 'V',
      from: 1,
      to: 4,
      status: 'allocated',
      ownerType: 'portGroup',
      ownerId: routerOutputs.id,
      reason: 'Planned router output cables',
      createdAt: SAMPLE_TIMESTAMP,
    },
    {
      id: 'range-v-reserved-gap-0005-0008',
      prefix: 'V',
      from: 5,
      to: 8,
      status: 'reserved_gap',
      ownerType: 'project',
      ownerId: project.project.id,
      reason: 'Reserved for future router expansion',
      createdAt: SAMPLE_TIMESTAMP,
    },
  ],
});

export const sampleProject: ProjectRoot = {
  ...project,
  locations: [controlRoom, machineRoom],
  racks: [rackA],
  devices: [router, multiviewer],
  portGroups: [routerOutputs, multiviewerInputs],
  ports: [...routerPorts, ...multiviewerPorts],
  cables: routerCables,
  numberingLedgers: [videoLedger],
};
