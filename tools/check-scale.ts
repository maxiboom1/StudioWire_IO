import { connectPorts } from '../src/domain/connections';
import { createEmptyProject, createLocation, createRack } from '../src/domain/projectFactory';
import { importProjectJsonText } from '../src/domain/projectImport';
import { validateProject } from '../src/domain/validators';
import { serializeProjectJson } from '../src/state/projectExport';
import { scheduleProjectAutosave, type TimerApi, type TimerHandle } from '../src/state/projectAutosave';
import type { BrowserStorageLike } from '../src/state/projectStorage';
import { createDeviceInProject, createTerminalBlockInProject } from '../src/state/projectDeviceCommands';
import type { ProjectRoot } from '../src/domain/types';

const DEVICE_COUNT = 160;
const DEVICE_PORTS_PER_DIRECTION = 8;
const TERMINAL_BLOCK_COUNT = 8;
const TERMINAL_BLOCK_CONNECTORS = 16;
const MAX_VALIDATION_MS = 2_500;
const MAX_ROUND_TRIP_MS = 2_500;

const startedAt = performance.now();
let project = createEmptyProject({
  id: 'project-scale-check',
  name: 'Synthetic Scale Check',
  customer: 'Local release verification',
  revision: '0.2.8.10',
  status: 'draft',
});

project = {
  ...project,
  locations: [createLocation({ id: 'location-scale', name: 'Scale Room', type: 'test' })],
  racks: [
    createRack({
      id: 'rack-scale',
      locationId: 'location-scale',
      name: 'Scale Rack',
      heightRu: 42,
    }),
  ],
};

const videoCategory = requireEntity(
  project.settings.categories.find((category) => category.name === 'Video'),
);
const bncConnector = requireEntity(
  project.settings.connectorTypes.find((connectorType) => connectorType.name === 'BNC'),
);

for (let index = 1; index <= DEVICE_COUNT; index += 1) {
  const label = `SC${String(index).padStart(3, '0')}`;
  const result = createDeviceInProject(project, {
    device: {
      id: `device-scale-${index}`,
      name: `Scale Device ${index}`,
      code: label,
      manufacturer: '',
      model: '',
      categoryId: videoCategory.id,
      locationId: 'location-scale',
      role: '',
      labelPrefix: label,
      mountType: 'virtual',
      rackId: null,
      rackSizeRu: null,
      rackBottomRu: null,
      notes: '',
    },
    portGroups: [
      {
        name: 'IN',
        direction: 'input',
        categoryId: videoCategory.id,
        connectorTypeId: bncConnector.id,
        count: DEVICE_PORTS_PER_DIRECTION,
        portLabelPattern: '{DEVICE}-IN-{000}',
        cablePrefix: 'V',
        firstCableNumber: nextCableNumber(project, 'V'),
        createPlannedCables: true,
      },
      {
        name: 'OUT',
        direction: 'output',
        categoryId: videoCategory.id,
        connectorTypeId: bncConnector.id,
        count: DEVICE_PORTS_PER_DIRECTION,
        portLabelPattern: '{DEVICE}-OUT-{000}',
        cablePrefix: 'V',
        firstCableNumber: nextCableNumber(project, 'V') + DEVICE_PORTS_PER_DIRECTION,
        createPlannedCables: true,
      },
    ],
  });

  if (!result.ok) {
    fail(result.error);
  }

  project = result.project;
}

for (let index = 1; index <= TERMINAL_BLOCK_COUNT; index += 1) {
  const result = createTerminalBlockInProject(project, {
    id: `device-scale-tb-${index}`,
    name: `Scale TB ${index}`,
    categoryId: videoCategory.id,
    locationId: 'location-scale',
    labelPrefix: `STB${index}`,
    rackId: 'rack-scale',
    rackBottomRu: index,
    connectorTypeId: bncConnector.id,
    count: TERMINAL_BLOCK_CONNECTORS,
    cablePrefix: 'V',
    firstCableNumber: nextCableNumber(project, 'V'),
    createPlannedCables: true,
    notes: '',
  });

  if (!result.ok) {
    fail(result.error);
  }

  project = result.project;
}

project = connectOrFail(project, 'SC001-OUT-001', 'SC002-IN-001');
project = connectOrFail(project, 'SC003-OUT-001', 'STB1 (R)-01');
project = connectOrFail(project, 'STB1 (F)-01', 'STB2 (F)-01');

const validationStartedAt = performance.now();
const validationIssues = validateProject(project);
const validationMs = performance.now() - validationStartedAt;
const errors = validationIssues.filter((issue) => issue.severity === 'error');

if (errors.length > 0) {
  fail(`Synthetic project has validation errors: ${errors.map((issue) => issue.code).join(', ')}`);
}

const storage = createMemoryStorage();
const timers = createImmediateTimerApi();
let autosaveCompleted = false;
const cancelFirstAutosave = scheduleProjectAutosave({
  storage,
  timers,
  project,
  delayMs: 350,
  onComplete: () => {
    fail('Cancelled autosave should not complete.');
  },
});
cancelFirstAutosave();
scheduleProjectAutosave({
  storage,
  timers,
  project,
  delayMs: 350,
  onComplete: (result) => {
    if (!result.ok) {
      fail(`Autosave failed: ${result.message}`);
    }
    autosaveCompleted = true;
  },
});
timers.flush();

if (!autosaveCompleted) {
  fail('Autosave callback did not complete.');
}

const roundTripStartedAt = performance.now();
const serialized = serializeProjectJson(project);
const imported = importProjectJsonText(serialized);
const roundTripMs = performance.now() - roundTripStartedAt;

if (!imported.ok) {
  fail(`Synthetic project failed import: ${imported.error}`);
}

if (
  imported.project.ports.length !== project.ports.length ||
  imported.project.cables.length !== project.cables.length
) {
  fail('Synthetic import changed port or cable counts.');
}

if (validationMs > MAX_VALIDATION_MS) {
  fail(`Synthetic validation took ${Math.round(validationMs)}ms, expected <= ${MAX_VALIDATION_MS}ms.`);
}

if (roundTripMs > MAX_ROUND_TRIP_MS) {
  fail(`Synthetic serialize/import took ${Math.round(roundTripMs)}ms, expected <= ${MAX_ROUND_TRIP_MS}ms.`);
}

const totalMs = performance.now() - startedAt;

console.log(
  [
    'Synthetic scale check passed:',
    `${project.devices.length} devices`,
    `${project.ports.length} ports`,
    `${project.cables.length} cables`,
    `${serialized.length} JSON chars`,
    `${Math.round(validationMs)}ms validation`,
    `${Math.round(roundTripMs)}ms serialize/import`,
    `${Math.round(totalMs)}ms total`,
  ].join(' '),
);

function nextCableNumber(projectRoot: ProjectRoot, prefix: string): number {
  return projectRoot.numberingLedgers.find((ledger) => ledger.prefix === prefix)?.nextSuggested ?? 1;
}

function connectOrFail(projectRoot: ProjectRoot, fromLabel: string, toLabel: string): ProjectRoot {
  const fromPort = requireEntity(projectRoot.ports.find((port) => port.label === fromLabel));
  const toPort = requireEntity(projectRoot.ports.find((port) => port.label === toLabel));
  const result = connectPorts(projectRoot, {
    fromPortId: fromPort.id,
    toPortId: toPort.id,
  });

  if (!result.ok) {
    fail(result.error);
  }

  return result.project;
}

function requireEntity<T>(value: T | undefined): T {
  if (!value) {
    fail('Synthetic scale check could not find required generated data.');
  }

  return value;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function createMemoryStorage(): BrowserStorageLike {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function createImmediateTimerApi(): TimerApi & { flush: () => void } {
  const callbacks = new Map<number, () => void>();
  let nextId = 1;

  return {
    setTimeout: (callback, _delayMs) => {
      const id = nextId;

      nextId += 1;
      callbacks.set(id, callback);

      return id;
    },

    clearTimeout: (timer: TimerHandle) => {
      callbacks.delete(Number(timer));
    },

    flush: () => {
      const pendingCallbacks = [...callbacks.values()];

      callbacks.clear();

      for (const callback of pendingCallbacks) {
        callback();
      }
    },
  };
}
