import { describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import { buildDevicePresentationModel } from './devicePresentationModel';

describe('device presentation model', () => {
  it('keeps ordered rows and resolves current cable and destination summaries live', () => {
    const project = structuredClone(sampleProject);
    const device = project.devices.find((candidate) => candidate.id === 'device-router-1');
    if (!device) throw new Error('Fixture device missing.');

    const before = buildDevicePresentationModel(project, device);
    expect(before.rows.map((row) => row.right?.port.index).filter(Boolean)).toEqual([1, 2, 3, 4]);
    expect(before.rows[0].right?.cableNumbers[0]).toBeTruthy();

    const firstPort = before.rows[0].right?.port;
    if (!firstPort) throw new Error('Fixture port missing.');
    firstPort.label = 'LIVE INPUT LABEL';
    const after = buildDevicePresentationModel(project, device);
    expect(after.rows[0].right?.port.label).toBe('LIVE INPUT LABEL');
  });
});
