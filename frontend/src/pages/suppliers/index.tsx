import { useQuery } from "@tanstack/react-query";
import { listSuppliers } from "@/services/mockApi";
import type { ColumnDef } from "@tanstack/react-table";
import type { Supplier } from "@/utils/types";
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table";
import { useMemo } from "react";

export function SuppliersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["suppliers"],
    queryFn: listSuppliers
  });

  const columns: ColumnDef<Supplier>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Supplier" },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "rating", header: "Rating" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "country", header: "Country" }
    ],
    []
  );

  const filterDefinitions = useMemo(
    () => [
      {
        id: "category",
        label: "Category",
        options: Array.from(new Set((data ?? []).map((supplier) => supplier.category))).map(
          (category) => ({ value: category, label: category })
        )
      },
      {
        id: "country",
        label: "Country",
        options: Array.from(new Set((data ?? []).map((supplier) => supplier.country))).map(
          (country) => ({ value: country, label: country })
        )
      }
    ],
    [data]
  );

  return (
    <AdvancedDataTable
      data={data ?? []}
      columns={columns}
      isLoading={isLoading}
      error={isError ? "Failed to load suppliers" : null}
      searchableKeys={["name", "category", "email", "country"]}
      filterDefinitions={filterDefinitions}
      emptyState={<div className="text-sm text-slate-500">No suppliers registered</div>}
    />
  );
}
