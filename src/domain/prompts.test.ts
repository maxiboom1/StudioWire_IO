import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { Device, Rack } from './types';
import {
  buildCrossLocationRackAssignmentPrompt,
  buildDeleteDeviceConfirmation,
  buildDeleteViewConfirmation,
  buildViewFormatChangeConfirmation,
} from './prompts';

describe('confirmation prompts', () => {
  it('does not build a rack assignment prompt when device and rack are in the same location', () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find(
      (candidate): candidate is Device => candidate.id === 'device-router-1',
    )!;
    const rack = project.racks.find((candidate): candidate is Rack => candidate.id === 'rack-mcr-a')!;

    expect(buildCrossLocationRackAssignmentPrompt(project, device, rack)).toBeNull();
  });

  it('builds a rack assignment prompt when a device moves to a rack in another location', () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find(
      (candidate): candidate is Device => candidate.id === 'device-multiviewer-1',
    )!;
    const rack = project.racks.find((candidate): candidate is Rack => candidate.id === 'rack-mcr-a')!;

    expect(buildCrossLocationRackAssignmentPrompt(project, device, rack)).toBe(
      'You are assigning "Multiviewer 1" from "Control Room" to rack "MCR Rack A" in "Machine Room". This will move the device to "Machine Room". Proceed?',
    );
  });

  it('does not build a rack assignment prompt when source or target location is missing', () => {
    const project = structuredClone(sampleProject);
    const device = {
      ...project.devices.find((candidate): candidate is Device => candidate.id === 'device-multiviewer-1')!,
      locationId: 'missing-location',
    };
    const rack = project.racks.find((candidate): candidate is Rack => candidate.id === 'rack-mcr-a')!;

    expect(buildCrossLocationRackAssignmentPrompt(project, device, rack)).toBeNull();
  });

  it('reports affected Views before source deletion', () => {
    const device = structuredClone(sampleProject.devices[0]);
    const confirmation = buildDeleteDeviceConfirmation(device, [
      {
        viewId: 'view-a',
        viewName: 'Signal Overview',
        placementCount: 1,
        attachedLineCount: 2,
        attachedPortRangeCount: 1,
      },
    ]);

    expect(confirmation.message).toContain('Affected Views: 1 ("Signal Overview")');
    expect(confirmation.message).toContain('1 direct placement(s), 2 attached manual line(s)');
    expect(confirmation.message).toContain('1 attached I/O Range(s)');
  });

  it('reports exact View-local deletion counts and protects source objects', () => {
    const confirmation = buildDeleteViewConfirmation({
      id: 'view-a',
      name: 'Signal Overview',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
      placements: [
        {
          id: 'placement-a',
          sourceType: 'device',
          sourceId: 'device-router-1',
          xMm: 0,
          yMm: 0,
          scale: 1,
          labelOverride: null,
        },
      ],
      lines: [],
      annotations: [],
    });

    expect(confirmation.message).toContain('1 placement(s), 0 line(s), and 0 annotation(s)');
    expect(confirmation.message).toContain('Source devices and racks are not affected.');
  });

  it('warns that populated format changes retain coordinates', () => {
    const confirmation = buildViewFormatChangeConfirmation({
      id: 'view-a',
      name: 'Signal Overview',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
      placements: [],
      lines: [],
      annotations: [],
    });

    expect(confirmation.message).toContain(
      'Existing coordinates, scales, waypoints, and line-label positions',
    );
    expect(confirmation.confirmLabel).toBe('Keep layout');
  });
});
