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
