import { makeId, nowIso } from './id';
import type { NumberingLedger, NumberingRange, ProjectRoot } from './types';

export interface ParsedCableNumber {
  prefix: string;
  index: number;
}

export interface CableNumberError {
  code: string;
  message: string;
}

export interface ReservedGapPreview {
  prefix: string;
  from: number;
  to: number;
  status: 'reserved_gap';
}

export interface CableRangePreview {
  prefix: string;
  from: number;
  to: number;
  lastCableNumber: string;
  reservedGap: ReservedGapPreview | null;
  errors: CableNumberError[];
}

export interface AllocateCableRangeInput {
  prefix: string;
  firstCableNumber: number;
  count: number;
  ownerType: string;
  ownerId: string;
  reason: string;
}

export interface AllocateCableRangeResult {
  project: ProjectRoot;
  preview: CableRangePreview;
  allocatedRange: NumberingRange | null;
  reservedGapRange: NumberingRange | null;
}

const CABLE_NUMBER_PATTERN = /^([A-Z]+)-([0-9]{4,})$/;
const MIN_CABLE_NUMBER_DIGITS = 4;

export function parseCableNumber(input: string): ParsedCableNumber {
  const match = input.trim().match(CABLE_NUMBER_PATTERN);

  if (!match) {
    throw new Error(`Invalid cable number format: ${input}`);
  }

  const index = Number(match[2]);

  if (!Number.isSafeInteger(index) || index < 1) {
    throw new Error(`Cable number index must be a positive integer: ${input}`);
  }

  return {
    prefix: match[1],
    index,
  };
}

export function formatCableNumber(prefix: string, index: number): string {
  const normalizedPrefix = normalizePrefix(prefix);

  assertPositiveInteger(index, 'index');

  return `${normalizedPrefix}-${String(index).padStart(MIN_CABLE_NUMBER_DIGITS, '0')}`;
}

export function getLedgerForPrefix(project: ProjectRoot, prefix: string): NumberingLedger {
  const normalizedPrefix = normalizePrefix(prefix);
  const existingLedger = project.numberingLedgers.find((ledger) => ledger.prefix === normalizedPrefix);

  if (existingLedger) {
    return existingLedger;
  }

  const ledger: NumberingLedger = {
    prefix: normalizedPrefix,
    nextSuggested: 1,
    ranges: [],
  };

  return ledger;
}

export function previewCableRange(
  project: ProjectRoot,
  prefix: string,
  firstCableNumber: number,
  count: number,
): CableRangePreview {
  const errors: CableNumberError[] = [];
  const normalizedPrefix = normalizePrefix(prefix);

  validatePositiveInteger(firstCableNumber, 'firstCableNumber', errors);
  validatePositiveInteger(count, 'count', errors);

  const from = firstCableNumber;
  const hasValidRange = errors.length === 0;
  const to = hasValidRange ? firstCableNumber + count - 1 : firstCableNumber;
  const ledger = project.numberingLedgers.find((item) => item.prefix === normalizedPrefix);
  const nextSuggested = ledger?.nextSuggested ?? 1;

  if (hasValidRange && firstCableNumber < nextSuggested) {
    errors.push({
      code: 'allocation-before-next-suggested',
      message: `New ${normalizedPrefix} allocations must start at or after ${formatCableNumber(
        normalizedPrefix,
        nextSuggested,
      )}.`,
    });
  }

  const overlappingRange =
    hasValidRange
      ? ledger?.ranges.find((range) => rangesOverlap(from, to, range.from, range.to)) ?? null
      : null;

  if (overlappingRange) {
    errors.push({
      code: 'range-overlap',
      message: `${formatCableNumber(normalizedPrefix, from)} to ${formatCableNumber(
        normalizedPrefix,
        to,
      )} overlaps existing ${overlappingRange.status} range ${formatCableNumber(
        overlappingRange.prefix,
        overlappingRange.from,
      )} to ${formatCableNumber(overlappingRange.prefix, overlappingRange.to)}.`,
    });
  }

  const reservedGap =
    errors.length === 0 && firstCableNumber > nextSuggested
      ? {
          prefix: normalizedPrefix,
          from: nextSuggested,
          to: firstCableNumber - 1,
          status: 'reserved_gap' as const,
        }
      : null;

  return {
    prefix: normalizedPrefix,
    from,
    to,
    lastCableNumber: hasValidRange ? formatCableNumber(normalizedPrefix, to) : '',
    reservedGap,
    errors,
  };
}

export function allocateCableRange(
  project: ProjectRoot,
  input: AllocateCableRangeInput,
): AllocateCableRangeResult {
  const preview = previewCableRange(project, input.prefix, input.firstCableNumber, input.count);

  if (preview.errors.length > 0) {
    return {
      project,
      preview,
      allocatedRange: null,
      reservedGapRange: null,
    };
  }

  const updatedProject: ProjectRoot = structuredClone(project);
  const ledger = getLedgerForPrefix(updatedProject, preview.prefix);

  if (!updatedProject.numberingLedgers.some((item) => item.prefix === ledger.prefix)) {
    updatedProject.numberingLedgers.push(ledger);
  }

  const timestamp = nowIso();
  const reservedGapRange = preview.reservedGap
    ? createNumberingRange({
        prefix: preview.prefix,
        from: preview.reservedGap.from,
        to: preview.reservedGap.to,
        status: 'reserved_gap',
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        reason: 'Reserved skipped cable number gap',
        createdAt: timestamp,
      })
    : null;
  const allocatedRange = createNumberingRange({
    prefix: preview.prefix,
    from: preview.from,
    to: preview.to,
    status: 'allocated',
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    reason: input.reason,
    createdAt: timestamp,
  });

  if (reservedGapRange) {
    ledger.ranges.push(reservedGapRange);
  }

  ledger.ranges.push(allocatedRange);
  ledger.ranges.sort((left, right) => left.from - right.from);
  ledger.nextSuggested = preview.to + 1;

  return {
    project: updatedProject,
    preview,
    allocatedRange,
    reservedGapRange,
  };
}

function createNumberingRange(input: Omit<NumberingRange, 'id'>): NumberingRange {
  const suffix =
    input.status === 'reserved_gap'
      ? `${input.prefix}-reserved-gap-${input.from}-${input.to}`
      : `${input.prefix}-${input.from}-${input.to}-${input.ownerType}-${input.ownerId}`;

  return {
    id: makeId('range', suffix),
    ...input,
  };
}

function normalizePrefix(prefix: string): string {
  const normalizedPrefix = prefix.trim().toUpperCase();

  if (!/^[A-Z]+$/.test(normalizedPrefix)) {
    throw new Error(`Invalid cable prefix: ${prefix}`);
  }

  return normalizedPrefix;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function validatePositiveInteger(
  value: number,
  label: string,
  errors: CableNumberError[],
): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    errors.push({
      code: 'invalid-positive-integer',
      message: `${label} must be a positive integer.`,
    });
  }
}

function rangesOverlap(leftFrom: number, leftTo: number, rightFrom: number, rightTo: number): boolean {
  return leftFrom <= rightTo && rightFrom <= leftTo;
}
