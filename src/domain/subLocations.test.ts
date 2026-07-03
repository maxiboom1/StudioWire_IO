import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import { getSubLocationOptions, normalizeSubLocationForLocation } from './subLocations';

describe('sub-location helpers', () => {
  it('builds no-folder and location-filtered options', () => {
    const project = structuredClone(sampleProject);

    project.subLocations = [
      {
        id: 'sub-location-mcr-racks',
        locationId: 'location-machine-room',
        name: 'MCR Racks',
        description: '',
      },
      {
        id: 'sub-location-front-table',
        locationId: 'location-control-room',
        name: 'Front Table',
        description: '',
      },
    ];

    expect(getSubLocationOptions(project, 'location-machine-room')).toEqual([
      { id: null, name: 'No folder' },
      { id: 'sub-location-mcr-racks', name: 'MCR Racks' },
    ]);
    expect(
      normalizeSubLocationForLocation(project, 'sub-location-mcr-racks', 'location-control-room'),
    ).toBeNull();
    expect(
      normalizeSubLocationForLocation(project, 'sub-location-front-table', 'location-control-room'),
    ).toBe('sub-location-front-table');
  });
});
