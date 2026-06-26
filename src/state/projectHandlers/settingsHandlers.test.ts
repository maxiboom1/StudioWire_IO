import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectState } from '../projectTypes';
import { handleAddCategoryConnectorAssignment } from './settingsHandlers';

const context = {
  dependencies: {
    nowIso: () => '2026-06-26T10:00:00.000Z',
    makeId: (prefix: string, value: string) => `${prefix}-${value}`,
    makeUniqueId: (prefix: string, value: string) => `${prefix}-${value}`,
  },
};

function createState(): ProjectState {
  return {
    project: structuredClone(sampleProject),
    statusMessage: 'ready',
    importError: 'stale import error',
    persistenceState: 'saved',
  };
}

describe('settings action handlers', () => {
  it('handles duplicate category connector assignments without stamping the project', () => {
    const state = createState();
    const result = handleAddCategoryConnectorAssignment(
      state,
      {
        type: 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT',
        payload: {
          id: 'assignment-video-bnc-duplicate',
          categoryId: 'category-video',
          connectorTypeId: 'connector-bnc',
        },
      },
      context,
    );

    expect(result.project).toBe(state.project);
    expect(result.statusMessage).toBe('Connector already assigned to category');
    expect(result.importError).toBeNull();
  });

  it('adds a category connector assignment through the extracted handler', () => {
    const state = createState();
    const result = handleAddCategoryConnectorAssignment(
      state,
      {
        type: 'ADD_CATEGORY_CONNECTOR_ASSIGNMENT',
        payload: {
          id: 'assignment-video-xlr',
          categoryId: 'category-video',
          connectorTypeId: 'connector-xlr',
        },
      },
      context,
    );

    expect(result.project).not.toBe(state.project);
    expect(result.project.settings.categoryConnectorAssignments).toContainEqual({
      id: 'assignment-video-xlr',
      categoryId: 'category-video',
      connectorTypeId: 'connector-xlr',
    });
    expect(result.project.project.updatedAt).toBe('2026-06-26T10:00:00.000Z');
    expect(result.statusMessage).toBe('Connector assigned to category');
    expect(result.importError).toBeNull();
  });
});
