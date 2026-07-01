import type { ProjectRoot, ValidationIssue } from '../types';
import { isPositiveInteger, rangesOverlap, type ValidationIssueBuilder } from './shared';

export function validateLedgerRanges(
  project: ProjectRoot,
  cablePrefixes: Set<string>,
  issue: ValidationIssueBuilder,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const checkedPlannedCableIds = new Set<string>();

  for (const ledger of project.numberingLedgers) {
    if (!cablePrefixes.has(ledger.prefix)) {
      continue;
    }

    if (!isPositiveInteger(ledger.nextSuggested)) {
      issues.push(
        issue(
          'error',
          'ledger-next-suggested-positive',
          `Ledger ${ledger.prefix} nextSuggested must be a positive integer.`,
          'numberingLedger',
          ledger.prefix,
        ),
      );
    }

    if (
      ledger.ranges.some(
        (range) => ledger.nextSuggested >= range.from && ledger.nextSuggested <= range.to,
      )
    ) {
      issues.push(
        issue(
          'error',
          'ledger-next-suggested-available',
          `Ledger ${ledger.prefix} nextSuggested must point to an available cable number.`,
          'numberingLedger',
          ledger.prefix,
        ),
      );
    }

    for (const range of ledger.ranges) {
      if (!isPositiveInteger(range.from) || !isPositiveInteger(range.to)) {
        issues.push(
          issue(
            'error',
            'numbering-range-positive',
            `Numbering range ${range.id} from/to values must be positive integers.`,
            'numberingRange',
            range.id,
          ),
        );
      }

      if (Number.isFinite(range.from) && Number.isFinite(range.to) && range.to < range.from) {
        issues.push(
          issue(
            'error',
            'numbering-range-to-before-from',
            `Numbering range ${range.id} must end at or after its start.`,
            'numberingRange',
            range.id,
          ),
        );
      }

      if (range.prefix !== ledger.prefix) {
        issues.push(
          issue(
            'error',
            'numbering-range-prefix-mismatch',
            `Numbering range ${range.id} prefix must match parent ledger ${ledger.prefix}.`,
            'numberingRange',
            range.id,
          ),
        );
      }

      if (range.status === 'allocated' && (!range.ownerType || !range.ownerId)) {
        issues.push(
          issue(
            'error',
            'allocated-range-without-owner',
            `Allocated range ${range.prefix}-${range.from}-${range.to} has no owner.`,
            'numberingRange',
            range.id,
          ),
        );
      }
    }

    for (const cable of project.cables.filter(
      (item) => item.status === 'planned' && item.prefix === ledger.prefix,
    )) {
      const owningRange = ledger.ranges.find(
        (range) =>
          range.status === 'allocated' &&
          cable.index >= range.from &&
          cable.index <= range.to,
      );
      checkedPlannedCableIds.add(cable.id);

      if (!owningRange) {
        issues.push(
          issue(
            'error',
            'planned-cable-without-ledger-range',
            `Planned cable ${cable.number} is not covered by an allocated ledger range.`,
            'cable',
            cable.id,
          ),
        );
      }
    }

    for (let leftIndex = 0; leftIndex < ledger.ranges.length; leftIndex += 1) {
      const left = ledger.ranges[leftIndex];

      for (let rightIndex = leftIndex + 1; rightIndex < ledger.ranges.length; rightIndex += 1) {
        const right = ledger.ranges[rightIndex];

        if (rangesOverlap(left.from, left.to, right.from, right.to)) {
          issues.push(
            issue(
              'error',
              'overlapping-numbering-ledger-ranges',
              `Numbering ranges overlap for prefix ${ledger.prefix}.`,
              'numberingLedger',
              ledger.prefix,
            ),
          );
        }
      }
    }
  }

  for (const cable of project.cables.filter((item) => item.status === 'planned')) {
    if (!checkedPlannedCableIds.has(cable.id)) {
      issues.push(
        issue(
          'error',
          'planned-cable-without-ledger-range',
          `Planned cable ${cable.number} is not covered by an allocated ledger range.`,
          'cable',
          cable.id,
        ),
      );
    }
  }

  return issues;
}

export function validateReservedGapReuse(
  project: ProjectRoot,
  issue: ValidationIssueBuilder,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const ledger of project.numberingLedgers) {
    const reservedGaps = ledger.ranges.filter((range) => range.status === 'reserved_gap');

    for (const cable of project.cables.filter((item) => item.prefix === ledger.prefix)) {
      if (reservedGaps.some((range) => cable.index >= range.from && cable.index <= range.to)) {
        issues.push(
          issue(
            'error',
            'reserved-gap-reused',
            `Cable ${cable.number} reuses a reserved gap.`,
            'cable',
            cable.id,
          ),
        );
      }
    }

    for (const allocated of ledger.ranges.filter((range) => range.status === 'allocated')) {
      const reservedGap = reservedGaps.find((range) =>
        rangesOverlap(allocated.from, allocated.to, range.from, range.to),
      );

      if (reservedGap) {
        issues.push(
          issue(
            'error',
            'reserved-gap-reused',
            `Allocated range ${allocated.id} overlaps reserved gap ${reservedGap.id}.`,
            'numberingRange',
            allocated.id,
          ),
        );
      }
    }
  }

  return issues;
}
