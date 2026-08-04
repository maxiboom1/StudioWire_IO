import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';
import {
  findCategory,
  getAvailableGroupConnectors,
  getCategoryConnectors,
  getGroupConnectors,
  getGroupsForCategory,
  getUnassignedConnectors,
} from './settingsSelectors';

function projectFixture(): ProjectRoot {
  return structuredClone(sampleProject);
}

describe('settings selectors', () => {
  it('finds categories and returns null for missing IDs', () => {
    const project = projectFixture();

    expect(findCategory(project, 'category-video')?.name).toBe('VIDEO');
    expect(findCategory(project, 'missing')).toBeNull();
  });

  it('returns assigned category connectors through the compatibility rules', () => {
    const names = getCategoryConnectors(projectFixture(), 'category-video').map(
      (connector) => connector.name,
    );

    expect(names).toEqual(['BNC', 'Micro BNC', 'SDI DIN']);
    expect(getCategoryConnectors(projectFixture(), '')).toEqual([]);
  });

  it('returns sorted unassigned category connectors', () => {
    const names = getUnassignedConnectors(projectFixture(), 'category-video').map(
      (connector) => connector.name,
    );

    expect(names.slice(0, 3)).toEqual(['DB25', 'DVI', 'Fiber']);
    expect(names).not.toContain('BNC');
  });

  it('looks up groups, members, and available group members without mutating project data', () => {
    const project = projectFixture();
    const before = structuredClone(project.settings.connectorCompatibilityGroupMembers);

    expect(getGroupsForCategory(project, 'category-video').map((group) => group.id)).toEqual([
      'group-video-sdi-coax',
    ]);
    expect(getGroupConnectors(project, 'group-video-sdi-coax')).toEqual([]);
    expect(
      getAvailableGroupConnectors(project, 'category-video', 'group-video-sdi-coax').map(
        (connector) => connector.name,
      ),
    ).toEqual(['BNC', 'Micro BNC', 'SDI DIN']);
    expect(project.settings.connectorCompatibilityGroupMembers).toEqual(before);
  });

  it('renders empty selector results safely for empty settings', () => {
    const project = projectFixture();
    project.settings.categories = [];
    project.settings.connectorTypes = [];
    project.settings.categoryConnectorAssignments = [];
    project.settings.connectorCompatibilityGroups = [];
    project.settings.connectorCompatibilityGroupMembers = [];

    expect(getUnassignedConnectors(project, 'category-video')).toEqual([]);
    expect(getGroupsForCategory(project, 'category-video')).toEqual([]);
    expect(getGroupConnectors(project, 'group-video')).toEqual([]);
    expect(getAvailableGroupConnectors(project, 'category-video', 'group-video')).toEqual([]);
  });
});
