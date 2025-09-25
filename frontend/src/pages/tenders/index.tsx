import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  exportTendersCsv,
  listTenders,
  saveTender,
  uploadAttachment
} from "@/services/mockApi";
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { Tender } from "@/utils/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalForm } from "@/components/forms/modal-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/forms/file-uploader";
import { useEffect, useState } from "react";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";

const statusOptions = [
  "draft",
  "shared",
  "in-progress",
  "awarded",
  "lost",
  "paused",
  "cancelled"
];

export function TendersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenders"],
    queryFn: listTenders
  });
  const { t } = useLanguage();
  const { can } = useAuth();
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  useEffect(() => {
    if (data && data.length > 0 && !selectedTender) {
      setSelectedTender(data[0]);
    }
  }, [data, selectedTender]);

  const saveMutation = useMutation({
    mutationFn: saveTender,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
    }
  });

  const attachmentMutation = useMutation({
    mutationFn: ({ tenderId, files }: { tenderId: string; files: FileList }) =>
      uploadAttachment(tenderId, files, "Current User"),
    onSuccess: (attachments, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      setSelectedTender((prev) =>
        prev && prev.id === variables.tenderId
          ? {
              ...prev,
              attachments
            }
          : prev
      );
    }
  });

  const columns: ColumnDef<Tender>[] = [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => <span className="font-medium">{row.original.reference}</span>
    },
    {
      accessorKey: "title",
      header: "Title"
    },
    {
      accessorKey: "agency",
      header: "Agency"
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge>{row.original.status}</Badge>
    },
    {
      accessorKey: "owner",
      header: "Owner"
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString()
    }
  ];

  const filterDefinitions = [
    {
      id: "status",
      label: "Status",
      options: statusOptions.map((status) => ({ value: status, label: status }))
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("tenders")}</h1>
          <p className="text-sm text-slate-500">Track all procurement opportunities</p>
        </div>
        {can(["admin", "procurement"]) ? (
          <ModalForm
            title="Create tender"
            trigger={<Button>{t("addNew")}</Button>}
            onSubmit={() => {
              const form = document.getElementById("tender-form") as HTMLFormElement | null;
              if (!form) return;
              const formData = new FormData(form);
              saveMutation.mutate({
                title: String(formData.get("title") ?? ""),
                reference: String(formData.get("reference") ?? ""),
                agency: String(formData.get("agency") ?? ""),
                amount: Number(formData.get("amount") ?? 0),
                currency: String(formData.get("currency") ?? "USD"),
                owner: String(formData.get("owner") ?? ""),
                status: String(formData.get("status") ?? "draft") as Tender["status"],
                description: String(formData.get("description") ?? "")
              });
            }}
          >
            <form id="tender-form" className="space-y-4">
              <Input name="title" placeholder="Title" required />
              <Input name="reference" placeholder="Reference" required />
              <Input name="agency" placeholder="Agency" />
              <div className="grid grid-cols-2 gap-3">
                <Input name="amount" type="number" placeholder="Amount" />
                <Input name="currency" placeholder="Currency" defaultValue="USD" />
              </div>
              <Input name="owner" placeholder="Owner" />
              <Input name="status" placeholder="Status" defaultValue="draft" />
              <Textarea name="description" placeholder="Description" rows={4} />
            </form>
          </ModalForm>
        ) : null}
      </div>
      <AdvancedDataTable
        data={data ?? []}
        columns={columns}
        isLoading={isLoading}
        error={isError ? "Failed to load tenders" : null}
        searchableKeys={["reference", "title", "agency", "owner"]}
        filterDefinitions={filterDefinitions}
        onExportCsv={exportTendersCsv}
        emptyState={<div className="text-sm text-slate-500">No tenders yet</div>}
        onRowClick={(row) => setSelectedTender(row)}
      />
      {selectedTender ? (
        <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {selectedTender.title}
              </h2>
              <p className="text-sm text-slate-500">{selectedTender.reference}</p>
            </div>
            <Button variant="ghost" onClick={() => setSelectedTender(null)}>
              Close
            </Button>
          </div>
          <p className="mt-4 text-sm text-slate-600">{selectedTender.description}</p>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700">{t("attachments")}</h3>
            <FileUploader
              attachments={selectedTender.attachments}
              onFilesSelected={(files) =>
                attachmentMutation.mutate({ tenderId: selectedTender.id, files })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
