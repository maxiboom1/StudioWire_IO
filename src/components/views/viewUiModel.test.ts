import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectView } from '../../domain/types';
import {
  createViewFormValues,
  formatViewPageMeta,
  getNextViewName,
  getViewNameError,
  isViewPopulated,
} from './viewUiModel';

function view(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 'view-a',
    name: 'View 1',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [],
    lines: [],
    annotations: [],
    ...overrides,
  };
}

describe('View UI model', () => {
  it('uses deterministic case-insensitive View N defaults', () => {
    expect(getNextViewName([])).toBe('View 1');
    expect(getNextViewName([view({ name: 'VIEW 1' }), view({ id: 'view-c', name: 'View 3' })])).toBe(
      'View 2',
    );
  });

  it('validates trimmed required and case-insensitive unique names', () => {
    const project = structuredClone(sampleProject);
    project.views = [view({ name: 'Signal Overview' })];

    expect(getViewNameError(project, '   ')).toBe('View name is required.');
    expect(getViewNameError(project, ' signal overview ')).toBe(
      'View name "Signal Overview" is already used.',
    );
    expect(getViewNameError(project, ' signal overview ', 'view-a')).toBeNull();
  });

  it('creates A3 portrait defaults and formats metadata', () => {
    expect(createViewFormValues()).toEqual({
      name: '',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
    });
    expect(formatViewPageMeta(view({ pageSize: 'a4', orientation: 'landscape' }))).toBe('A4 · Landscape');
  });

  it('detects content in any View canvas collection', () => {
    expect(isViewPopulated(view())).toBe(false);
    expect(
      isViewPopulated(
        view({
          annotations: [
            {
              id: 'annotation-a',
              kind: 'text',
              xMm: 0,
              yMm: 0,
              widthMm: 10,
              text: 'Heading',
              size: 'small',
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});
