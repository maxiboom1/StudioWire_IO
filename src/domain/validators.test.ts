import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './projectFactory';
import { sampleProject } from './sampleProject';
import { validateProject } from './validators';
import { projectReducer, type ProjectState } from '../state/projectReducer';

function createValidationTestProject() {
  return createEmptyProject({
    id: 'project-validation-tests',
    name: 'Validation Tests',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
  });
}

describe('validateProject settings rules', () => {
  it('reports duplicate and invalid cable prefixes', () => {
    const project = createValidationTestProject();

    project.settings.cablePrefixes.push(
      { id: 'prefix-lowercase', prefix: 'v', name: 'Lowercase Video' },
      { id: 'prefix-video-copy', prefix: 'V', name: 'Video Copy' },
    );

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('invalid-cable-prefix-format');
    expect(codes).toContain('duplicate-cable-prefix-value');
  });

  it('reports category and connector naming issues', () => {
    const project = createValidationTestProject();

    project.settings.categories.push(
      { id: 'category-empty', name: '', defaultCablePrefix: 'V', color: '#111827' },
      { id: 'category-video-copy', name: 'Video', defaultCablePrefix: 'MISSING', color: '#111827' },
    );
    project.settings.connectorTypes.push(
      {
        id: 'connector-empty',
        name: '',
        iconKey: 'generic',
      },
      {
        id: 'connector-bnc-copy',
        name: 'BNC',
        iconKey: 'bnc',
      },
    );

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('empty-category-name');
    expect(codes).toContain('duplicate-category-name');
    expect(codes).toContain('category-default-prefix-missing');
    expect(codes).toContain('empty-connector-type-name');
    expect(codes).toContain('duplicate-connector-type-name');
  });

  it('reports invalid category colors and connector icon keys', () => {
    const project = createValidationTestProject();

    project.settings.categories[0].color = 'blue';
    project.settings.connectorTypes[0].iconKey = 'uploaded-image' as any;

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('category-color-invalid');
    expect(codes).toContain('connector-icon-key-invalid');
  });

  it('reports connector assignment and connector group issues', () => {
    const project = createValidationTestProject();

    project.settings.categoryConnectorAssignments.push(
      {
        id: 'assignment-missing-category',
        categoryId: 'category-missing',
        connectorTypeId: 'connector-bnc',
      },
      {
        id: 'assignment-missing-connector',
        categoryId: 'category-video',
        connectorTypeId: 'connector-missing',
      },
      {
        id: 'assignment-video-bnc-copy',
        categoryId: 'category-video',
        connectorTypeId: 'connector-bnc',
      },
    );
    project.settings.connectorCompatibilityGroups.push(
      { id: 'group-missing-category', categoryId: 'category-missing', name: 'Missing' },
      { id: 'group-video-sdi-copy', categoryId: 'category-video', name: 'Video connector group' },
    );
    project.settings.connectorCompatibilityGroupMembers.push(
      {
        id: 'member-missing-group',
        groupId: 'group-missing',
        connectorTypeId: 'connector-bnc',
      },
      {
        id: 'member-missing-connector',
        groupId: 'group-video-sdi-coax',
        connectorTypeId: 'connector-missing',
      },
      {
        id: 'member-unassigned-connector',
        groupId: 'group-video-sdi-coax',
        connectorTypeId: 'connector-rj45',
      },
      {
        id: 'member-video-bnc-copy',
        groupId: 'group-video-sdi-coax',
        connectorTypeId: 'connector-bnc',
      },
    );

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('category-connector-assignment-category-missing');
    expect(codes).toContain('category-connector-assignment-connector-missing');
    expect(codes).toContain('duplicate-category-connector-assignment');
    expect(codes).toContain('connector-group-category-missing');
    expect(codes).toContain('duplicate-connector-group-name');
    expect(codes).toContain('connector-group-member-group-missing');
    expect(codes).toContain('connector-group-member-connector-missing');
    expect(codes).toContain('connector-group-member-unassigned-connector');
    expect(codes).toContain('duplicate-connector-group-member');
  });
});

describe('validateProject sub-location rules', () => {
  it('accepts null and valid device sub-location assignments', () => {
    const project = structuredClone(sampleProject);

    project.subLocations.push({
      id: 'sub-location-front-table',
      locationId: 'location-control-room',
      name: 'Front Table',
      description: '',
    });
    project.devices[1].subLocationId = 'sub-location-front-table';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(project.devices[0].subLocationId).toBeNull();
    expect(codes).not.toContain('device-sub-location-missing');
    expect(codes).not.toContain('device-sub-location-location-mismatch');
  });

  it('reports duplicate, empty, missing, and mismatched sub-locations', () => {
    const project = structuredClone(sampleProject);

    project.subLocations.push(
      {
        id: 'sub-location-empty',
        locationId: 'location-control-room',
        name: '',
        description: '',
      },
      {
        id: 'sub-location-front-table',
        locationId: 'location-control-room',
        name: 'Front Table',
        description: '',
      },
      {
        id: 'sub-location-front-table-copy',
        locationId: 'location-control-room',
        name: 'front table',
        description: '',
      },
      {
        id: 'sub-location-missing-location',
        locationId: 'location-missing',
        name: 'Missing',
        description: '',
      },
    );
    project.devices[0].subLocationId = 'sub-location-missing';
    project.devices[1].subLocationId = 'sub-location-missing-location';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('sub-location-name-required');
    expect(codes).toContain('duplicate-project-item-name');
    expect(codes).toContain('sub-location-without-location');
    expect(codes).toContain('device-sub-location-missing');
    expect(codes).toContain('device-sub-location-location-mismatch');
  });

  it('reports missing and mismatched rack folder assignments', () => {
    const project = structuredClone(sampleProject);

    project.subLocations.push({
      id: 'sub-location-front-table',
      locationId: 'location-control-room',
      name: 'Front Table',
      description: '',
    });
    project.racks[0].subLocationId = 'sub-location-front-table';

    let codes = validateProject(project).map((issue) => issue.code);
    expect(codes).toContain('rack-sub-location-location-mismatch');

    project.racks[0].subLocationId = 'sub-location-missing';
    codes = validateProject(project).map((issue) => issue.code);
    expect(codes).toContain('rack-sub-location-missing');
  });
});

describe('validateProject planned cable rules', () => {
  it('reports broken planned cable port back-links and labels', () => {
    const project = structuredClone(sampleProject);
    const cable = project.cables[0];
    const port = project.ports.find((item) => item.plannedCableId === cable.id);

    if (!port) {
      throw new Error('Expected sample port linked to planned cable');
    }

    port.plannedCableId = null;
    cable.labelMiddle = 'WRONG';
    cable.labelTop = 'WRONG';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('planned-cable-port-backlink-mismatch');
    expect(codes).toContain('planned-cable-label-middle-mismatch');
    expect(codes).toContain('planned-cable-label-top-mismatch');
  });

  it('reports planned cable endpoint direction mismatches', () => {
    const project = structuredClone(sampleProject);
    const port = project.ports.find((item) => item.plannedCableId);

    if (!port?.plannedCableId) {
      throw new Error('Expected sample port linked to planned cable');
    }

    port.direction = 'input';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('planned-input-cable-destination-mismatch');
  });
});

describe('validateProject port group planned-cable mode rules', () => {
  it('accepts a valid planned-cable port group', () => {
    const project = structuredClone(sampleProject);
    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).not.toContain('port-group-planned-cables-range-required');
    expect(codes).not.toContain('port-group-planned-cable-count-mismatch');
    expect(codes).not.toContain('port-group-port-missing-planned-cable');
  });

  it('accepts a valid no-planned-cables port group', () => {
    const project = structuredClone(sampleProject);
    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).not.toContain('port-group-no-planned-cables-has-allocation');
    expect(codes).not.toContain('port-group-no-planned-cables-port-linked');
    expect(codes).not.toContain('port-group-no-planned-cables-cable-reference');
  });

  it('reports a no-planned-cables group with firstCableNumber set', () => {
    const project = structuredClone(sampleProject);
    const portGroup = project.portGroups.find((group) => !group.createPlannedCables);

    if (!portGroup) {
      throw new Error('Expected sample no-planned-cables port group');
    }

    portGroup.firstCableNumber = 20;

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('port-group-no-planned-cables-has-allocation');
  });

  it('reports a no-planned-cables group with a port plannedCableId set', () => {
    const project = structuredClone(sampleProject);
    const portGroup = project.portGroups.find((group) => !group.createPlannedCables);

    if (!portGroup) {
      throw new Error('Expected sample no-planned-cables port group');
    }

    const port = project.ports.find((item) => item.portGroupId === portGroup.id);

    if (!port) {
      throw new Error('Expected sample no-planned-cables port');
    }

    port.plannedCableId = project.cables[0].id;

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('port-group-no-planned-cables-port-linked');
  });

  it('reports a planned-cables group without numberingRangeId', () => {
    const project = structuredClone(sampleProject);
    const portGroup = project.portGroups.find((group) => group.createPlannedCables);

    if (!portGroup) {
      throw new Error('Expected sample planned-cables port group');
    }

    portGroup.numberingRangeId = null;

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('port-group-planned-cables-range-required');
  });

  it('reports a planned-cables group whose linked cable count does not match count', () => {
    const project = structuredClone(sampleProject);

    project.ports[0].plannedCableId = null;

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('port-group-planned-cable-count-mismatch');
  });

  it('reports invalid port group color overrides', () => {
    const project = structuredClone(sampleProject);

    project.portGroups[0].colorOverride = 'red';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('port-group-color-override-invalid');
  });
});

describe('validateProject ledger rules', () => {
  it('reports invalid ledger nextSuggested and range values', () => {
    const project = structuredClone(sampleProject);
    const ledger = project.numberingLedgers[0];

    ledger.nextSuggested = 6;
    ledger.ranges[0].from = 0;
    ledger.ranges[0].to = -1;
    ledger.ranges[0].prefix = 'A';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('ledger-next-suggested-available');
    expect(codes).toContain('numbering-range-positive');
    expect(codes).toContain('numbering-range-to-before-from');
    expect(codes).toContain('numbering-range-prefix-mismatch');
  });

  it('reports reserved gap numbering range references and uncovered planned cables', () => {
    const project = structuredClone(sampleProject);

    project.portGroups[0].numberingRangeId = 'range-v-reserved-gap-0005-0008';
    project.numberingLedgers[0].ranges = project.numberingLedgers[0].ranges.filter(
      (range) => range.id !== 'range-v-router-outputs',
    );

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('port-group-numbering-range-reserved-gap');
    expect(codes).toContain('planned-cable-without-ledger-range');
  });
});

describe('validateProject rack placement rules', () => {
  it('reports missing rack references with a specific validation code', () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find((item) => item.id === 'device-router-1');

    if (!device) {
      throw new Error('Expected sample rack-mounted device');
    }

    device.rackId = 'rack-missing';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('device-references-missing-rack');
  });
});

describe('validateProject terminal block rules', () => {
  function createProjectWithTerminalBlock() {
    const state: ProjectState = {
      project: structuredClone(sampleProject),
      statusMessage: 'ready',
      importError: null,
    };

    return projectReducer(state, {
      type: 'ADD_TERMINAL_BLOCK',
      payload: {
        terminalBlock: {
          id: 'device-tb-validation',
          name: 'TB Validation',
          categoryId: 'category-video',
          locationId: 'location-machine-room',
          labelPrefix: 'TB-V',
          rackId: 'rack-mcr-a',
          rackBottomRu: 1,
          connectorTypeId: 'connector-bnc',
          count: 2,
          notes: '',
        },
      },
    }).project;
  }

  it('accepts a terminal block without standard device metadata', () => {
    const project = createProjectWithTerminalBlock();
    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).not.toContain('device-code-required');
    expect(codes).not.toContain('terminal-block-face-groups-required');
    expect(codes).not.toContain('terminal-block-front-cable-source-mismatch');
  });

  it('reports invalid terminal block rack size and planned cable state', () => {
    const project = createProjectWithTerminalBlock();
    const terminalBlock = project.devices.find((device) => device.id === 'device-tb-validation');
    const rearGroup = project.portGroups.find(
      (group) => group.deviceId === 'device-tb-validation' && group.direction === 'rear',
    );

    if (!terminalBlock || !rearGroup) {
      throw new Error('Expected terminal block test data');
    }

    terminalBlock.rackSizeRu = 2;
    rearGroup.createPlannedCables = true;

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('terminal-block-size-fixed');
    expect(codes).toContain('terminal-block-planned-cables');
  });

  it('reports mismatched terminal block rear/front face counts', () => {
    const project = createProjectWithTerminalBlock();
    const frontGroup = project.portGroups.find(
      (group) => group.deviceId === 'device-tb-validation' && group.direction === 'front',
    );

    if (!frontGroup) {
      throw new Error('Expected terminal block front group');
    }

    frontGroup.count = 3;

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('terminal-block-face-mismatch');
    expect(codes).toContain('port-group-count-mismatch');
  });
});

describe('validateProject connector compatibility rules', () => {
  it('reports port group and port connector category mismatches', () => {
    const project = structuredClone(sampleProject);

    project.portGroups[0].connectorTypeId = 'connector-xlr';
    project.ports[0].connectorTypeId = 'connector-xlr';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('port-group-connector-not-assigned-to-category');
    expect(codes).toContain('port-connector-not-assigned-to-category');
  });

  it('accepts connected cables with different connector types in the same group', () => {
    const project = structuredClone(sampleProject);
    const cable = project.cables[0];
    const left = project.ports[0];
    const right = project.ports[4];

    right.connectorTypeId = 'connector-sdi-din';
    cable.status = 'connected';
    cable.sideAEndpoint = { type: 'device_port', id: left.id, label: left.label };
    cable.sideBEndpoint = { type: 'device_port', id: right.id, label: right.label };

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).not.toContain('connection-connector-group-mismatch');
  });

  it('reports connected cables with incompatible connector groups', () => {
    const project = structuredClone(sampleProject);
    const cable = project.cables[0];
    const left = project.ports[0];
    const right = project.ports[4];

    right.connectorTypeId = 'connector-hdmi';
    cable.status = 'connected';
    cable.sideAEndpoint = { type: 'device_port', id: left.id, label: left.label };
    cable.sideBEndpoint = { type: 'device_port', id: right.id, label: right.label };

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('connection-connector-group-mismatch');
  });
});
