import { Filter, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildCableTableRows, type CableTableRow } from '../cables/cableRows';
import { useProject } from '../../state/ProjectContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

type CableColumnId = keyof Omit<CableTableRow, 'id'>;
type CableFilters = Partial<Record<CableColumnId, Set<string>>>;

interface CableColumn {
  id: CableColumnId;
  label: string;
  shortLabel: string;
  className?: string;
}

const CABLE_COLUMNS: CableColumn[] = [
  { id: 'cableNumber', label: 'Cable num', shortLabel: 'Cable', className: 'cables-col-number' },
  { id: 'sideALabel', label: 'Side-A label', shortLabel: 'Side A' },
  { id: 'sideBLabel', label: 'Side-B label', shortLabel: 'Side B' },
  { id: 'locationA', label: 'Location A', shortLabel: 'Loc A' },
  { id: 'locationB', label: 'Location B', shortLabel: 'Loc B' },
  { id: 'connectorA', label: 'Connector A', shortLabel: 'Conn A' },
  { id: 'connectorB', label: 'Connector B', shortLabel: 'Conn B' },
  { id: 'status', label: 'System status', shortLabel: 'Status', className: 'cables-col-status' },
];

export function CablesWorkspace() {
  const { project } = useProject();
  const rows = useMemo(() => buildCableTableRows(project), [project]);
  const [filters, setFilters] = useState<CableFilters>({});
  const activeFilterCount = Object.keys(filters).length;
  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        CABLE_COLUMNS.every((column) => {
          const selectedValues = filters[column.id];

          return !selectedValues || selectedValues.has(String(row[column.id]));
        }),
      ),
    [filters, rows],
  );

  function clearAllFilters() {
    setFilters({});
  }

  return (
    <section className="workspace cables-workspace" aria-label="Cables workspace">
      <div className="cables-register">
        <div className="cables-register-toolbar">
          <div>
            <h1>Cables</h1>
            <p>
              {filteredRows.length} of {rows.length} cable(s) shown
            </p>
          </div>
          {activeFilterCount > 0 ? (
            <Button variant="outline" size="sm" type="button" onClick={clearAllFilters}>
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="cables-empty-state">
            <h2>No cables registered.</h2>
            <p>Planned cables appear here after devices or terminal blocks create cable records.</p>
          </div>
        ) : (
          <div className="cables-table-area">
            <Table className="cables-register-table">
              <TableHeader>
                <TableRow>
                  {CABLE_COLUMNS.map((column) => (
                    <TableHead className={column.className} key={column.id}>
                      <CableColumnFilter
                        column={column}
                        filters={filters}
                        rows={rows}
                        setFilters={setFilters}
                      />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={CABLE_COLUMNS.length}>
                      <div className="cables-filter-empty">
                        <h2>No matching cables.</h2>
                        <p>Clear filters or select more values to show rows.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="cables-cell-number">{row.cableNumber}</TableCell>
                      <TableCell>{row.sideALabel}</TableCell>
                      <TableCell>{row.sideBLabel}</TableCell>
                      <TableCell>{row.locationA}</TableCell>
                      <TableCell>{row.locationB}</TableCell>
                      <TableCell>{row.connectorA}</TableCell>
                      <TableCell>{row.connectorB}</TableCell>
                      <TableCell>
                        <Badge className={`cables-status-badge cables-status-${row.status}`}>{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}

function CableColumnFilter({
  column,
  filters,
  rows,
  setFilters,
}: {
  column: CableColumn;
  filters: CableFilters;
  rows: CableTableRow[];
  setFilters: (filters: CableFilters | ((current: CableFilters) => CableFilters)) => void;
}) {
  const [search, setSearch] = useState('');
  const allValues = useMemo(() => {
    const values = Array.from(new Set(rows.map((row) => String(row[column.id]))));

    return values.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  }, [column.id, rows]);
  const visibleValues = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return allValues;
    }

    return allValues.filter((value) => value.toLowerCase().includes(normalizedSearch));
  }, [allValues, search]);
  const selectedValues = filters[column.id];
  const isFiltered = Boolean(selectedValues);
  const selectedCount = selectedValues?.size ?? allValues.length;

  function clearColumnFilter() {
    setFilters((current) => {
      const next = { ...current };
      delete next[column.id];

      return next;
    });
  }

  function toggleValue(value: string) {
    setFilters((current) => {
      const currentSelected = current[column.id] ?? new Set(allValues);
      const nextSelected = new Set(currentSelected);

      if (nextSelected.has(value)) {
        nextSelected.delete(value);
      } else {
        nextSelected.add(value);
      }

      const next = { ...current };

      if (nextSelected.size === allValues.length) {
        delete next[column.id];
      } else {
        next[column.id] = nextSelected;
      }

      return next;
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Filter ${column.label}`}
          className={isFiltered ? 'cables-filter-button is-filtered' : 'cables-filter-button'}
          size="sm"
          type="button"
          variant="ghost"
        >
          <span title={column.label}>{column.shortLabel}</span>
          <Filter className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="cables-filter-menu">
        <DropdownMenuLabel>
          {column.label}
          {isFiltered ? <span>{selectedCount} selected</span> : <span>All</span>}
        </DropdownMenuLabel>
        <div className="cables-filter-search" onKeyDown={(event) => event.stopPropagation()}>
          <Input
            aria-label={`Search ${column.label} values`}
            placeholder="Search values"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="cables-filter-actions">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              clearColumnFilter();
            }}
          >
            Select all
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              clearColumnFilter();
            }}
          >
            Clear
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator />
        <div className="cables-filter-values">
          {visibleValues.length === 0 ? (
            <div className="cables-filter-no-values">No values</div>
          ) : (
            visibleValues.map((value) => (
              <DropdownMenuCheckboxItem
                checked={!selectedValues || selectedValues.has(value)}
                key={value}
                onCheckedChange={() => toggleValue(value)}
                onSelect={(event) => event.preventDefault()}
              >
                <span className="cables-filter-value-label">{value}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
