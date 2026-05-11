import { describe, expect, it } from 'vitest';
import type { CableTableRow } from '../cables/cableRows';
import { filterCableRows, type CableFilters } from '../cables/cableFilters';

const rows: CableTableRow[] = [
  {
    id: 'cable-1',
    cableNumber: 'V-0001',
    sideALabel: 'ROUTER-OUT-001',
    sideBLabel: 'N/C',
    locationA: 'CAR',
    locationB: 'N/C',
    connectorA: 'BNC',
    connectorB: 'N/C',
    status: 'planned',
  },
  {
    id: 'cable-2',
    cableNumber: 'V-0002',
    sideALabel: 'ROUTER-OUT-002',
    sideBLabel: 'SW-IN-001',
    locationA: 'CAR',
    locationB: 'CAR',
    connectorA: 'BNC',
    connectorB: 'BNC',
    status: 'connected',
  },
];

describe('filterCableRows', () => {
  it('treats an omitted column filter as select all', () => {
    expect(filterCableRows(rows, {})).toHaveLength(2);
  });

  it('treats an empty column filter as clear to none', () => {
    const filters: CableFilters = { status: new Set() };

    expect(filterCableRows(rows, filters)).toEqual([]);
  });

  it('uses OR inside one column and AND across columns', () => {
    const filters: CableFilters = {
      status: new Set(['planned', 'connected']),
      sideBLabel: new Set(['SW-IN-001']),
    };

    expect(filterCableRows(rows, filters).map((row) => row.cableNumber)).toEqual(['V-0002']);
  });
});
