import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './projectFactory';
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
