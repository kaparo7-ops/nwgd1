import { useQuery } from "@tanstack/react-query";
import { listInvoices, fetchDashboard } from "@/services/mockApi";
import type { ColumnDef } from "@tanstack/react-table";
import type { Invoice } from "@/utils/types";
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CashflowChart } from "@/components/charts/cashflow-chart";

export function FinancePage() {
  const invoicesQuery = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  const columns: ColumnDef<Invoice>[] = [
    { accessorKey: "number", header: "Invoice" },
    { accessorKey: "issueDate", header: "Issued" },
    { accessorKey: "dueDate", header: "Due" },
    { accessorKey: "amount", header: "Amount" },
    { accessorKey: "currency", header: "Currency" },
    { accessorKey: "status", header: "Status" }
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="lg:col-span-1 lg:row-span-2">
        <CardHeader>
          <CardTitle>Cashflow trend</CardTitle>
          <CardDescription>Invoices vs expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardQuery.data ? (
            <CashflowChart data={dashboardQuery.data.cashflow} />
          ) : null}
        </CardContent>
      </Card>
      <Card className="lg:col-span-1 lg:row-start-1">
        <CardHeader>
          <CardTitle>Invoice aging</CardTitle>
          <CardDescription>
            {invoicesQuery.data?.filter((invoice) => invoice.status === "overdue").length ?? 0} overdue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdvancedDataTable
            data={invoicesQuery.data ?? []}
            columns={columns}
            isLoading={invoicesQuery.isLoading}
            error={invoicesQuery.isError ? "Failed to load invoices" : null}
            searchableKeys={["number", "status", "currency"]}
            emptyState={<div className="text-sm text-slate-500">No invoices recorded</div>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
