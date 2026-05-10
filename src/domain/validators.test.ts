import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './projectFactory';
import { sampleProject } from './sampleProject';
import { validateProject } from './validators';

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
      { id: 'category-empty', name: '', defaultCablePrefix: 'V' },
      { id: 'category-video-copy', name: 'Video', defaultCablePrefix: 'MISSING' },
    );
    project.settings.connectorTypes.push(
      { id: 'connector-empty', name: '' },
      { id: 'connector-bnc-copy', name: 'BNC' },
    );

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('empty-category-name');
    expect(codes).toContain('duplicate-category-name');
    expect(codes).toContain('category-default-prefix-missing');
    expect(codes).toContain('empty-connector-type-name');
    expect(codes).toContain('duplicate-connector-type-name');
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
});

describe('validateProject ledger rules', () => {
  it('reports invalid ledger nextSuggested and range values', () => {
    const project = structuredClone(sampleProject);
    const ledger = project.numberingLedgers[0];

    ledger.nextSuggested = 4;
    ledger.ranges[0].from = 0;
    ledger.ranges[0].to = -1;
    ledger.ranges[0].prefix = 'A';

    const codes = validateProject(project).map((issue) => issue.code);

    expect(codes).toContain('ledger-next-suggested-after-ranges');
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
