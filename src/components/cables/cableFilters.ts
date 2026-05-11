import type { CableTableRow } from './cableRows';

export type CableColumnId = keyof Omit<CableTableRow, 'id'>;
export type CableFilters = Partial<Record<CableColumnId, Set<string>>>;

export function filterCableRows(rows: CableTableRow[], filters: CableFilters) {
  return rows.filter((row) =>
    Object.entries(filters).every(([columnId, selectedValues]) => {
      if (!selectedValues) {
        return true;
      }

      return selectedValues.has(String(row[columnId as CableColumnId]));
    }),
  );
}
