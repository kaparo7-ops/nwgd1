import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/services/mockApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project } from "@/utils/types";
import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/providers/auth-provider";

export function ProjectsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { can } = useAuth();

  const invoiceColumns: ColumnDef<Project["invoices"][number]>[] = [
    { accessorKey: "number", header: "Invoice" },
    { accessorKey: "issueDate", header: "Issued" },
    { accessorKey: "dueDate", header: "Due" },
    { accessorKey: "amount", header: "Amount" },
    { accessorKey: "status", header: "Status" }
  ];

  const supplierColumns: ColumnDef<Project["suppliers"][number]>[] = [
    { accessorKey: "name", header: "Supplier" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "rating", header: "Rating" },
    { accessorKey: "contact", header: "Contact" }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="animate-pulse border-dashed">
                <CardContent className="space-y-3 py-10">
                  <div className="h-4 rounded-full bg-slate-200" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-200" />
                </CardContent>
              </Card>
            ))
          : (data ?? []).map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer border-2 border-transparent transition hover:border-primary"
            onClick={() => {
              setSelectedProject(project);
              setActiveTab("overview");
            }}
          >
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.manager}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-500">
              <div>Budget: {project.budget.toLocaleString()} {"USD"}</div>
              <div>Received: {project.received.toLocaleString()} {"USD"}</div>
              <Badge variant={project.status === "delayed" ? "danger" : "success"}>
                {project.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      {selectedProject ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedProject.name}</CardTitle>
              <CardDescription>
                {selectedProject.manager} · Profit {selectedProject.profitLyd.toLocaleString()} LYD
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div>Start: {new Date(selectedProject.startDate).toLocaleDateString()}</div>
                <div>End: {new Date(selectedProject.endDate).toLocaleDateString()}</div>
                <div>Risk: {selectedProject.riskLevel}</div>
              </div>
              <div className="space-y-2">
                <div>Guarantee: {selectedProject.guarantee.amount} USD</div>
                <div>Expiry: {new Date(selectedProject.guarantee.expiry).toLocaleDateString()}</div>
                <div>Retained: {selectedProject.guarantee.retained} USD</div>
              </div>
            </CardContent>
          </Card>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: (
                  <div className="space-y-4">
                    {selectedProject.timeline.map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-700">{item.label}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(item.date).toLocaleDateString()} · {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              },
              {
                id: "invoices",
                label: "Invoices",
                content: (
                  <AdvancedDataTable
                    data={selectedProject.invoices}
                    columns={invoiceColumns}
                    isLoading={false}
                    searchableKeys={["number", "status"]}
                    emptyState={<div className="text-sm text-slate-500">No invoices</div>}
                  />
                )
              },
              {
                id: "suppliers",
                label: "Suppliers",
                content: (
                  <AdvancedDataTable
                    data={selectedProject.suppliers}
                    columns={supplierColumns}
                    isLoading={false}
                    searchableKeys={["name", "category"]}
                    emptyState={<div className="text-sm text-slate-500">No suppliers</div>}
                  />
                )
              }
            ]}
          />
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Select a project to view its details.
          </CardContent>
        </Card>
      )}
      {!can(["admin", "project", "finance"]) ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="text-sm text-amber-700">
            You have read-only access. Request elevated permissions to update project data.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
