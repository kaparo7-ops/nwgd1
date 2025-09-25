import { useCallback, useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  exportTendersCsv,
  listTenders,
  saveTender,
  uploadAttachment
} from "@/services/mockApi";
import { AdvancedDataTable } from "@/components/data-table/advanced-data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Badge
} from "@/components/ui/badge";
from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalForm } from "@/components/forms/modal-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/forms/file-uploader";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import type {
  Attachment,
  SpecificationBook,
  Tender,
  TenderActivity,
  TenderStatus,
  TenderType
} from "@/utils/types";

const statusOptions: TenderStatus[] = ["preparing", "submitted", "won", "lost", "cancelled"];
const tenderTypeOptions: TenderType[] = ["RFQ", "ITB", "RFP", "EOI", "Other"];

const statusLabels: Record<"en" | "ar", Record<TenderStatus, string>> = {
  en: {
    preparing: "Preparing",
    submitted: "Submitted",
    won: "Won",
    lost: "Lost",
    cancelled: "Cancelled"
  },
  ar: {
    preparing: "قيد التجهيز",
    submitted: "تم التقديم",
    won: "فوز",
    lost: "خسارة",
    cancelled: "ملغاة"
  }
};

const typeLabels: Record<"en" | "ar", Record<TenderType, string>> = {
  en: {
    RFQ: "RFQ",
    ITB: "ITB",
    RFP: "RFP",
    EOI: "EOI",
    Other: "Other"
  },
  ar: {
    RFQ: "طلب عرض أسعار",
    ITB: "دعوة لتقديم عطاء",
    RFP: "طلب عرض فني/مالي",
    EOI: "إبداء اهتمام",
    Other: "أخرى"
  }
};

const statusBadgeVariant: Record<TenderStatus, "info" | "success" | "warning" | "danger"> = {
  preparing: "warning",
  submitted: "info",
  won: "success",
  lost: "danger",
  cancelled: "danger"
};

const formatDate = (value: string | null | undefined, locale: string) => {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
  } catch (error) {
    return new Date(value).toLocaleDateString();
  }
};

const formatCurrency = (value: number, currency: string, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(value);
  } catch (error) {
    return `${currency} ${value.toLocaleString()}`;
  }
};

const parseTags = (value: FormDataEntryValue | null, fallback: string[]): string[] => {
  if (!value || typeof value !== "string") return fallback;
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : fallback;
};

const createAttachmentFromFile = (file: File, uploader: string): Attachment => ({
  id: `att-${crypto.randomUUID()}`,
  fileName: file.name,
  fileSize: file.size,
  uploadedAt: new Date().toISOString(),
  uploader,
  previewUrl:
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(file)
      : undefined
});


export function TendersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenders"],
    queryFn: listTenders
  });
  const { t, locale } = useLanguage();
  const { can, user } = useAuth();
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) {
      setSelectedTender(null);
      return;
    }
    if (selectedTender) {
      const match = data.find((item) => item.id === selectedTender.id);
      if (match && match !== selectedTender) {
        setSelectedTender(match);
      }
      return;
    }
    setSelectedTender(data[0]);

  }, [data, selectedTender]);

  const saveMutation = useMutation({
    mutationFn: saveTender,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      setSelectedTender(updated);

    }
  });

  const attachmentMutation = useMutation({
    mutationFn: ({ tenderId, files }: { tenderId: string; files: FileList }) =>
      uploadAttachment(tenderId, files, user.name),

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

  const handleCreateTender = useCallback(() => {
    const form = document.getElementById("tender-form") as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    const status = (formData.get("status") as TenderStatus | null) ?? "preparing";
    const statusReason = String(formData.get("statusReason") ?? "").trim();
    if ((status === "lost" || status === "cancelled") && statusReason.length === 0) {
      window.alert(
        locale === "ar"
          ? "سبب الحالة مطلوب عند وضع الحالة كخسارة أو ملغاة."
          : "Status reason is required when marking a tender as lost or cancelled."
      );
      return;
    }
    const dueDateValue = formData.get("dueDate");
    const submissionValue = formData.get("submissionDate");
    const dueDate =
      typeof dueDateValue === "string" && dueDateValue
        ? new Date(dueDateValue).toISOString()
        : new Date().toISOString();
    const submissionDate =
      typeof submissionValue === "string" && submissionValue
        ? new Date(submissionValue).toISOString()
        : dueDate;

    saveMutation.mutate({
      title: String(formData.get("title") ?? ""),
      reference: String(formData.get("reference") ?? ""),
      tenderType: (formData.get("tenderType") as TenderType | null) ?? "RFP",
      agency: String(formData.get("agency") ?? ""),
      owner: String(formData.get("owner") ?? ""),
      amount: Number(formData.get("amount") ?? 0),
      currency: String(formData.get("currency") ?? "USD"),
      status,
      statusReason: status === "lost" || status === "cancelled" ? statusReason : undefined,
      tags: parseTags(formData.get("tags"), []),
      dueDate,
      submissionDate,
      description: String(formData.get("description") ?? ""),
      timeline: [
        {
          id: `activity-${crypto.randomUUID()}`,
          date: new Date().toISOString(),
          actor: user.name,
          description:
            locale === "ar" ? "تم إنشاء المناقصة" : "Tender created",
          category: "status"
        }
      ],
      alerts: {
        submissionReminderAt: dueDate,
        needsSpecificationPurchase: true,
        siteVisitOverdue: false,
        guaranteeAlert: null
      },
      specificationBooks: [],
      proposals: {},
      attachments: [],
      links: []
    });
  }, [locale, saveMutation, user.name]);

  const handleEditTender = useCallback(
    (formId: string, tender: Tender) => {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) return;
      const formData = new FormData(form);
      const status = (formData.get("status") as TenderStatus | null) ?? tender.status;
      const statusReasonValue = String(formData.get("statusReason") ?? "").trim();
      if ((status === "lost" || status === "cancelled") && statusReasonValue.length === 0) {
        window.alert(
          locale === "ar"
            ? "سبب الحالة مطلوب عند وضع الحالة كخسارة أو ملغاة."
            : "Status reason is required when marking a tender as lost or cancelled."
        );
        return;
      }
      const dueDateValue = formData.get("dueDate");
      const submissionValue = formData.get("submissionDate");
      const nextTimeline: TenderActivity[] =
        status !== tender.status
          ? [
              ...tender.timeline,
              {
                id: `activity-${crypto.randomUUID()}`,
                date: new Date().toISOString(),
                actor: user.name,
                description:
                  locale === "ar"
                    ? `تم تحديث الحالة إلى ${statusLabels[locale][status]}`
                    : `Status updated to ${statusLabels[locale][status]}`,
                category: "status"
              }
            ]
          : tender.timeline;

      saveMutation.mutate({
        id: tender.id,
        title: String(formData.get("title") ?? tender.title),
        reference: String(formData.get("reference") ?? tender.reference),
        tenderType: (formData.get("tenderType") as TenderType | null) ?? tender.tenderType,
        agency: String(formData.get("agency") ?? tender.agency),
        owner: String(formData.get("owner") ?? tender.owner),
        amount: Number(formData.get("amount") ?? tender.amount),
        currency: String(formData.get("currency") ?? tender.currency),
        status,
        statusReason:
          status === "lost" || status === "cancelled"
            ? statusReasonValue || tender.statusReason || ""
            : statusReasonValue || tender.statusReason,
        tags: parseTags(formData.get("tags"), tender.tags),
        dueDate:
          typeof dueDateValue === "string" && dueDateValue
            ? new Date(dueDateValue).toISOString()
            : tender.dueDate,
        submissionDate:
          typeof submissionValue === "string" && submissionValue
            ? new Date(submissionValue).toISOString()
            : tender.submissionDate,
        description: String(formData.get("description") ?? tender.description),
        timeline: nextTimeline
      });
    },
    [locale, saveMutation, user.name]
  );

  const hasPurchasedBook = selectedTender?.specificationBooks.some(
    (book) => Boolean(book.purchaseDate)
  );

  const handleAddSpecificationBook = (formId: string) => {
    if (!selectedTender) return;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    const number = String(formData.get("number") ?? "").trim();
    if (!number) return;
    const cost = Number(formData.get("cost") ?? 0);
    const currency = String(formData.get("currency") ?? selectedTender.currency);
    const purchaseDateValue = formData.get("purchaseDate");
    const purchaseDate =
      typeof purchaseDateValue === "string" && purchaseDateValue
        ? new Date(purchaseDateValue).toISOString()
        : null;
    const purchaseMethod = String(formData.get("method") ?? "");
    const responsible = String(formData.get("responsible") ?? user.name);
    const fileInput = form.elements.namedItem("receipt") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    const attachment = file ? createAttachmentFromFile(file, user.name) : null;

    const newBook: SpecificationBook = {
      id: `book-${crypto.randomUUID()}`,
      number,
      purchaseDate,
      cost,
      currency,
      purchaseMethod,
      responsible,
      attachment
    };

    const nextBooks = [...selectedTender.specificationBooks, newBook];
    const nextTimeline: TenderActivity[] = [
      ...selectedTender.timeline,
      {
        id: `activity-${crypto.randomUUID()}`,
        date: new Date().toISOString(),
        actor: user.name,
        description:
          locale === "ar"
            ? `تم إضافة كراسة ${number}`
            : `Specification booklet ${number} added`,
        category: "update"
      }
    ];

    saveMutation.mutate({
      id: selectedTender.id,
      specificationBooks: nextBooks,
      timeline: nextTimeline,
      alerts: {
        ...selectedTender.alerts,
        needsSpecificationPurchase: nextBooks.every((book) => !book.purchaseDate)
      }
    });
  };

  const handleProposalsUpdate = (formId: string) => {
    if (!selectedTender || !hasPurchasedBook) return;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    const technicalUrl = String(formData.get("technicalUrl") ?? "").trim();
    const financialUrl = String(formData.get("financialUrl") ?? "").trim();
    const amount = Number(formData.get("offerValue") ?? selectedTender.amount);
    const currency = String(formData.get("currency") ?? selectedTender.currency);
    const tags = parseTags(formData.get("tags"), selectedTender.tags);

    const nextTimeline: TenderActivity[] = [
      ...selectedTender.timeline,
      {
        id: `activity-${crypto.randomUUID()}`,
        date: new Date().toISOString(),
        actor: user.name,
        description:
          locale === "ar" ? "تم تحديث بيانات العروض" : "Proposal details updated",
        category: "update"
      }
    ];

    saveMutation.mutate({
      id: selectedTender.id,
      amount,
      currency,
      tags,
      proposals: {
        ...selectedTender.proposals,
        technicalUrl: technicalUrl || undefined,
        financialUrl: financialUrl || undefined,
        submittedBy: user.name,
        submittedAt: new Date().toISOString()
      },
      timeline: nextTimeline
    });
  };

  const filterDefinitions = useMemo(
    () => [
      {
        id: "status",
        label: t("status"),
        options: statusOptions.map((status) => ({
          value: status,
          label: statusLabels[locale][status]
        }))
      },
      {
        id: "tenderType",
        label: t("tenderType"),
        options: tenderTypeOptions.map((type) => ({
          value: type,
          label: typeLabels[locale][type]
        }))
      }
    ],
    [locale, t]
  );

  const columns: ColumnDef<Tender>[] = useMemo(() => {
    return [
      {
        accessorKey: "reference",
        header: t("reference"),
        cell: ({ row }) => (
          <div className="space-y-1">
            <span className="font-medium text-slate-900">{row.original.reference}</span>
            <p className="text-xs text-slate-500">
              {formatDate(row.original.createdAt, locale) ?? t("notAvailable")}
            </p>
          </div>
        )
      },
      {
        accessorKey: "title",
        header: t("name"),
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.original.title}</p>
            <p className="text-xs text-slate-500 line-clamp-2">{row.original.description}</p>
          </div>
        )
      },
      {
        accessorKey: "tenderType",
        header: t("tenderType"),
        cell: ({ row }) => (
          <Badge variant="info">{typeLabels[locale][row.original.tenderType]}</Badge>
        )
      },
      {
        accessorKey: "agency",
        header: t("agency")
      },
      {
        accessorKey: "owner",
        header: t("owner")
      },
      {
        accessorKey: "dueDate",
        header: t("dueDate"),
        cell: ({ row }) => (
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-900">
              {formatDate(row.original.dueDate, locale) ?? t("notAvailable")}
            </span>
            <span className="text-xs text-slate-500">
              {formatDate(row.original.submissionDate, locale) ?? t("notAvailable")}
            </span>
          </div>
        )
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => (
          <div className="space-y-1">
            <Badge variant={statusBadgeVariant[row.original.status]}>
              {statusLabels[locale][row.original.status]}
            </Badge>
            {row.original.statusReason ? (
              <p className="text-xs text-slate-500 line-clamp-2">{row.original.statusReason}</p>
            ) : null}
          </div>
        )
      },
      {
        accessorKey: "amount",
        header: t("offerValue"),
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">
            {formatCurrency(row.original.amount, row.original.currency, locale)}
          </span>
        )
      },
      {
        accessorKey: "tags",
        header: t("tags"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.tags.length === 0 ? (
              <span className="text-xs text-slate-400">{t("notAvailable")}</span>
            ) : (
              row.original.tags.map((tag) => (
                <Badge key={tag} variant="info">
                  {tag}
                </Badge>
              ))
            )}
          </div>
        )
      },
      {
        id: "siteVisit",
        header: t("siteVisit"),
        cell: ({ row }) => {
          const visit = row.original.siteVisit;
          if (!visit) {
            return <span className="text-xs text-slate-400">{t("siteVisitPending")}</span>;
          }
          return (
            <div className="space-y-1">
              <Badge variant={visit.completed ? "success" : "warning"}>
                {formatDate(visit.date ?? undefined, locale) ?? t("notAvailable")}
              </Badge>
              <p className="text-xs text-slate-500">{visit.assignee ?? t("siteVisitAssignee")}</p>
              {visit.notes ? (
                <p className="text-xs text-slate-400 line-clamp-2">{visit.notes}</p>
              ) : null}
            </div>
          );
        }
      },
      {
        id: "specificationBooks",
        header: t("specificationBooks"),
        cell: ({ row }) => {
          const books = row.original.specificationBooks;
          if (books.length === 0) {
            return <span className="text-xs text-slate-400">{t("specificationBookStatusMissing")}</span>;
          }
          const purchased = books.filter((book) => Boolean(book.purchaseDate)).length;
          return (
            <div className="space-y-1">
              <Badge variant={purchased > 0 ? "success" : "danger"}>
                {`${purchased}/${books.length}`}
              </Badge>
              <p className="text-xs text-slate-500">{books[0].number}</p>
            </div>
          );
        }
      },
      {
        id: "links",
        header: t("links"),
        cell: ({ row }) => (
          <div className="space-y-1 text-xs">
            {row.original.proposals.technicalUrl ? (
              <a
                className="text-primary underline"
                href={row.original.proposals.technicalUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("technicalProposal")}
              </a>
            ) : (
              <span className="text-slate-400">{t("technicalProposal")}: {t("notAvailable")}</span>
            )}
            {row.original.proposals.financialUrl ? (
              <a
                className="text-primary underline"
                href={row.original.proposals.financialUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t("financialProposal")}
              </a>
            ) : (
              <span className="text-slate-400">{t("financialProposal")}: {t("notAvailable")}</span>
            )}
            <p className="text-slate-500">
              {row.original.attachments.length} {t("files")}
            </p>
          </div>
        )
      },
      {
        id: "timeline",
        header: t("timeline"),
        cell: ({ row }) => {
          const last = row.original.timeline[row.original.timeline.length - 1];
          if (!last) {
            return <span className="text-xs text-slate-400">{t("notAvailable")}</span>;
          }
          return (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600 line-clamp-2">{last.description}</p>
              <p className="text-xs text-slate-400">
                {formatDate(last.date, locale) ?? t("notAvailable")} · {last.actor}
              </p>
            </div>
          );
        }
      },
      {
        id: "actions",
        header: t("actions"),
        cell: ({ row }) => {
          const tender = row.original;
          const editFormId = `edit-tender-${tender.id}`;
          return (
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedTender(tender)}
              >
                {t("view")}
              </Button>
              {can(["admin", "procurement"]) ? (
                <ModalForm
                  title={`${t("edit")} ${tender.reference}`}
                  trigger={<Button size="sm" variant="outline">{t("edit")}</Button>}
                  onSubmit={() => handleEditTender(editFormId, tender)}
                >
                  <form id={editFormId} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input name="title" defaultValue={tender.title} placeholder={t("name")} required />
                      <Input name="reference" defaultValue={tender.reference} placeholder={t("reference")} required />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input name="agency" defaultValue={tender.agency} placeholder={t("agency")} />
                      <Input name="owner" defaultValue={tender.owner} placeholder={t("owner")} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        name="tenderType"
                        defaultValue={tender.tenderType}
                        className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                      >
                        {tenderTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {typeLabels[locale][type]}
                          </option>
                        ))}
                      </select>
                      <select
                        name="status"
                        defaultValue={tender.status}
                        className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[locale][status]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        name="dueDate"
                        type="date"
                        defaultValue={tender.dueDate.slice(0, 10)}
                      />
                      <Input
                        name="submissionDate"
                        type="date"
                        defaultValue={tender.submissionDate.slice(0, 10)}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        name="amount"
                        type="number"
                        defaultValue={tender.amount}
                        placeholder={t("offerValue")}
                      />
                      <Input name="currency" defaultValue={tender.currency} placeholder={t("amount")} />
                    </div>
                    <Textarea
                      name="statusReason"
                      defaultValue={tender.statusReason ?? ""}
                      placeholder={t("statusReason")}
                      rows={2}
                    />
                    <Input
                      name="tags"
                      defaultValue={tender.tags.join(", ")}
                      placeholder={t("tagsPlaceholder")}
                    />
                    <Textarea
                      name="description"
                      defaultValue={tender.description}
                      placeholder={t("description") ?? "Description"}
                      rows={3}
                    />
                  </form>
                </ModalForm>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedTender(tender);
                  const section = document.getElementById("tender-attachments");
                  section?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t("files")}
              </Button>
            </div>
          );
        }
      }
    ];
  }, [can, handleEditTender, locale, t]);

  const tableData = data ?? [];


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("tenders")}</h1>
          <p className="text-sm text-slate-500">
            {locale === "ar"
              ? "إدارة دورة حياة المناقصات والعطاءات"
              : "Manage the full tender lifecycle"}
          </p>
        </div>
        {can(["admin", "procurement"]) ? (
          <ModalForm
            title={t("addNew")}
            trigger={<Button>{t("addNew")}</Button>}
            onSubmit={handleCreateTender}
          >
            <form id="tender-form" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="title" placeholder={t("name")} required />
                <Input name="reference" placeholder={t("reference")} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="agency" placeholder={t("agency")} />
                <Input name="owner" placeholder={t("owner")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  name="tenderType"
                  defaultValue="RFP"
                  className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                >
                  {tenderTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[locale][type]}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue="preparing"
                  className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[locale][status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="dueDate" type="date" />
                <Input name="submissionDate" type="date" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="amount" type="number" placeholder={t("offerValue")} />
                <Input name="currency" placeholder={t("amount")} defaultValue="USD" />
              </div>
              <Textarea name="statusReason" placeholder={t("statusReason")} rows={2} />
              <Input name="tags" placeholder={t("tagsPlaceholder")} />
              <Textarea name="description" placeholder={t("description") ?? "Description"} rows={3} />

            </form>
          </ModalForm>
        ) : null}
      </div>
      <AdvancedDataTable
        data={tableData}
        columns={columns}
        isLoading={isLoading}
        error={isError ? t("error") : null}
        searchableKeys={["reference", "title", "agency", "owner", "tags"]}
        filterDefinitions={filterDefinitions}
        onExportCsv={exportTendersCsv}
        emptyState={<div className="text-sm text-slate-500">{t("noResults")}</div>}

        onRowClick={(row) => setSelectedTender(row)}
      />
      {selectedTender ? (
        <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">{selectedTender.title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{selectedTender.reference}</Badge>
                <Badge variant="info">{typeLabels[locale][selectedTender.tenderType]}</Badge>
                <Badge variant={statusBadgeVariant[selectedTender.status]}>
                  {statusLabels[locale][selectedTender.status]}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setSelectedTender(null)}>
              {t("cancel")}
            </Button>
          </div>
          <p className="mt-4 text-sm text-slate-600">{selectedTender.description}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-500">{t("offerValue")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatCurrency(selectedTender.amount, selectedTender.currency, locale)}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-500">{t("dueDate")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatDate(selectedTender.dueDate, locale) ?? t("notAvailable")}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-500">{t("submissionReminder")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatDate(selectedTender.alerts.submissionReminderAt, locale) ?? t("notAvailable")}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-500">{t("specificationBooks")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {selectedTender.specificationBooks.filter((book) => book.purchaseDate).length}/
                {selectedTender.specificationBooks.length}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {selectedTender.tags.map((tag) => (
              <Badge key={tag} variant="info">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">{t("siteVisit")}</h3>
                  <Badge variant={selectedTender.siteVisit?.completed ? "success" : "warning"}>
                    {selectedTender.siteVisit?.completed
                      ? t("specificationBookStatusPurchased")
                      : t("siteVisitPending")}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>
                    {formatDate(selectedTender.siteVisit?.date, locale) ?? t("notAvailable")}
                  </p>
                  <p>
                    {t("siteVisitAssignee")} : {selectedTender.siteVisit?.assignee ?? t("notAvailable")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedTender.siteVisit?.notes ?? t("siteVisitNotes")}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">{t("specificationBooks")}</h3>
                  {can(["admin", "procurement"]) ? (
                    <ModalForm
                      title={t("addSpecificationBook")}
                      trigger={<Button size="sm">{t("addSpecificationBook")}</Button>}
                      onSubmit={() => handleAddSpecificationBook(`spec-book-${selectedTender.id}`)}
                    >
                      <form id={`spec-book-${selectedTender.id}`} className="space-y-3">
                        <Input name="number" placeholder={t("specificationBookNumber")} required />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input name="purchaseDate" type="date" />
                          <Input name="method" placeholder={t("specificationBookMethod")} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input name="cost" type="number" placeholder={t("specificationBookCost")} />
                          <Input name="currency" defaultValue={selectedTender.currency} />
                        </div>
                        <Input name="responsible" placeholder={t("specificationBookResponsible")} defaultValue={user.name} />
                        <Input name="receipt" type="file" accept="application/pdf,image/*" />
                      </form>
                    </ModalForm>
                  ) : null}
                </div>
                <div className="mt-4 space-y-3">
                  {selectedTender.specificationBooks.length === 0 ? (
                    <p className="text-xs text-slate-500">{t("specificationBookStatusMissing")}</p>
                  ) : (
                    selectedTender.specificationBooks.map((book) => (
                      <div key={book.id} className="rounded-xl border border-dashed border-border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{book.number}</p>
                            <p className="text-xs text-slate-500">
                              {formatDate(book.purchaseDate ?? undefined, locale) ?? t("notAvailable")}
                            </p>
                          </div>
                          <Badge variant={book.purchaseDate ? "success" : "danger"}>
                            {book.purchaseDate
                              ? t("specificationBookStatusPurchased")
                              : t("specificationBookStatusMissing")}
                          </Badge>
                        </div>
                        <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                          <span>
                            {t("specificationBookCost")}: {formatCurrency(book.cost, book.currency, locale)}
                          </span>
                          <span>
                            {t("specificationBookResponsible")}: {book.responsible}
                          </span>
                          <span>{t("specificationBookMethod")}: {book.purchaseMethod}</span>
                          {book.attachment ? (
                            <a
                              className="text-primary underline"
                              href={book.attachment.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {t("specificationBookReceipt")}: {book.attachment.fileName}
                            </a>
                          ) : (
                            <span>{t("specificationBookReceipt")}: {t("notAvailable")}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold text-slate-700">{t("proposals")}</h3>
                <form id={`proposal-form-${selectedTender.id}`} className="mt-4 space-y-3">
                  <Input
                    name="technicalUrl"
                    defaultValue={selectedTender.proposals.technicalUrl ?? ""}
                    placeholder={t("technicalProposal")}
                  />
                  <Input
                    name="financialUrl"
                    defaultValue={selectedTender.proposals.financialUrl ?? ""}
                    placeholder={t("financialProposal")}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      name="offerValue"
                      type="number"
                      defaultValue={selectedTender.amount}
                      placeholder={t("offerValue")}
                    />
                    <Input
                      name="currency"
                      defaultValue={selectedTender.currency}
                      placeholder={t("amount")}
                    />
                  </div>
                  <Input
                    name="tags"
                    defaultValue={selectedTender.tags.join(", ")}
                    placeholder={t("tagsPlaceholder")}
                  />
                  <Button
                    type="button"
                    onClick={() => handleProposalsUpdate(`proposal-form-${selectedTender.id}`)}
                    disabled={!hasPurchasedBook}
                  >
                    {t("updateProposals")}
                  </Button>
                  {!hasPurchasedBook ? (
                    <p className="text-xs text-red-600">{t("proposalsBlocked")}</p>
                  ) : null}
                </form>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold text-slate-700">{t("reminders")}</h3>
                <div className="mt-3 grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>{t("specPurchaseReminder")}</span>
                    <Badge variant={selectedTender.alerts.needsSpecificationPurchase ? "danger" : "success"}>
                      {selectedTender.alerts.needsSpecificationPurchase
                        ? t("specificationBookStatusMissing")
                        : t("specificationBookStatusPurchased")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t("siteVisitReminder")}</span>
                    <Badge variant={selectedTender.alerts.siteVisitOverdue ? "danger" : "success"}>
                      {selectedTender.alerts.siteVisitOverdue ? t("siteVisitPending") : t("specificationBookStatusPurchased")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t("guaranteeReminder")}</span>
                    <span className="text-xs">
                      {formatDate(selectedTender.alerts.guaranteeAlert ?? undefined, locale) ?? t("notAvailable")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">{t("pricing")}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">{t("name")}</th>
                    <th className="px-3 py-2">{t("quantity")}</th>
                    <th className="px-3 py-2">{t("unitCost")}</th>
                    <th className="px-3 py-2">{t("pricingMargin")}</th>
                    <th className="px-3 py-2">{t("pricingShipping")}</th>
                    <th className="px-3 py-2">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTender.pricing.lines.map((line) => (
                    <tr key={line.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium text-slate-700">{line.item}</td>
                      <td className="px-3 py-2 text-slate-600">{line.quantity}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {formatCurrency(line.unitCost, line.currency, locale)}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{line.margin}%</td>
                      <td className="px-3 py-2 text-slate-600">
                        {formatCurrency(line.shipping, line.currency, locale)}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {formatCurrency(line.total, line.currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border p-3 text-sm text-slate-600">
                <p className="text-xs text-slate-500">{t("pricingBasis")}</p>
                <p className="font-semibold text-slate-900">{selectedTender.pricing.basis}</p>
              </div>
              <div className="rounded-xl border border-border p-3 text-sm text-slate-600">
                <p className="text-xs text-slate-500">{t("pricingBaseCost")}</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(
                    selectedTender.pricing.summary.baseCost,
                    selectedTender.pricing.summary.currency,
                    locale
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3 text-sm text-slate-600">
                <p className="text-xs text-slate-500">{t("pricingMargin")}</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(
                    selectedTender.pricing.summary.marginValue,
                    selectedTender.pricing.summary.currency,
                    locale
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3 text-sm text-slate-600">
                <p className="text-xs text-slate-500">{t("pricingFinalPrice")}</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(
                    selectedTender.pricing.summary.finalPrice,
                    selectedTender.pricing.summary.currency,
                    locale
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold text-slate-700">{t("supplierComparisons")}</h3>
            <div className="mt-3 space-y-4 text-sm text-slate-600">
              {selectedTender.supplierComparisons.length === 0 ? (
                <p className="text-xs text-slate-500">{t("notAvailable")}</p>
              ) : (
                selectedTender.supplierComparisons.map((comparison) => (
                  <div key={comparison.item} className="rounded-xl border border-dashed border-border p-3">
                    <p className="font-semibold text-slate-800">{comparison.item}</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {comparison.suppliers.map((supplier) => (
                        <div key={`${comparison.item}-${supplier.name}`} className="rounded-lg bg-muted/60 p-3">
                          <p className="text-xs text-slate-500">{supplier.name}</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {formatCurrency(supplier.unitCost, supplier.currency, locale)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold text-slate-700">{t("timeline")}</h3>
              <div className="mt-3 space-y-3">
                {selectedTender.timeline.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <Badge variant="info">{formatDate(event.date, locale) ?? ""}</Badge>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{event.description}</p>
                      <p className="text-xs text-slate-500">{event.actor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border p-4" id="tender-attachments">
              <h3 className="text-sm font-semibold text-slate-700">{t("attachments")}</h3>
              <FileUploader
                attachments={selectedTender.attachments}
                onFilesSelected={(files) =>
                  attachmentMutation.mutate({ tenderId: selectedTender.id, files })
                }
              />
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
