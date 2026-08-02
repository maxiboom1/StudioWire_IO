import { describe, expect, it } from 'vitest';
import { allocateCableRange } from './cableNumbers';
import { connectPorts } from './connections';
import { deleteNormalDeviceFromProject } from './deviceDeletion';
import { sampleProject } from './sampleProject';

describe('deleteNormalDeviceFromProject', () => {
  it('removes a normal device, its owned records, rack placement, and owned cable ranges', () => {
    const result = deleteNormalDeviceFromProject(structuredClone(sampleProject), 'device-router-1');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.deletedPortCount).toBe(4);
    expect(result.deletedCableCount).toBe(4);
    expect(result.releasedRangeCount).toBe(1);
    expect(result.project.devices.some((device) => device.id === 'device-router-1')).toBe(false);
    expect(result.project.portGroups.some((group) => group.deviceId === 'device-router-1')).toBe(false);
    expect(result.project.ports.some((port) => port.deviceId === 'device-router-1')).toBe(false);
    expect(result.project.cables).toHaveLength(0);
    expect(result.project.numberingLedgers[0].ranges.map((range) => range.status)).toEqual(['reserved_gap']);
    expect(result.project.numberingLedgers[0].nextSuggested).toBe(1);
  });

  it('resets surviving port-owned connected cables to planned slots', () => {
    const connected = connectPorts(structuredClone(sampleProject), {
      fromPortId: 'port-group-router-outputs-port-0001',
      toPortId: 'port-group-multiviewer-inputs-port-0001',
    });

    expect(connected.ok).toBe(true);
    if (!connected.ok) {
      return;
    }

    const result = deleteNormalDeviceFromProject(connected.project, 'device-multiviewer-1');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.project.devices.some((device) => device.id === 'device-multiviewer-1')).toBe(false);
    expect(result.project.cables.find((cable) => cable.id === 'cable-v-0001')).toMatchObject({
      status: 'planned',
      sideAEndpoint: { id: 'port-group-router-outputs-port-0001' },
      sideBEndpoint: { type: 'unknown', id: null },
      labelTop: 'OUT-001',
      labelMiddle: 'V-0001',
      labelBottom: '',
    });
  });

  it('lets released allocated numbers be reused while reserved gaps remain blocked', () => {
    const deleted = deleteNormalDeviceFromProject(structuredClone(sampleProject), 'device-router-1');

    expect(deleted.ok).toBe(true);
    if (!deleted.ok) {
      return;
    }

    const reused = allocateCableRange(deleted.project, {
      prefix: 'V',
      firstCableNumber: 1,
      count: 4,
      ownerType: 'test',
      ownerId: 'replacement',
      reason: 'Replacement device',
    });
    const reservedGapReuse = allocateCableRange(deleted.project, {
      prefix: 'V',
      firstCableNumber: 5,
      count: 1,
      ownerType: 'test',
      ownerId: 'reserved-gap-reuse',
      reason: 'Reserved gap reuse',
    });

    expect(reused.preview.errors).toEqual([]);
    expect(reused.allocatedRange).toMatchObject({ from: 1, to: 4, status: 'allocated' });
    expect(reservedGapReuse.preview.errors.map((error) => error.code)).toContain('range-overlap');
    expect(reservedGapReuse.allocatedRange).toBeNull();
  });

  it('does not delete terminal blocks through the normal device helper', () => {
    const project = structuredClone(sampleProject);
    project.devices.push({
      ...project.devices[0],
      id: 'device-tb',
      kind: 'terminal_block',
      name: 'TB',
      rackSizeRu: 1,
    });

    const result = deleteNormalDeviceFromProject(project, 'device-tb');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Device deletion blocked: terminal blocks use the TB workflow.');
    }
  });
});
