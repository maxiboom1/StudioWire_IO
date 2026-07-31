import { describe, expect, it } from 'vitest';
import {
  findLocationNameConflict,
  findProjectItemNameConflict,
  normalizeProjectItemName,
} from './projectItemNames';
import { sampleProject } from './sampleProject';

describe('project item names', () => {
  it('normalizes names with trimmed case-insensitive matching', () => {
    expect(normalizeProjectItemName('  Router 1  ')).toBe('router 1');
  });

  it('finds conflicts across device, TB, rack, and folder records', () => {
    const project = structuredClone(sampleProject);
    project.subLocations.push({
      id: 'folder-test',
      locationId: 'location-control-room',
      name: 'Front Table',
      description: '',
    });

    expect(findProjectItemNameConflict(project, '  mcr rack a  ')?.type).toBe('rack');
    expect(findProjectItemNameConflict(project, 'FRONT TABLE')?.type).toBe('folder');
    expect(
      findProjectItemNameConflict(project, 'front table', {
        id: 'folder-test',
        type: 'folder',
      }),
    ).toBeNull();
  });

  it('keeps location names in a separate unique namespace', () => {
    const project = structuredClone(sampleProject);

    expect(findLocationNameConflict(project, ' control room ')?.id).toBe('location-control-room');
    expect(findProjectItemNameConflict(project, 'Control Room')).toBeNull();
  });
});
