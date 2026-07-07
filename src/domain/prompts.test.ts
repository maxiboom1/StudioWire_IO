import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import type { Device, Rack } from './types';
import { buildCrossLocationRackAssignmentPrompt } from './prompts';

describe('confirmation prompts', () => {
  it('does not build a rack assignment prompt when device and rack are in the same location', () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find((candidate): candidate is Device => candidate.id === 'device-router-1')!;
    const rack = project.racks.find((candidate): candidate is Rack => candidate.id === 'rack-mcr-a')!;

    expect(buildCrossLocationRackAssignmentPrompt(project, device, rack)).toBeNull();
  });

  it('builds a rack assignment prompt when a device moves to a rack in another location', () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find((candidate): candidate is Device => candidate.id === 'device-multiviewer-1')!;
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
});
