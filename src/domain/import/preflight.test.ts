import { describe, expect, it } from 'vitest';
import { sampleProject } from '../sampleProject';
import { preflightProjectShape } from './preflight';

describe('project import preflight', () => {
  it('requires Views for current-shape preflight but allows migration to supply the legacy field', () => {
    const project = structuredClone(sampleProject) as any;
    delete project.views;

    expect(preflightProjectShape(project)).toContainEqual(
      expect.objectContaining({ code: 'expected-array', path: '$.views' }),
    );
    expect(preflightProjectShape(project, { requireViews: false })).not.toContainEqual(
      expect.objectContaining({ path: '$.views' }),
    );
  });
});
