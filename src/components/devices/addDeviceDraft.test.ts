import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ConnectorType, ProjectRoot } from '../../domain/types';
import {
  addPortGroupDraft,
  createAddDeviceCommandInput,
  createInitialDeviceDraft,
  createQuickPortGroups,
  findConnectorTypeId,
  formatPortGroupLastCableNumber,
  formatPortGroupRange,
  getAddDeviceValidation,
  getDefaultPrefixForCategory,
  normalizeDeviceToken,
  rebalancePlannedCableRanges,
  removePortGroupDraft,
  togglePortGroupPlannedCables,
  updatePortGroupCategory,
  updatePortGroupDrafts,
  type DevicePortGroupForm,
} from './addDeviceDraft';
import { createSequentialAddDeviceLocalIdFactory } from './addDeviceLocalIds';

function projectFixture(): ProjectRoot {
  return structuredClone(sampleProject);
}

function ids(prefix = 'group') {
  return createSequentialAddDeviceLocalIdFactory(prefix);
}

function validDevice(project = projectFixture()) {
  return {
    ...createInitialDeviceDraft(project, 'location-machine-room'),
    name: 'Production Router',
  };
}

function validGroups(project = projectFixture()) {
  return createQuickPortGroups(project, 'category-video', ids('video'));
}

describe('Add Device initial draft and presets', () => {
  it('creates the current empty virtual device draft defaults', () => {
    const project = projectFixture();

    expect(createInitialDeviceDraft(project, 'location-machine-room')).toEqual({
      name: '',
      code: '',
      manufacturer: '',
      model: '',
      categoryId: 'category-video',
      locationId: 'location-machine-room',
      subLocationId: null,
      role: '',
      labelPrefix: '',
      mountType: 'virtual',
      rackId: null,
      rackSizeRu: null,
      rackBottomRu: null,
      notes: '',
    });
  });

  it('handles empty settings/project cases safely', () => {
    const project = projectFixture();
    project.settings.categories = [];
    project.settings.connectorTypes = [];
    project.settings.categoryConnectorAssignments = [];
    project.settings.cablePrefixes = [];
    project.numberingLedgers = [];

    expect(createInitialDeviceDraft(project, null).categoryId).toBe('');
    expect(createQuickPortGroups(project, '', ids())).toEqual([
      expect.objectContaining({
        categoryId: '',
        connectorTypeId: '',
        cablePrefix: 'V',
        firstCableNumber: 1,
        name: 'PORTS',
      }),
    ]);
  });

  it('creates current video, audio, network, and fallback quick presets with planned ranges', () => {
    const project = projectFixture();

    expect(createQuickPortGroups(project, 'category-video', ids('video'))).toEqual([
      expect.objectContaining({
        localId: 'video-1',
        name: 'SDI IN',
        direction: 'input',
        connectorTypeId: 'connector-bnc',
        count: 4,
        portLabelPattern: '{NAME}-{000}',
        cablePrefix: 'V',
        firstCableNumber: 9,
        createPlannedCables: true,
      }),
      expect.objectContaining({
        localId: 'video-2',
        name: 'SDI OUT',
        direction: 'output',
        connectorTypeId: 'connector-bnc',
        count: 4,
        portLabelPattern: '{NAME}-{000}',
        cablePrefix: 'V',
        firstCableNumber: 13,
        createPlannedCables: true,
      }),
    ]);
    expect(createQuickPortGroups(project, 'category-audio', ids('audio'))).toEqual([
      expect.objectContaining({
        localId: 'audio-1',
        name: 'AUDIO IN',
        direction: 'input',
        connectorTypeId: 'connector-xlr',
        cablePrefix: 'A',
        firstCableNumber: 1,
        portLabelPattern: '{NAME}-{000}',
      }),
      expect.objectContaining({
        localId: 'audio-2',
        name: 'AUDIO OUT',
        direction: 'output',
        connectorTypeId: 'connector-xlr',
        cablePrefix: 'A',
        firstCableNumber: 5,
        portLabelPattern: '{NAME}-{000}',
      }),
    ]);
    expect(createQuickPortGroups(project, 'category-network', ids('network'))).toEqual([
      expect.objectContaining({
        localId: 'network-1',
        name: 'NETWORK',
        direction: 'bidirectional',
        connectorTypeId: 'connector-rj45',
        cablePrefix: 'N',
        firstCableNumber: 1,
        portLabelPattern: '{NAME}-{000}',
      }),
    ]);
    expect(createQuickPortGroups(project, 'category-reference', ids('fallback'))).toEqual([
      expect.objectContaining({
        localId: 'fallback-1',
        name: 'PORTS',
        direction: 'bidirectional',
        connectorTypeId: 'connector-bnc',
        cablePrefix: 'R',
        firstCableNumber: 1,
        portLabelPattern: '{NAME}-{000}',
      }),
    ]);
  });

  it('uses assigned connector fallbacks and category default prefixes', () => {
    const project = projectFixture();

    expect(findConnectorTypeId(project, 'category-video', 'Missing')).toBe('connector-bnc');
    expect(getDefaultPrefixForCategory(project, 'category-audio')).toBe('A');
    expect(getDefaultPrefixForCategory(project, 'missing')).toBe('V');
  });
});

describe('Add Device port-group draft transitions', () => {
  it('updates only the target group and normalizes count while rebalancing ranges', () => {
    const project = projectFixture();
    const groups = validGroups(project);
    const updated = updatePortGroupDrafts(project, groups, 'video-1', { name: 'IN', count: '2' as any });

    expect(updated[0]).toEqual(expect.objectContaining({ name: 'IN', count: 2, firstCableNumber: 9 }));
    expect(updated[1]).toEqual(expect.objectContaining({ name: 'SDI OUT', count: 4, firstCableNumber: 11 }));
  });

  it('changes group category with assigned connector and default prefix', () => {
    const project = projectFixture();
    const updated = updatePortGroupCategory(project, validGroups(project), 'video-1', 'category-audio');

    expect(updated[0]).toEqual(
      expect.objectContaining({
        categoryId: 'category-audio',
        connectorTypeId: 'connector-bnc',
        cablePrefix: 'A',
        firstCableNumber: 1,
      }),
    );
    expect(updated[1]).toEqual(
      expect.objectContaining({ categoryId: 'category-video', firstCableNumber: 9 }),
    );
  });

  it('toggles planned cable mode and preserves first-number fallback behavior', () => {
    const project = projectFixture();
    const disabled = togglePortGroupPlannedCables(project, validGroups(project), 'video-1', false);

    expect(disabled[0]).toEqual(expect.objectContaining({ createPlannedCables: false, firstCableNumber: 9 }));
    expect(disabled[1]).toEqual(expect.objectContaining({ firstCableNumber: 9 }));

    const enabled = togglePortGroupPlannedCables(project, disabled, 'video-1', true);

    expect(enabled[0]).toEqual(expect.objectContaining({ createPlannedCables: true, firstCableNumber: 9 }));
    expect(enabled[1]).toEqual(expect.objectContaining({ firstCableNumber: 13 }));
  });

  it('adds and removes groups with deterministic local IDs', () => {
    const project = projectFixture();
    const groups = validGroups(project);
    const added = addPortGroupDraft(project, groups, validDevice(project), ids('new'));

    expect(added.at(-1)).toEqual(
      expect.objectContaining({
        localId: 'new-1',
        name: 'PORTS',
        direction: 'bidirectional',
        count: 1,
        firstCableNumber: 17,
      }),
    );
    expect(removePortGroupDraft(project, added, 'video-1').map((group) => group.localId)).toEqual([
      'video-2',
      'new-1',
    ]);
  });
});

describe('Add Device cable range formatting and validation', () => {
  it('calculates ranges for shared and separate prefixes without mutating the project', () => {
    const project = projectFixture();
    const before = structuredClone(project.numberingLedgers);
    const groups: DevicePortGroupForm[] = [
      { ...validGroups(project)[0], localId: 'a', cablePrefix: 'V', count: 2 },
      { ...validGroups(project)[0], localId: 'b', cablePrefix: 'V', count: 3 },
      { ...validGroups(project)[0], localId: 'c', cablePrefix: 'A', count: 2 },
    ];
    const balanced = rebalancePlannedCableRanges(project, groups);

    expect(balanced.map((group) => group.firstCableNumber)).toEqual([9, 11, 1]);
    expect(project.numberingLedgers).toEqual(before);
  });

  it('formats range badges and last cable numbers', () => {
    const group = validGroups()[0];

    expect(formatPortGroupRange(group)).toBe('V-0009 -> V-0012');
    expect(formatPortGroupLastCableNumber(group)).toBe('V-0012');
    expect(formatPortGroupRange({ ...group, count: 0 })).toBe('Set count');
    expect(formatPortGroupLastCableNumber({ ...group, count: 0 })).toBe('');
    expect(formatPortGroupRange({ ...group, createPlannedCables: false, firstCableNumber: null })).toBe(
      'Set first cable number',
    );
  });

  it('returns warnings for reserved gaps and errors for overlapping or invalid ranges', () => {
    const project = projectFixture();
    const device = validDevice(project);
    const reservedGapGroups = [{ ...validGroups(project)[0], firstCableNumber: 12, count: 2 }];
    const overlapGroups = [{ ...validGroups(project)[0], firstCableNumber: 1, count: 2 }];
    const invalidGroups = [
      {
        ...validGroups(project)[0],
        name: '',
        count: 0,
        firstCableNumber: null,
        cablePrefix: 'Z',
        connectorTypeId: 'missing',
      },
    ];

    expect(getAddDeviceValidation(project, device, reservedGapGroups).warnings).toEqual([
      'Numbers V-0009 to V-0011 will be reserved and cannot be used later.',
    ]);
    expect(getAddDeviceValidation(project, device, overlapGroups).errors).toContain(
      'SDI IN: New V allocations must start at or after V-0009.',
    );
    expect(getAddDeviceValidation(project, device, invalidGroups).errors).toEqual(
      expect.arrayContaining([
        'I/O interface name is required.',
        'I/O interface count must be positive.',
        'I/O interface uses an unknown cable prefix.',
        'I/O interface uses an unknown connector.',
        'I/O interface needs a positive first cable number.',
      ]),
    );
  });

  it('validates connector assignment, required device fields, empty groups, and disabled planning', () => {
    const project = projectFixture();
    const device = createInitialDeviceDraft(project, null);
    const missingLocationDevice = { ...validDevice(project), locationId: 'missing-location' };
    const disabledPlanning = [
      { ...validGroups(project)[0], createPlannedCables: false, firstCableNumber: null },
    ];
    const wrongConnector = [
      {
        ...validGroups(project)[0],
        categoryId: 'category-network',
        connectorTypeId: 'connector-xlr',
      },
    ];

    expect(getAddDeviceValidation(project, device, []).errors).toEqual(
      expect.arrayContaining(['Device name is required.', 'At least one I/O interface is required.']),
    );
    expect(getAddDeviceValidation(project, missingLocationDevice, validGroups(project)).errors).toContain(
      'Device location is required.',
    );
    expect(getAddDeviceValidation(project, validDevice(project), disabledPlanning).errors).toEqual([]);
    expect(getAddDeviceValidation(project, validDevice(project), wrongConnector).errors).toContain(
      'SDI IN connector must be assigned to the selected category.',
    );
  });
});

describe('Add Device token normalization and submit shaping', () => {
  it('normalizes device tokens using current space, underscore, punctuation, hyphen, empty, and case behavior', () => {
    expect(normalizeDeviceToken('  router one  ')).toBe('ROUTER-ONE');
    expect(normalizeDeviceToken('router_one')).toBe('ROUTER-ONE');
    expect(normalizeDeviceToken('Router! @One')).toBe('ROUTER-ONE');
    expect(normalizeDeviceToken('router---one')).toBe('ROUTER-ONE');
    expect(normalizeDeviceToken('')).toBe('DEVICE');
    expect(normalizeDeviceToken('mIxEd Case')).toBe('MIXED-CASE');
  });

  it('creates exact command input with local IDs removed and current field overrides preserved', () => {
    const project = projectFixture();
    const device = {
      ...validDevice(project),
      name: '  Production Router  ',
      labelPrefix: '',
      code: 'manual-code',
      role: 'ignored',
      mountType: 'rack' as const,
      rackId: 'rack-mcr-a',
      rackSizeRu: 4,
      rackBottomRu: 10,
      notes: 'ignored notes',
    };
    const groups = [
      { ...validGroups(project)[0], localId: 'local-a' },
      { ...validGroups(project)[1], localId: 'local-b', createPlannedCables: false },
    ];

    expect(createAddDeviceCommandInput(device, groups)).toEqual({
      device: {
        ...device,
        name: 'Production Router',
        code: 'MANUAL-CODE',
        role: '',
        labelPrefix: 'MANUAL-CODE',
        mountType: 'virtual',
        rackId: null,
        rackSizeRu: null,
        rackBottomRu: null,
        notes: '',
      },
      portGroups: [
        {
          name: 'SDI IN',
          direction: 'input',
          categoryId: 'category-video',
          connectorTypeId: 'connector-bnc',
          count: 4,
          portLabelPattern: '{NAME}-{000}',
          cablePrefix: 'V',
          firstCableNumber: 9,
          createPlannedCables: true,
          colorOverride: null,
        },
        {
          name: 'SDI OUT',
          direction: 'output',
          categoryId: 'category-video',
          connectorTypeId: 'connector-bnc',
          count: 4,
          portLabelPattern: '{NAME}-{000}',
          cablePrefix: 'V',
          firstCableNumber: null,
          createPlannedCables: false,
          colorOverride: null,
        },
      ],
    });
  });

  it('allows connector fallback to the first assigned connector when the named preset connector is absent', () => {
    const project = projectFixture();
    project.settings.connectorTypes = project.settings.connectorTypes.filter(
      (connector: ConnectorType) => connector.id !== 'connector-bnc',
    );
    project.settings.categoryConnectorAssignments = project.settings.categoryConnectorAssignments.filter(
      (assignment) => assignment.connectorTypeId !== 'connector-bnc',
    );

    expect(createQuickPortGroups(project, 'category-video', ids('fallback'))[0].connectorTypeId).toBe(
      'connector-hdmi',
    );
  });
});
