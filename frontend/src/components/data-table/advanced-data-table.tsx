import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type VisibilityState
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FiltersDrawer, type FilterDefinition } from "@/components/filters/filters-drawer";
import { Checkbox } from "@/components/filters/inputs";
import { Skeleton } from "@/components/loaders/skeleton";
import { useLanguage } from "@/providers/language-provider";
import { cn } from "@/utils/cn";
import { safeRandomUUID } from "@/utils/random";

export type ColumnPreset = {
  id: string;
  label: string;
  columns: string[];
  description?: string;
};

type SavedView = {
  id: string;
  name: string;
  columnVisibility: VisibilityState;
  wrapText: boolean;
  density: "comfortable" | "dense";
  fitToPage: boolean;
};

type ViewPreferences = {
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  wrapText: boolean;
  density: "comfortable" | "dense";
  fitToPage: boolean;
  savedViews: SavedView[];
  activeSavedViewId: string | null;
};

const defaultPreferences: ViewPreferences = {
  columnVisibility: {},
  columnPinning: { left: [], right: [] },
  wrapText: true,
  density: "comfortable",
  fitToPage: false,
  savedViews: [],
  activeSavedViewId: null
};

type AdvancedDataTableProps<TData> = {

  data: TData[];
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  error?: string | null;
  searchableKeys?: Array<keyof TData>;
  filterDefinitions?: FilterDefinition[];
  onFiltersChange?: (filters: Record<string, string[]>) => void;
  filters?: Record<string, string[]>;
  onExportCsv?: (rows: TData[], visibleColumns: string[]) => void | Promise<void>;

  emptyState?: React.ReactNode;
  virtualizationThreshold?: number;
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
  viewStorageKey?: string;
  columnPresets?: ColumnPreset[];
  defaultColumnVisibility?: VisibilityState;
  defaultPinnedColumns?: ColumnPinningState;
};

const loadPreferences = (key?: string): ViewPreferences => {
  if (!key) return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<ViewPreferences>;
    return {
      ...defaultPreferences,
      ...parsed,
      columnVisibility: parsed.columnVisibility ?? defaultPreferences.columnVisibility,
      columnPinning: parsed.columnPinning ?? defaultPreferences.columnPinning,
      savedViews: parsed.savedViews ?? []
    };
  } catch {
    return defaultPreferences;
  }
};

const persistPreferences = (
  key: string | undefined,
  preferences: ViewPreferences
) => {
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    /* noop */
  }
};

const getColumnId = <TData,>(column: ColumnDef<TData, any>, index: number) => {
  if (column.id) return column.id;
  if (typeof column.accessorKey === "string") return column.accessorKey;
  return `col-${index}`;

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
  onRowClick,
  viewStorageKey,
  columnPresets,
  defaultColumnVisibility,
  defaultPinnedColumns
}: AdvancedDataTableProps<TData>) {
  const { t, direction } = useLanguage();
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [internalFilters, setInternalFilters] = useState<Record<string, string[]>>({});
  const [columnPanelOpen, setColumnPanelOpen] = useState(false);

  const allColumnIds = useMemo(
    () => columns.map((column, index) => getColumnId(column, index)),
    [columns]
  );

  const storedPreferences = useMemo(
    () => loadPreferences(viewStorageKey),
    [viewStorageKey]
  );

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    ...defaultPreferences.columnVisibility,
    ...defaultColumnVisibility,
    ...storedPreferences.columnVisibility
  });

  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
    storedPreferences.columnPinning.left?.length || storedPreferences.columnPinning.right?.length
      ? storedPreferences.columnPinning
      : defaultPinnedColumns ?? defaultPreferences.columnPinning
  );

  const [wrapText, setWrapText] = useState<boolean>(storedPreferences.wrapText);
  const [density, setDensity] = useState<"comfortable" | "dense">(
    storedPreferences.density
  );
  const [fitToPage, setFitToPage] = useState<boolean>(storedPreferences.fitToPage);
  const [savedViews, setSavedViews] = useState<SavedView[]>(storedPreferences.savedViews);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(
    storedPreferences.activeSavedViewId
  );


  useEffect(() => {
    if (filters) {
      setInternalFilters(filters);
    }
  }, [filters]);

   useEffect(() => {
    const preferences: ViewPreferences = {
      columnVisibility,
      columnPinning,
      wrapText,
      density,
      fitToPage,
      savedViews,
      activeSavedViewId
    };
    persistPreferences(viewStorageKey, preferences);
  }, [
    activeSavedViewId,
    columnPinning,
    columnVisibility,
    density,
    fitToPage,
    savedViews,
    viewStorageKey,
    wrapText
  ]);


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
        const value = filter.getValue
          ? filter.getValue(row)
          : (row as Record<string, unknown>)[filter.id];
        if (Array.isArray(value)) {
          return value.some((item) => active.includes(String(item)));
        }
        if (value == null) return false;
        return active.includes(String(value));

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
      globalFilter,
      columnVisibility,
      columnPinning
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,

    getRowId
  });

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const useVirtual =
    filteredWithFacets.length > virtualizationThreshold && columnPinning.left?.length === 0;


  const virtualizer = useVirtual
    ? useVirtualizer({
        count: table.getRowModel().rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => (density === "dense" ? 44 : 64),
        overscan: 8

      })
    : undefined;

  const rows = useVirtual ? virtualizer!.getVirtualItems() : table.getRowModel().rows;

  const handleFiltersChange = (value: Record<string, string[]>) => {
    setInternalFilters(value);
    onFiltersChange?.(value);
  };

  const toggleColumnPanel = useCallback(() => {
    setColumnPanelOpen((prev) => !prev);
  }, []);

  const columnPanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!columnPanelRef.current) return;
      if (columnPanelRef.current.contains(event.target as Node)) return;
      setColumnPanelOpen(false);
    };
    if (columnPanelOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [columnPanelOpen]);

  const applyPreset = useCallback(
    (preset: ColumnPreset) => {
      const visibility: VisibilityState = {};
      const nonHideable = new Set(
        table
          .getAllLeafColumns()
          .filter((column) => !column.getCanHide())
          .map((column) => column.id)
      );
      for (const id of allColumnIds) {
        visibility[id] = preset.columns.includes(id) || nonHideable.has(id);
      }
      setColumnVisibility(visibility);
      setActiveSavedViewId(null);
      setColumnPanelOpen(false);
    },
    [allColumnIds, table]
  );

  const toggleWrap = () => {
    setWrapText((prev) => !prev);
  };

  const toggleDensity = () => {
    setDensity((prev) => (prev === "comfortable" ? "dense" : "comfortable"));
  };

  const toggleFitToPage = () => {
    setFitToPage((prev) => !prev);
  };

  const handleSaveView = useCallback(() => {
    const name = prompt(t("viewNamePrompt" as any) ?? "View name");
    if (!name) return;
    const view: SavedView = {
      id: safeRandomUUID(),
      name,
      columnVisibility: { ...columnVisibility },
      wrapText,
      density,
      fitToPage
    };
    setSavedViews((prev) => [...prev, view]);
    setActiveSavedViewId(view.id);
  }, [columnVisibility, density, fitToPage, t, wrapText]);

  const handleApplyView = useCallback((view: SavedView) => {
    setColumnVisibility({ ...view.columnVisibility });
    setWrapText(view.wrapText);
    setDensity(view.density);
    setFitToPage(view.fitToPage);
    setActiveSavedViewId(view.id);
    setColumnPanelOpen(false);
  }, []);

  const handleRemoveView = useCallback((view: SavedView) => {
    setSavedViews((prev) => prev.filter((item) => item.id !== view.id));
    if (activeSavedViewId === view.id) {
      setActiveSavedViewId(null);
    }
  }, [activeSavedViewId]);

  const visibleColumnIds = table
    .getVisibleLeafColumns()
    .map((column) => column.id ?? column.columnDef.id ?? "");

  const handleExport = () => {
    if (!onExportCsv) return;
    void onExportCsv(table.getRowModel().rows.map((row) => row.original), visibleColumnIds);
  };

  const headerPadding = density === "dense" ? "py-2" : "py-3";
  const cellPadding = density === "dense" ? "py-2" : "py-4";
  const wrapClass = wrapText ? "whitespace-normal break-words" : "whitespace-nowrap";
  const fitClass = fitToPage ? "max-w-[220px] truncate" : "";


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
          <Button variant="outline" onClick={handleExport}>
            {t("exportCSV")}
          </Button>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant={wrapText ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleWrap}
          >
            {wrapText ? t("wrapOn" as any) ?? "Wrap on" : t("wrapOff" as any) ?? "Wrap off"}
          </Button>
          <Button
            variant={density === "dense" ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleDensity}
          >
            {density === "dense" ? t("comfortable" as any) ?? "Comfortable" : t("dense" as any) ?? "Dense"}
          </Button>
          <Button
            variant={fitToPage ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleFitToPage}
          >
            {t("fitToPage" as any) ?? "Fit to page"}
          </Button>
          <div className="relative" ref={columnPanelRef}>
            <Button variant="ghost" size="sm" onClick={toggleColumnPanel}>
              {t("columnSettings" as any) ?? "Columns"}
            </Button>
            {columnPanelOpen ? (
              <div
                className={cn(
                  "absolute z-50 mt-2 w-72 rounded-3xl border border-border bg-white p-4 shadow-soft",
                  direction === "rtl" ? "right-0" : "left-0"
                )}
              >
                {columnPresets && columnPresets.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("presets" as any) ?? "Presets"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {columnPresets.map((preset) => (
                        <Button
                          key={preset.id}
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreset(preset)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("columns" as any) ?? "Columns"}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {table.getAllLeafColumns().map((column) => {
                      const label =
                        (column.columnDef.meta as { label?: string })?.label ??
                        (typeof column.columnDef.header === "string"
                          ? (column.columnDef.header as string)
                          : column.id);
                      if (!column.getCanHide()) {
                        return (
                          <div
                            key={column.id}
                            className="flex items-center justify-between rounded-2xl border border-dashed border-border px-3 py-2 text-xs text-slate-500"
                          >
                            <span>{label}</span>
                            <span>{t("pinned" as any) ?? "Pinned"}</span>
                          </div>
                        );
                      }
                      return (
                        <Checkbox
                          key={column.id}
                          label={label}
                          checked={column.getIsVisible()}
                          onCheckedChange={(checked) => column.toggleVisibility(checked)}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t("savedViews" as any) ?? "Saved views"}
                    </p>
                    <Button size="sm" variant="ghost" onClick={handleSaveView}>
                      {t("saveCurrent" as any) ?? "Save current"}
                    </Button>
                  </div>
                  {savedViews.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      {t("noSavedViews" as any) ?? "No saved views yet"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {savedViews.map((view) => (
                        <div
                          key={view.id}
                          className={cn(
                            "flex items-center justify-between rounded-2xl border border-border px-3 py-2",
                            activeSavedViewId === view.id && "border-primary bg-primary/5"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleApplyView(view)}
                            className="text-sm font-medium text-primary"
                          >
                            {view.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveView(view)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            {t("remove" as any) ?? "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

      </div>
      <div
        ref={tableContainerRef}
        className={cn(
          "overflow-auto rounded-3xl border border-border bg-white shadow-soft",
          useVirtual ? "max-h-[640px]" : ""
        )}
      >
        <table
          className={cn(
            "min-w-full border-collapse",
            fitToPage ? "table-fixed" : "table-auto"
          )}
        >
          <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();
                  const start = isPinned
                    ? header.column.getIsPinned() === "left"
                      ? header.column.getStart("left")
                      : header.column.getStart("right")
                    : 0;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "border-b border-border px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
                        headerPadding,
                        isPinned ? "bg-muted/80" : "",
                        direction === "rtl" ? "text-right" : "text-left"
                      )}
                      style={
                        isPinned
                          ? {
                              position: "sticky",
                              zIndex: 30,
                              [header.column.getIsPinned() === "left" ? "left" : "right"]: `${start}px`
                            }
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}

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
                            <div
                              key={cell.id}
                              className={cn(
                                "px-2 text-sm text-slate-600",
                                cellPadding,
                                fitClass,
                                wrapClass
                              )}
                            >

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
              table.getRowModel().rows.map((row, rowIndex) => (

                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border transition hover:bg-muted/60",
                    onRowClick && "cursor-pointer",
                    rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isPinned = cell.column.getIsPinned();
                    const start = isPinned
                      ? cell.column.getIsPinned() === "left"
                        ? cell.column.getStart("left")
                        : cell.column.getStart("right")
                      : 0;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-4 text-sm text-slate-600",
                          cellPadding,
                          fitClass,
                          wrapClass
                        )}
                        style={
                          isPinned
                            ? {
                                position: "sticky",
                                zIndex: 25,
                                background: rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc",
                                [cell.column.getIsPinned() === "left" ? "left" : "right"]: `${start}px`
                              }
                            : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <div>
          {t("rows" as any) ?? "Rows"}: {filteredWithFacets.length} / {data.length}

        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("previous" as any) ?? "Prev"}
          </Button>
          <span>
            {t("page" as any) ?? "Page"} {table.getState().pagination.pageIndex + 1} {" "}
            {t("of" as any) ?? "of"} {table.getPageCount()}

          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("next" as any) ?? "Next"}

          </Button>
        </div>
      </div>
    </div>
  );
}
