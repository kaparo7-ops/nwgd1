import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiltersDrawer, type FilterDefinition } from "@/components/filters/filters-drawer";
import { Skeleton } from "@/components/loaders/skeleton";
import { useLanguage } from "@/providers/language-provider";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/utils/cn";

export type AdvancedDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  error?: string | null;
  searchableKeys?: Array<keyof TData>;
  filterDefinitions?: FilterDefinition[];
  onFiltersChange?: (filters: Record<string, string[]>) => void;
  filters?: Record<string, string[]>;
  onExportCsv?: () => void | Promise<void>;
  emptyState?: React.ReactNode;
  virtualizationThreshold?: number;
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
};

export function AdvancedDataTable<TData>({
  data,
  columns,
  isLoading,
  error,
  searchableKeys,
  filterDefinitions,
  onFiltersChange,
  filters,
  onExportCsv,
  emptyState,
  virtualizationThreshold = 1000,
  getRowId,
  onRowClick
}: AdvancedDataTableProps<TData>) {
  const { t } = useLanguage();
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [internalFilters, setInternalFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (filters) {
      setInternalFilters(filters);
    }
  }, [filters]);

  const filteredData = useMemo(() => {
    if (!searchableKeys || globalFilter.trim() === "") return data;
    const term = globalFilter.toLowerCase();
    return data.filter((row) =>
      searchableKeys.some((key) =>
        String(row[key] ?? "")
          .toLowerCase()
          .includes(term)
      )
    );
  }, [data, globalFilter, searchableKeys]);

  const filteredWithFacets = useMemo(() => {
    if (!filterDefinitions) return filteredData;
    return filteredData.filter((row) =>
      filterDefinitions.every((filter) => {
        const active = internalFilters[filter.id];
        if (!active || active.length === 0) return true;
        const value = String((row as Record<string, unknown>)[filter.id] ?? "");
        return active.includes(value);
      })
    );
  }, [filterDefinitions, filteredData, internalFilters]);

  const table = useReactTable({
    data: filteredWithFacets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      columnFilters,
      globalFilter
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getRowId
  });

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const useVirtual = filteredWithFacets.length > virtualizationThreshold;
  const virtualizer = useVirtual
    ? useVirtualizer({
        count: table.getRowModel().rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 56,
        overscan: 10
      })
    : undefined;

  const rows = useVirtual ? virtualizer!.getVirtualItems() : table.getRowModel().rows;

  const handleFiltersChange = (value: Record<string, string[]>) => {
    setInternalFilters(value);
    onFiltersChange?.(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder={t("search")}
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-xs"
        />
        {filterDefinitions ? (
          <FiltersDrawer
            availableFilters={filterDefinitions}
            value={internalFilters}
            onChange={handleFiltersChange}
          />
        ) : null}
        {onExportCsv ? (
          <Button variant="outline" onClick={() => void onExportCsv()}>
            {t("exportCSV")}
          </Button>
        ) : null}
      </div>
      <div
        ref={tableContainerRef}
        className={cn(
          "overflow-auto rounded-3xl border border-border bg-white shadow-soft",
          useVirtual ? "max-h-[640px]" : ""
        )}
      >
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="sticky top-0 whitespace-nowrap border-b border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-6 w-full" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-slate-500">
                  {emptyState ?? t("noResults")}
                </td>
              </tr>
            ) : useVirtual ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div
                    style={{
                      height: virtualizer!.getTotalSize(),
                      position: "relative"
                    }}
                  >
                    {virtualizer!.getVirtualItems().map((virtualRow) => {
                      const row = table.getRowModel().rows[virtualRow.index];
                      return (
                        <div
                          key={row.id}
                          data-index={virtualRow.index}
                          ref={virtualizer!.measureElement}
                          className={cn(
                            "absolute left-0 right-0 grid items-center border-b border-border px-4",
                            virtualRow.index % 2 === 0 ? "bg-white" : "bg-slate-50"
                          )}
                          style={{
                            transform: `translateY(${virtualRow.start}px)`,
                            display: "grid",
                            gridTemplateColumns: `repeat(${row.getVisibleCells().length}, minmax(0, 1fr))`
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <div key={cell.id} className="px-2 py-4 text-sm text-slate-600">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border transition hover:bg-muted/60",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-4 text-sm text-slate-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <div>
          Rows: {filteredWithFacets.length} / {data.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prev
          </Button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
