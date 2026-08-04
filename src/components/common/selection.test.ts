import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectView, ValidationIssue } from '../../domain/types';
import { resolveIssueSelection, resolveSelection } from './selection';

const view: ProjectView = {
  id: 'view-signal-overview',
  name: 'Signal Overview',
  description: '',
  pageSize: 'a3',
  orientation: 'portrait',
  placements: [],
  lines: [],
  annotations: [],
};

describe('View selection', () => {
  it('resolves a View independently from locations', () => {
    const project = { ...structuredClone(sampleProject), views: [view] };

    expect(
      resolveSelection(project, {
        selectedObjectType: 'view',
        selectedObjectId: view.id,
      }),
    ).toEqual({ type: 'view', value: view });
  });

  it('returns null for a stale View selection', () => {
    expect(
      resolveSelection(sampleProject, {
        selectedObjectType: 'view',
        selectedObjectId: 'view-missing',
      }),
    ).toBeNull();
  });

  it('routes View validation issues to the View workspace', () => {
    const project = { ...structuredClone(sampleProject), views: [view] };
    const issue: ValidationIssue = {
      id: 'issue-view',
      severity: 'error',
      code: 'view-name-required',
      message: 'View name is required.',
      objectType: 'view',
      objectId: view.id,
    };

    expect(resolveIssueSelection(project, issue)).toEqual({
      selectedObjectType: 'view',
      selectedObjectId: view.id,
    });
  });
});
