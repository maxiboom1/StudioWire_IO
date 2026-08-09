import { describe, expect, it } from 'vitest';
import { allocateCableRange, formatCableNumber, getLedgerForPrefix, parseCableNumber } from './cableNumbers';
import { createEmptyProject } from './projectFactory';

function createTestProject() {
  return createEmptyProject({
    id: 'project-cable-number-tests',
    name: 'Cable Number Tests',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
  });
}

describe('parseCableNumber', () => {
  it('parses V-0001', () => {
    expect(parseCableNumber('V-0001')).toEqual({
      prefix: 'V',
      index: 1,
    });
  });

  it('parses RF-0001', () => {
    expect(parseCableNumber('RF-0001')).toEqual({
      prefix: 'RF',
      index: 1,
    });
  });

  it('accepts the three-digit minimum and retains longer legacy/growing values', () => {
    expect(parseCableNumber('A-001').index).toBe(1);
    expect(parseCableNumber('A-0001').index).toBe(1);
    expect(parseCableNumber('A-1023').index).toBe(1023);
    expect(() => parseCableNumber('A-01')).toThrow();
  });

  it('rejects invalid cable numbers', () => {
    expect(() => parseCableNumber('V0001')).toThrow();
    expect(() => parseCableNumber('V-0000')).toThrow();
    expect(() => parseCableNumber('V-1')).toThrow();
    expect(() => parseCableNumber('v-0001')).toThrow();
  });
});

describe('formatCableNumber', () => {
  it('formats V 1 as V-001', () => {
    expect(formatCableNumber('V', 1)).toBe('V-001');
  });

  it('supports multi-letter prefixes', () => {
    expect(formatCableNumber('RF', 7)).toBe('RF-007');
  });

  it('grows naturally past the three-digit minimum', () => {
    expect(formatCableNumber('A', 999)).toBe('A-999');
    expect(formatCableNumber('A', 1000)).toBe('A-1000');
    expect(formatCableNumber('A', 10000)).toBe('A-10000');
  });
});

describe('allocateCableRange', () => {
  it('keeps getLedgerForPrefix pure and commits missing ledgers only during allocation', () => {
    const project = createTestProject();
    const ledger = getLedgerForPrefix(project, 'V');

    expect(ledger).toMatchObject({ prefix: 'V', nextSuggested: 1, ranges: [] });
    expect(project.numberingLedgers).toEqual([]);

    const result = allocateCableRange(project, {
      prefix: 'V',
      firstCableNumber: 1,
      count: 1,
      ownerType: 'test',
      ownerId: 'range-1',
      reason: 'Initial video range',
    });

    expect(result.project.numberingLedgers).toHaveLength(1);
    expect(result.project.numberingLedgers[0]).toMatchObject({ prefix: 'V', nextSuggested: 2 });
    expect(project.numberingLedgers).toEqual([]);
  });

  it('allocates V-0001 to V-0040', () => {
    const project = createTestProject();
    const result = allocateCableRange(project, {
      prefix: 'V',
      firstCableNumber: 1,
      count: 40,
      ownerType: 'test',
      ownerId: 'range-1',
      reason: 'Initial video range',
    });

    expect(result.preview.errors).toEqual([]);
    expect(result.allocatedRange).toMatchObject({
      prefix: 'V',
      from: 1,
      to: 40,
      status: 'allocated',
    });
    expect(result.project.numberingLedgers[0]).toMatchObject({
      prefix: 'V',
      nextSuggested: 41,
    });
  });

  it('allocates next range starting V-0050 and creates reserved gap V-0041 to V-0049', () => {
    const first = allocateCableRange(createTestProject(), {
      prefix: 'V',
      firstCableNumber: 1,
      count: 40,
      ownerType: 'test',
      ownerId: 'range-1',
      reason: 'Initial video range',
    });
    const second = allocateCableRange(first.project, {
      prefix: 'V',
      firstCableNumber: 50,
      count: 10,
      ownerType: 'test',
      ownerId: 'range-2',
      reason: 'Second video range',
    });

    expect(second.preview.errors).toEqual([]);
    expect(second.reservedGapRange).toMatchObject({
      prefix: 'V',
      from: 41,
      to: 49,
      status: 'reserved_gap',
    });
    expect(second.allocatedRange).toMatchObject({
      prefix: 'V',
      from: 50,
      to: 59,
      status: 'allocated',
    });
    expect(second.project.numberingLedgers[0].nextSuggested).toBe(60);
  });

  it('rejects allocation inside a reserved gap', () => {
    const first = allocateCableRange(createTestProject(), {
      prefix: 'V',
      firstCableNumber: 1,
      count: 40,
      ownerType: 'test',
      ownerId: 'range-1',
      reason: 'Initial video range',
    });
    const second = allocateCableRange(first.project, {
      prefix: 'V',
      firstCableNumber: 50,
      count: 10,
      ownerType: 'test',
      ownerId: 'range-2',
      reason: 'Second video range',
    });
    const rejected = allocateCableRange(second.project, {
      prefix: 'V',
      firstCableNumber: 45,
      count: 1,
      ownerType: 'test',
      ownerId: 'reserved-gap-reuse',
      reason: 'Reserved gap reuse',
    });

    expect(rejected.preview.errors.map((error) => error.code)).toContain('allocation-before-next-suggested');
    expect(rejected.allocatedRange).toBeNull();
  });

  it('rejects allocation lower than nextSuggested', () => {
    const first = allocateCableRange(createTestProject(), {
      prefix: 'V',
      firstCableNumber: 1,
      count: 40,
      ownerType: 'test',
      ownerId: 'range-1',
      reason: 'Initial video range',
    });
    const rejected = allocateCableRange(first.project, {
      prefix: 'V',
      firstCableNumber: 39,
      count: 1,
      ownerType: 'test',
      ownerId: 'backfill',
      reason: 'Backfill allocation',
    });

    expect(rejected.preview.errors.map((error) => error.code)).toContain('allocation-before-next-suggested');
    expect(rejected.project).toBe(first.project);
  });

  it('rejects overlap with allocated range', () => {
    const first = allocateCableRange(createTestProject(), {
      prefix: 'V',
      firstCableNumber: 1,
      count: 40,
      ownerType: 'test',
      ownerId: 'range-1',
      reason: 'Initial video range',
    });
    const staleProject = {
      ...first.project,
      numberingLedgers: first.project.numberingLedgers.map((ledger) => ({
        ...ledger,
        nextSuggested: 1,
      })),
    };
    const rejected = allocateCableRange(staleProject, {
      prefix: 'V',
      firstCableNumber: 20,
      count: 5,
      ownerType: 'test',
      ownerId: 'overlap',
      reason: 'Overlapping allocation',
    });

    expect(rejected.preview.errors.map((error) => error.code)).toContain('range-overlap');
    expect(rejected.allocatedRange).toBeNull();
  });
});
