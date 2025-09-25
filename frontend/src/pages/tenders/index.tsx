import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import {
  exportTendersCsv,
  listTenders,
  saveTender,
  uploadAttachment
} from "@/services/mockApi";
import {
  AdvancedDataTable,
  type ColumnPreset
} from "@/components/data-table/advanced-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploader } from "@/components/forms/file-uploader";
import { ModalForm } from "@/components/forms/modal-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";

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
const viewStorageKey = "tender-portal-tenders-view";


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

type TenderFormErrors = Record<string, string>;
type TenderFormValues = {
  reference: string;
  nameEn: string;
  nameAr: string;
  tenderType: TenderType;
  agency: string;
  owner: string;
  status: TenderStatus;
  statusReason?: string;
  dueDate: string;
  submissionDate: string;
  amount: number;
  currency: string;
  tags: string[];
  description: string;
  technicalUrl?: string;
  financialUrl?: string;
};

const columnOrder = [
  "reference",
  "title",
  "agency",
  "status",
  "dueDate",
  "submissionDate",
  "amount",
  "tenderType",
  "owner",
  "tags",
  "statusReason",
  "siteVisit",
  "specification",
  "technicalUrl",
  "financialUrl",
  "actions"
] as const;

type ColumnId = (typeof columnOrder)[number];

const buildDefaultVisibility = (width: number): Record<ColumnId, boolean> => {
  const minimal = new Set<ColumnId>(["reference", "title", "agency", "status", "dueDate", "actions"]);
  if (width >= 1440) {
    ["amount", "owner", "tenderType", "tags", "siteVisit"].forEach((id) =>
      minimal.add(id as ColumnId)
    );
  } else if (width >= 1280) {
    ["amount", "owner", "tenderType"].forEach((id) => minimal.add(id as ColumnId));
  }
  const visibility = {} as Record<ColumnId, boolean>;
  columnOrder.forEach((id) => {
    visibility[id] = minimal.has(id);
  });
  return visibility;
};

const splitTitle = (title: string): { en: string; ar: string } => {
  if (!title) return { en: "", ar: "" };
  const [en, ar] = title.split(" | ");
  return { en: en?.trim() ?? title, ar: ar?.trim() ?? "" };
};

const combineTitle = (values: { en: string; ar: string }) => {
  const english = values.en.trim();
  const arabic = values.ar.trim();
  if (english && arabic) return `${english} | ${arabic}`;
  return english || arabic;
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

const getDueCategory = (tender: Tender): string => {
  const now = new Date();
  const due = new Date(tender.dueDate);
  const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "dueSoon";
  if (diffDays <= 14) return "dueThisMonth";
  return "upcoming";
};

const readFormValues = (form: HTMLFormElement, fallback?: Tender): TenderFormValues => {
  const data = new FormData(form);
  const status = (data.get("status") as TenderStatus | null) ?? fallback?.status ?? "preparing";
  const amountValue = Number(data.get("amount") ?? fallback?.amount ?? 0);
  const englishName = String(data.get("nameEn") ?? splitTitle(fallback?.title ?? "").en);
  const arabicName = String(data.get("nameAr") ?? splitTitle(fallback?.title ?? "").ar);
  return {
    reference: String(data.get("reference") ?? fallback?.reference ?? ""),
    nameEn: englishName,
    nameAr: arabicName,
    tenderType: (data.get("tenderType") as TenderType | null) ?? fallback?.tenderType ?? "RFP",
    agency: String(data.get("agency") ?? fallback?.agency ?? ""),
    owner: String(data.get("owner") ?? fallback?.owner ?? ""),
    status,
    statusReason: String(data.get("statusReason") ?? fallback?.statusReason ?? ""),
    dueDate: String(data.get("dueDate") ?? fallback?.dueDate ?? ""),
    submissionDate: String(data.get("submissionDate") ?? fallback?.submissionDate ?? ""),
    amount: Number.isNaN(amountValue) ? 0 : amountValue,
    currency: String(data.get("currency") ?? fallback?.currency ?? "USD"),
    tags: parseTags(data.get("tags"), fallback?.tags ?? []),
    description: String(data.get("description") ?? fallback?.description ?? ""),
    technicalUrl: String(data.get("technicalUrl") ?? fallback?.proposals.technicalUrl ?? "").trim() || undefined,
    financialUrl: String(data.get("financialUrl") ?? fallback?.proposals.financialUrl ?? "").trim() || undefined
  };
};

const validateForm = (values: TenderFormValues, locale: "en" | "ar"): TenderFormErrors => {
  const errors: TenderFormErrors = {};
  const requiredMessage = locale === "ar" ? "هذا الحقل مطلوب" : "This field is required";
  if (!values.reference.trim()) errors.reference = requiredMessage;
  if (!values.nameEn.trim() && !values.nameAr.trim()) {
    errors.nameEn =
      locale === "ar"
        ? "أدخل الاسم بالعربية أو الإنجليزية"
        : "Provide Arabic or English name";
  }
  if (!values.agency.trim()) errors.agency = requiredMessage;
  if (!values.owner.trim()) errors.owner = requiredMessage;
  if (!values.dueDate) errors.dueDate = requiredMessage;
  if (!values.submissionDate) errors.submissionDate = requiredMessage;
  if (values.amount <= 0) {
    errors.amount = locale === "ar" ? "أدخل قيمة موجبة" : "Enter a positive value";
  }
  if ((values.status === "lost" || values.status === "cancelled") && !values.statusReason) {
    errors.statusReason =
      locale === "ar"
        ? "سبب الحالة إلزامي عند الخسارة أو الإلغاء"
        : "Provide a status reason when marking as lost or cancelled";
  }
  return errors;
};

const statusSummary = (tenders: Tender[]) => ({
  total: tenders.length,
  cancelled: tenders.filter((item) => item.status === "cancelled").length,
  won: tenders.filter((item) => item.status === "won").length,
  lost: tenders.filter((item) => item.status === "lost").length
});

function TenderDetailsDrawer({
  tender,
  open,
  onOpenChange,
  locale,
  direction,
  onAddSpecification,
  onUpdateProposal,
  onUploadAttachments,
  canManage,
  userName
}: {
  tender: Tender | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "en" | "ar";
  direction: "rtl" | "ltr";
  onAddSpecification: (formId: string) => void;
  onUpdateProposal: (formId: string) => void;
  onUploadAttachments: (files: FileList) => void;
  canManage: boolean;
  userName: string;
}) {
  const { t } = useLanguage();
  if (!tender) return null;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content
          className="fixed inset-y-0 z-50 w-full max-w-3xl overflow-y-auto bg-white p-8 shadow-soft"
          style={direction === "rtl" ? { left: 0 } : { right: 0 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900" title={tender.title}>
                {tender.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{tender.reference}</Badge>
                <Badge variant="info">{typeLabels[locale][tender.tenderType]}</Badge>
                <Badge variant={statusBadgeVariant[tender.status]}>
                  {statusLabels[locale][tender.status]}
                </Badge>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost">{t("cancel")}</Button>
            </Dialog.Close>
          </div>
          <p className="mt-4 text-sm text-slate-600" title={tender.description}>
            {tender.description || (locale === "ar" ? "لا توجد ملاحظات" : "No notes provided")}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-500">{t("offerValue")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatCurrency(tender.amount, tender.currency, locale)}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-500">{t("dueDate")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatDate(tender.dueDate, locale) ?? t("notAvailable")}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-500">{t("submissionReminder")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatDate(tender.alerts.submissionReminderAt, locale) ?? t("notAvailable")}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-500">{t("specificationBooks")}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {tender.specificationBooks.filter((book) => book.purchaseDate).length}/
                {tender.specificationBooks.length}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {tender.tags.length === 0 ? (
              <span className="text-xs text-slate-400">{t("notAvailable")}</span>
            ) : (
              tender.tags.map((tag) => (
                <Badge key={tag} variant="info">
                  {tag}
                </Badge>
              ))
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border p-4" title={tender.siteVisit?.notes}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">{t("siteVisit")}</h3>
                  <Badge variant={tender.siteVisit?.completed ? "success" : "warning"}>
                    {tender.siteVisit?.completed
                      ? t("specificationBookStatusPurchased")
                      : t("siteVisitPending")}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>{formatDate(tender.siteVisit?.date, locale) ?? t("notAvailable")}</p>
                  <p>
                    {t("siteVisitAssignee")} : {tender.siteVisit?.assignee ?? t("notAvailable")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tender.siteVisit?.notes ?? t("siteVisitNotes")}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">{t("specificationBooks")}</h3>
                  {canManage ? (
                    <ModalForm
                      title={t("addSpecificationBook")}
                      trigger={<Button size="sm">{t("addSpecificationBook")}</Button>}
                      onSubmit={() => onAddSpecification(`spec-book-${tender.id}`)}
                    >
                      <form id={`spec-book-${tender.id}`} className="space-y-4">
                        <section className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700">
                            {locale === "ar" ? "تفاصيل الكراسة" : "Booklet details"}
                          </h4>
                          <Input name="number" placeholder={t("specificationBookNumber")} required />
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input name="purchaseDate" type="date" />
                            <Input name="method" placeholder={t("specificationBookMethod")} />
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input name="cost" type="number" placeholder={t("specificationBookCost")} />
                            <Input name="currency" defaultValue={tender.currency} />
                          </div>
                          <Input
                            name="responsible"
                            placeholder={t("specificationBookResponsible")}
                            defaultValue={userName}
                          />
                          <Input name="receipt" type="file" accept="application/pdf,image/*" />
                        </section>
                      </form>
                    </ModalForm>
                  ) : null}
                </div>
                <div className="mt-4 space-y-3">
                  {tender.specificationBooks.length === 0 ? (
                    <p className="text-xs text-slate-500">{t("specificationBookStatusMissing")}</p>
                  ) : (
                    tender.specificationBooks.map((book) => (
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
                        <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                          <span>
                            {t("specificationBookCost")}:
                            {" "}
                            {formatCurrency(book.cost, book.currency, locale)}
                          </span>
                          <span>
                            {t("specificationBookResponsible")}: {book.responsible}
                          </span>
                          <span>{t("specificationBookMethod")}: {book.purchaseMethod}</span>
                          {book.attachment ? (
                            <a
                              href={book.attachment.previewUrl ?? "#"}
                              className="text-primary hover:underline"
                              download={book.attachment.fileName}
                            >
                              {book.attachment.fileName}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">{t("proposals")}</h3>
                  {canManage ? (
                    <ModalForm
                      title={t("proposals")}
                      trigger={<Button size="sm">{t("edit")}</Button>}
                      onSubmit={() => onUpdateProposal(`proposal-${tender.id}`)}
                    >
                      <form id={`proposal-${tender.id}`} className="space-y-4">
                        <section className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700">
                            {locale === "ar" ? "بيانات العرض" : "Proposal"}
                          </h4>
                          <Input
                            name="offerValue"
                            type="number"
                            placeholder={t("offerValue")}
                            defaultValue={tender.amount}
                          />
                          <Input name="currency" defaultValue={tender.currency} />
                          <Input
                            name="technicalUrl"
                            defaultValue={tender.proposals.technicalUrl ?? ""}
                            placeholder={locale === "ar" ? "رابط العرض الفني" : "Technical offer link"}
                          />
                          <Input
                            name="financialUrl"
                            defaultValue={tender.proposals.financialUrl ?? ""}
                            placeholder={locale === "ar" ? "رابط العرض المالي" : "Financial offer link"}
                          />
                          <Input
                            name="tags"
                            defaultValue={tender.tags.join(", ")}
                            placeholder={t("tagsPlaceholder")}
                          />
                        </section>
                      </form>
                    </ModalForm>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>
                    {t("offerValue")}: {formatCurrency(tender.amount, tender.currency, locale)}
                  </p>
                  <p>
                    {locale === "ar" ? "العرض الفني" : "Technical"}:{" "}
                    {tender.proposals.technicalUrl ? (
                      <a href={tender.proposals.technicalUrl} className="text-primary hover:underline">
                        {tender.proposals.technicalUrl}
                      </a>
                    ) : (
                      <span className="text-slate-400">{t("notAvailable")}</span>
                    )}
                  </p>
                  <p>
                    {locale === "ar" ? "العرض المالي" : "Financial"}:{" "}
                    {tender.proposals.financialUrl ? (
                      <a href={tender.proposals.financialUrl} className="text-primary hover:underline">
                        {tender.proposals.financialUrl}
                      </a>
                    ) : (
                      <span className="text-slate-400">{t("notAvailable")}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tender.proposals.submittedBy
                      ? `${tender.proposals.submittedBy} – ${formatDate(
                          tender.proposals.submittedAt,
                          locale
                        )}`
                      : locale === "ar"
                        ? "لم يتم تسجيل مقدم العرض"
                        : "No submission recorded"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4" id="tender-attachments">
                <h3 className="text-sm font-semibold text-slate-700">{t("attachments")}</h3>
                <FileUploader
                  attachments={tender.attachments}
                  onFilesSelected={(files) => onUploadAttachments(files)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold text-slate-700">{t("timeline")}</h3>
            <div className="mt-3 space-y-3">
              {tender.timeline.map((event) => (
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TendersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["tenders"], queryFn: listTenders });
  const { t, locale, direction } = useLanguage();
  const { can, user } = useAuth();
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createErrors, setCreateErrors] = useState<TenderFormErrors>({});
  const [editErrors, setEditErrors] = useState<Record<string, TenderFormErrors>>({});

  const defaultVisibility = useMemo(() => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1440;
    return buildDefaultVisibility(width);
  }, []);


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
    const values = readFormValues(form);
    const errors = validateForm(values, locale);
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const dueDate = values.dueDate ? new Date(values.dueDate).toISOString() : new Date().toISOString();
    const submissionDate = values.submissionDate
      ? new Date(values.submissionDate).toISOString()
      : dueDate;
    saveMutation.mutate({
      title: combineTitle({ en: values.nameEn, ar: values.nameAr }),
      reference: values.reference,
      tenderType: values.tenderType,
      agency: values.agency,
      owner: values.owner,
      amount: values.amount,
      currency: values.currency,
      status: values.status,
      statusReason: values.statusReason?.trim() || undefined,
      tags: values.tags,
      dueDate,
      submissionDate,
      description: values.description,

      timeline: [
        {
          id: `activity-${crypto.randomUUID()}`,
          date: new Date().toISOString(),
          actor: user.name,
          description: locale === "ar" ? "تم إنشاء المناقصة" : "Tender created",

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
      proposals: {
        technicalUrl: values.technicalUrl,
        financialUrl: values.financialUrl,
        submittedBy: user.name,
        submittedAt: new Date().toISOString()
      },
      attachments: [],
      links: []
    });
    form.reset();
    setCreateErrors({});

  }, [locale, saveMutation, user.name]);

  const handleEditTender = useCallback(
    (formId: string, tender: Tender) => {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) return;
      const values = readFormValues(form, tender);
      const errors = validateForm(values, locale);
      setEditErrors((prev) => ({ ...prev, [tender.id]: errors }));
      if (Object.keys(errors).length > 0) return;
      const dueDate = values.dueDate ? new Date(values.dueDate).toISOString() : tender.dueDate;
      const submissionDate = values.submissionDate
        ? new Date(values.submissionDate).toISOString()
        : tender.submissionDate;
      const nextTimeline: TenderActivity[] =
        values.status !== tender.status

          ? [
              ...tender.timeline,
              {
                id: `activity-${crypto.randomUUID()}`,
                date: new Date().toISOString(),
                actor: user.name,
                description:
                  locale === "ar"
                    ? `تم تحديث الحالة إلى ${statusLabels[locale][values.status]}`
                    : `Status updated to ${statusLabels[locale][values.status]}`,

                category: "status"
              }
            ]
          : tender.timeline;
      saveMutation.mutate({
        id: tender.id,
        title: combineTitle({ en: values.nameEn, ar: values.nameAr }),
        reference: values.reference,
        tenderType: values.tenderType,
        agency: values.agency,
        owner: values.owner,
        amount: values.amount,
        currency: values.currency,
        status: values.status,
        statusReason: values.statusReason?.trim() || undefined,
        tags: values.tags,
        dueDate,
        submissionDate,
        description: values.description,
        proposals: {
          ...tender.proposals,
          technicalUrl: values.technicalUrl,
          financialUrl: values.financialUrl
        },

        timeline: nextTimeline
      });
    },
    [locale, saveMutation, user.name]
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
          locale === "ar" ? `تم إضافة كراسة ${number}` : `Specification booklet ${number} added`,

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
    if (!selectedTender) return;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const values = readFormValues(form, selectedTender);

    const nextTimeline: TenderActivity[] = [
      ...selectedTender.timeline,
      {
        id: `activity-${crypto.randomUUID()}`,
        date: new Date().toISOString(),
        actor: user.name,
        description: locale === "ar" ? "تم تحديث بيانات العروض" : "Proposal details updated",

        category: "update"
      }
    ];

    saveMutation.mutate({
      id: selectedTender.id,
      amount: values.amount,
      currency: values.currency,
      tags: values.tags,
      proposals: {
        ...selectedTender.proposals,
        technicalUrl: values.technicalUrl,
        financialUrl: values.financialUrl,

        submittedBy: user.name,
        submittedAt: new Date().toISOString()
      },
      timeline: nextTimeline
    });
  };

  const tableData = data ?? [];
  const summary = useMemo(() => statusSummary(tableData), [tableData]);

  const agencies = useMemo(
    () => Array.from(new Set(tableData.map((item) => item.agency).filter(Boolean))),
    [tableData]
  );
  const owners = useMemo(
    () => Array.from(new Set(tableData.map((item) => item.owner).filter(Boolean))),
    [tableData]
  );
  const tagOptions = useMemo(
    () => Array.from(new Set(tableData.flatMap((item) => item.tags))).filter(Boolean),
    [tableData]
  );

  const filterDefinitions = useMemo(() => {
    return [

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
      },
      {
        id: "agency",
        label: t("agency"),
        options: agencies.map((agency) => ({ value: agency, label: agency }))
      },
      {
        id: "owner",
        label: t("owner"),
        options: owners.map((owner) => ({ value: owner, label: owner }))
      },
      {
        id: "tags",
        label: t("tags"),
        options: tagOptions.map((tag) => ({ value: tag, label: tag })),
        getValue: (row: unknown) => (row as Tender).tags
      },
      {
        id: "dueBucket",
        label: locale === "ar" ? "تصنيف الموعد" : "Due bucket",
        options: [
          {
            value: "overdue",
            label: locale === "ar" ? "متأخرة" : "Overdue"
          },
          {
            value: "dueSoon",
            label: locale === "ar" ? "خلال 3 أيام" : "Next 3 days"
          },
          {
            value: "dueThisMonth",
            label: locale === "ar" ? "خلال أسبوعين" : "Within 2 weeks"
          },
          {
            value: "upcoming",
            label: locale === "ar" ? "قادمة" : "Upcoming"
          }
        ],
        getValue: (row: unknown) => getDueCategory(row as Tender)
      }
    ];
  }, [agencies, locale, owners, tagOptions, t]);

  const columnLabels: Record<ColumnId, string> = useMemo(
    () => ({
      reference: t("reference"),
      title: t("name"),
      agency: t("agency"),
      status: t("status"),
      dueDate: t("dueDate"),
      submissionDate: t("submissionDate"),
      amount: t("offerValue"),
      tenderType: t("tenderType"),
      owner: t("owner"),
      tags: t("tags"),
      statusReason: t("statusReason"),
      siteVisit: t("siteVisit"),
      specification: t("specificationBooks"),
      technicalUrl: locale === "ar" ? "العرض الفني" : "Technical offer",
      financialUrl: locale === "ar" ? "العرض المالي" : "Financial offer",
      actions: t("actions")
    }),

    [locale, t]
  );

  const columns: ColumnDef<Tender>[] = useMemo(() => {
    return [
      {
        accessorKey: "reference",
        id: "reference",
        header: columnLabels.reference,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-1" title={row.original.reference}>

            <span className="font-medium text-slate-900">{row.original.reference}</span>
            <p className="text-xs text-slate-500">
              {formatDate(row.original.createdAt, locale) ?? t("notAvailable")}
            </p>
          </div>
        ),
        meta: { label: columnLabels.reference }
      },
      {
        accessorKey: "title",
        id: "title",
        header: columnLabels.title,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-1" title={row.original.title}>
            <p className="font-semibold text-slate-900 line-clamp-2">{row.original.title}</p>
            <p className="text-xs text-slate-500 line-clamp-2">{row.original.description}</p>
          </div>
        ),
        meta: { label: columnLabels.title }
      },
      {
        accessorKey: "agency",
        id: "agency",
        header: columnLabels.agency,
        cell: ({ row }) => <span title={row.original.agency}>{row.original.agency}</span>,
        meta: { label: columnLabels.agency }
      },
      {
        accessorKey: "status",
        id: "status",
        header: columnLabels.status,
        cell: ({ row }) => (
          <div className="space-y-1" title={row.original.statusReason}>
            <Badge variant={statusBadgeVariant[row.original.status]}>
              {statusLabels[locale][row.original.status]}
            </Badge>
            {row.original.statusReason ? (
              <p className="text-xs text-slate-500 line-clamp-2">{row.original.statusReason}</p>
            ) : null}
          </div>
        ),
        meta: { label: columnLabels.status }
      },
      {
        accessorKey: "dueDate",
        id: "dueDate",
        header: columnLabels.dueDate,

        cell: ({ row }) => (
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-900">
              {formatDate(row.original.dueDate, locale) ?? t("notAvailable")}
            </span>
            <span className="text-xs text-slate-500">
              {formatDate(row.original.submissionDate, locale) ?? t("notAvailable")}
            </span>
          </div>
        ),
        meta: { label: columnLabels.dueDate }
      },
      {
        accessorKey: "submissionDate",
        id: "submissionDate",
        header: columnLabels.submissionDate,
        cell: ({ row }) => (
          <span>{formatDate(row.original.submissionDate, locale) ?? t("notAvailable")}</span>
        ),
        meta: { label: columnLabels.submissionDate }
      },
      {
        accessorKey: "amount",
        id: "amount",
        header: columnLabels.amount,

        cell: ({ row }) => (
          <span className="font-medium text-slate-900">
            {formatCurrency(row.original.amount, row.original.currency, locale)}
          </span>
        ),
        meta: { label: columnLabels.amount }
      },
      {
        accessorKey: "tenderType",
        id: "tenderType",
        header: columnLabels.tenderType,
        cell: ({ row }) => (
          <Badge variant="info">{typeLabels[locale][row.original.tenderType]}</Badge>
        ),
        meta: { label: columnLabels.tenderType }
      },
      {
        accessorKey: "owner",
        id: "owner",
        header: columnLabels.owner,
        cell: ({ row }) => <span title={row.original.owner}>{row.original.owner}</span>,
        meta: { label: columnLabels.owner }
      },
      {
        accessorKey: "tags",
        id: "tags",
        header: columnLabels.tags,

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
        ),
        meta: { label: columnLabels.tags }
      },
      {
        accessorKey: "statusReason",
        id: "statusReason",
        header: columnLabels.statusReason,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600 line-clamp-2" title={row.original.statusReason}>
            {row.original.statusReason || t("notAvailable")}
          </span>
        ),
        meta: { label: columnLabels.statusReason }
      },
      {
        id: "siteVisit",
        header: columnLabels.siteVisit,

        cell: ({ row }) => {
          const visit = row.original.siteVisit;
          if (!visit) {
            return <span className="text-xs text-slate-400">{t("siteVisitPending")}</span>;
          }
          return (
            <div className="space-y-1" title={visit.notes ?? undefined}>

              <Badge variant={visit.completed ? "success" : "warning"}>
                {formatDate(visit.date ?? undefined, locale) ?? t("notAvailable")}
              </Badge>
              <p className="text-xs text-slate-500">{visit.assignee ?? t("siteVisitAssignee")}</p>
            </div>
          );
        },
        meta: { label: columnLabels.siteVisit }
      },
      {
        id: "specification",
        header: columnLabels.specification,
        cell: ({ row }) => (
          <Badge variant={row.original.specificationBooks.some((book) => book.purchaseDate) ? "success" : "danger"}>
            {row.original.specificationBooks.some((book) => book.purchaseDate)
              ? locale === "ar"
                ? "تم الشراء"
                : "Purchased"
              : locale === "ar"
                ? "لم تشتر"
                : "Not purchased"}
          </Badge>
        ),
        meta: { label: columnLabels.specification }
      },
      {
        id: "technicalUrl",
        header: columnLabels.technicalUrl,
        cell: ({ row }) => (
          row.original.proposals.technicalUrl ? (
            <a
              href={row.original.proposals.technicalUrl}
              className="text-primary hover:underline"
            >
              {t("open")}
            </a>
          ) : (
            <span className="text-xs text-slate-400">{t("notAvailable")}</span>
          )
        ),
        meta: { label: columnLabels.technicalUrl }
      },
      {
        id: "financialUrl",
        header: columnLabels.financialUrl,
        cell: ({ row }) => (
          row.original.proposals.financialUrl ? (
            <a
              href={row.original.proposals.financialUrl}
              className="text-primary hover:underline"
            >
              {t("open")}
            </a>
          ) : (
            <span className="text-xs text-slate-400">{t("notAvailable")}</span>
          )
        ),
        meta: { label: columnLabels.financialUrl }
      },
      {
        id: "actions",
        header: columnLabels.actions,
        enableHiding: false,
        cell: ({ row }) => {
          const tender = row.original;
          const formId = `edit-${tender.id}`;
          const { en, ar } = splitTitle(tender.title);
          const errors = editErrors[tender.id] ?? {};
          return (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedTender(tender);
                  setDrawerOpen(true);
                }}

              >
                {t("view")}
              </Button>
              {can(["admin", "procurement"]) ? (
                <ModalForm
                  title={t("edit")}
                  trigger={<Button size="sm">{t("edit")}</Button>}
                  onSubmit={() => handleEditTender(formId, tender)}
                >
                  <form id={formId} className="space-y-6">
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {locale === "ar" ? "الأساسيات" : "Basics"}
                      </h3>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("reference")} *
                          </label>
                          <Input name="reference" defaultValue={tender.reference} required />
                          {errors.reference ? (
                            <p className="text-xs text-red-500">{errors.reference}</p>
                          ) : null}
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600">
                            {locale === "ar" ? "الجهة" : "Agency"} *
                          </label>
                          <Input name="agency" defaultValue={tender.agency} required />
                          {errors.agency ? (
                            <p className="text-xs text-red-500">{errors.agency}</p>
                          ) : null}
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600">
                            {locale === "ar" ? "الاسم (En)" : "Name (En)"} *
                          </label>
                          <Input name="nameEn" defaultValue={en} />
                          {errors.nameEn ? (
                            <p className="text-xs text-red-500">{errors.nameEn}</p>
                          ) : (
                            <p className="text-xs text-slate-400">
                              {locale === "ar"
                                ? "اكتب الاسم بالإنجليزية وسيتم عرضه مع العربي"
                                : "Provide the English title; Arabic will be joined automatically."}
                            </p>
                          )}
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600">
                            {locale === "ar" ? "الاسم (ع)" : "Name (Ar)"}
                          </label>
                          <Input name="nameAr" defaultValue={ar} dir="rtl" />
                        </div>
                        <div className="col-span-12 md:col-span-4">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("tenderType")}
                          </label>
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
                        </div>
                        <div className="col-span-12 md:col-span-4">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("owner")}
                          </label>
                          <Input name="owner" defaultValue={tender.owner} />
                          {errors.owner ? (
                            <p className="text-xs text-red-500">{errors.owner}</p>
                          ) : null}
                        </div>
                        <div className="col-span-12 md:col-span-4">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("status")}
                          </label>
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
                      </div>
                    </section>
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {locale === "ar" ? "التواريخ" : "Dates"}
                      </h3>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("dueDate")} *
                          </label>
                          <Input name="dueDate" type="date" defaultValue={tender.dueDate.slice(0, 10)} />
                          {errors.dueDate ? (
                            <p className="text-xs text-red-500">{errors.dueDate}</p>
                          ) : null}
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("submissionDate")} *
                          </label>
                          <Input
                            name="submissionDate"
                            type="date"
                            defaultValue={tender.submissionDate.slice(0, 10)}
                          />
                          {errors.submissionDate ? (
                            <p className="text-xs text-red-500">{errors.submissionDate}</p>
                          ) : null}
                        </div>
                      </div>
                    </section>
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {locale === "ar" ? "القيمة" : "Value"}
                      </h3>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6 lg:col-span-4">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("offerValue")}
                          </label>
                          <Input name="amount" type="number" defaultValue={tender.amount} />
                          {errors.amount ? (
                            <p className="text-xs text-red-500">{errors.amount}</p>
                          ) : null}
                        </div>
                        <div className="col-span-12 md:col-span-6 lg:col-span-4">
                          <label className="block text-xs font-semibold text-slate-600">
                            {locale === "ar" ? "العملة" : "Currency"}
                          </label>
                          <Input name="currency" defaultValue={tender.currency} />
                        </div>
                      </div>
                    </section>
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {locale === "ar" ? "الروابط" : "Links"}
                      </h3>
                      <Input
                        name="technicalUrl"
                        defaultValue={tender.proposals.technicalUrl ?? ""}
                        placeholder={locale === "ar" ? "رابط العرض الفني" : "Technical offer link"}
                      />
                      <Input
                        name="financialUrl"
                        defaultValue={tender.proposals.financialUrl ?? ""}
                        placeholder={locale === "ar" ? "رابط العرض المالي" : "Financial offer link"}
                      />
                    </section>
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {t("notes")}
                      </h3>
                      <Textarea name="description" defaultValue={tender.description} rows={3} />
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("tags")}
                          </label>
                          <Input
                            name="tags"
                            defaultValue={tender.tags.join(", ")}
                            placeholder={t("tagsPlaceholder")}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <label className="block text-xs font-semibold text-slate-600">
                            {t("statusReason")}
                          </label>
                          <Textarea name="statusReason" defaultValue={tender.statusReason ?? ""} rows={2} />
                          {errors.statusReason ? (
                            <p className="text-xs text-red-500">{errors.statusReason}</p>
                          ) : (
                            <p className="text-xs text-slate-400">
                              {locale === "ar"
                                ? "سبب الحالة إلزامي عند تحديد خسارة أو إلغاء"
                                : "Required when status is Lost or Cancelled."}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>
                  </form>
                </ModalForm>
              ) : null}
            </div>
          );
        },
        meta: { label: columnLabels.actions }
      }
    ];
  }, [columnLabels, editErrors, handleEditTender, locale, t, can]);

  const pinnedColumns = useMemo(
    () =>
      direction === "rtl"
        ? { right: ["reference", "title"], left: ["actions"] }
        : { left: ["reference", "title"], right: ["actions"] },
    [direction]
  );

  const presets: ColumnPreset[] = useMemo(
    () => [
      {
        id: "minimal",
        label: locale === "ar" ? "أساسي" : "Minimal",
        columns: ["reference", "title", "agency", "status", "dueDate", "actions"]
      },
      {
        id: "financial",
        label: locale === "ar" ? "مالي" : "Financial",
        columns: [
          "reference",
          "title",
          "agency",
          "status",
          "dueDate",
          "amount",
          "owner",
          "actions"
        ]
      },
      {
        id: "dates",
        label: locale === "ar" ? "مواعيد" : "Dates",
        columns: [
          "reference",
          "title",
          "dueDate",
          "submissionDate",
          "siteVisit",
          "status",
          "actions"
        ]
      },
      {
        id: "ops",
        label: locale === "ar" ? "تشغيل" : "Ops",
        columns: [
          "reference",
          "title",
          "owner",
          "tags",
          "statusReason",
          "status",
          "actions"
        ]
      }
    ],
    [locale]
  );

  const handleRowClick = (row: Tender) => {
    setSelectedTender(row);
    setDrawerOpen(true);
  };

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
            <form id="tender-form" className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "الأساسيات" : "Basics"}
                </h3>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("reference")} *
                    </label>
                    <Input name="reference" required />
                    {createErrors.reference ? (
                      <p className="text-xs text-red-500">{createErrors.reference}</p>
                    ) : null}
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600">
                      {locale === "ar" ? "الجهة" : "Agency"} *
                    </label>
                    <Input name="agency" required />
                    {createErrors.agency ? (
                      <p className="text-xs text-red-500">{createErrors.agency}</p>
                    ) : null}
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600">
                      {locale === "ar" ? "الاسم (En)" : "Name (En)"} *
                    </label>
                    <Input name="nameEn" />
                    {createErrors.nameEn ? (
                      <p className="text-xs text-red-500">{createErrors.nameEn}</p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        {locale === "ar"
                          ? "أدخل الاسم بالإنجليزية وسيتم دمجه مع العربية"
                          : "Provide the English title to pair with Arabic."}
                      </p>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600">
                      {locale === "ar" ? "الاسم (ع)" : "Name (Ar)"}
                    </label>
                    <Input name="nameAr" dir="rtl" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("tenderType")}
                    </label>
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
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("owner")}
                    </label>
                    <Input name="owner" />
                    {createErrors.owner ? (
                      <p className="text-xs text-red-500">{createErrors.owner}</p>
                    ) : null}
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("status")}
                    </label>
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
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "التواريخ" : "Dates"}
                </h3>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("dueDate")} *
                    </label>
                    <Input name="dueDate" type="date" />
                    {createErrors.dueDate ? (
                      <p className="text-xs text-red-500">{createErrors.dueDate}</p>
                    ) : null}
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("submissionDate")} *
                    </label>
                    <Input name="submissionDate" type="date" />
                    {createErrors.submissionDate ? (
                      <p className="text-xs text-red-500">{createErrors.submissionDate}</p>
                    ) : null}
                  </div>
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "القيمة" : "Value"}
                </h3>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-6 lg:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("offerValue")}
                    </label>
                    <Input name="amount" type="number" />
                    {createErrors.amount ? (
                      <p className="text-xs text-red-500">{createErrors.amount}</p>
                    ) : null}
                  </div>
                  <div className="col-span-12 md:col-span-6 lg:col-span-4">
                    <label className="block text-xs font-semibold text-slate-600">
                      {locale === "ar" ? "العملة" : "Currency"}
                    </label>
                    <Input name="currency" defaultValue="USD" />
                  </div>
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {locale === "ar" ? "الملفات والروابط" : "Files & links"}
                </h3>
                <Input
                  name="technicalUrl"
                  placeholder={locale === "ar" ? "رابط العرض الفني" : "Technical offer link"}
                />
                <Input
                  name="financialUrl"
                  placeholder={locale === "ar" ? "رابط العرض المالي" : "Financial offer link"}
                />
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  {t("notes")}
                </h3>
                <Textarea name="description" rows={3} />
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("tags")}
                    </label>
                    <Input name="tags" placeholder={t("tagsPlaceholder")} />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600">
                      {t("statusReason")}
                    </label>
                    <Textarea name="statusReason" rows={2} />
                    {createErrors.statusReason ? (
                      <p className="text-xs text-red-500">{createErrors.statusReason}</p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        {locale === "ar"
                          ? "سبب الحالة إلزامي عند تحديد خسارة أو إلغاء"
                          : "Required when status is Lost or Cancelled."}
                      </p>
                    )}
                  </div>
                </div>
              </section>

            </form>
          </ModalForm>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{locale === "ar" ? "جميع المناقصات" : "All tenders"}</CardTitle>
            <CardDescription>{locale === "ar" ? "إجمالي المسجلة" : "Registered tenders"}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{locale === "ar" ? "الملغاة" : "Cancelled"}</CardTitle>
            <CardDescription>{locale === "ar" ? "حالات تم إيقافها" : "No longer pursued"}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-red-500">{summary.cancelled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{locale === "ar" ? "الفائزة" : "Won"}</CardTitle>
            <CardDescription>{locale === "ar" ? "العطاءات الناجحة" : "Awarded tenders"}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-600">{summary.won}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{locale === "ar" ? "الخاسرة" : "Lost"}</CardTitle>
            <CardDescription>{locale === "ar" ? "غير ناجحة" : "Unsuccessful"}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-600">{summary.lost}</p>
          </CardContent>
        </Card>
      </div>


      <AdvancedDataTable
        data={tableData}
        columns={columns}
        isLoading={isLoading}
        error={isError ? t("error") : null}
        searchableKeys={["reference", "title", "agency", "owner", "tags"]}
        filterDefinitions={filterDefinitions}
        onExportCsv={(rows, visibleColumns) =>
          exportTendersCsv({ rows, visibleColumns, locale }).then((csv) => {
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "tenders.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          })
        }
        emptyState={<div className="text-sm text-slate-500">{t("noResults")}</div>}
        onRowClick={handleRowClick}
        viewStorageKey={viewStorageKey}
        columnPresets={presets}
        defaultColumnVisibility={defaultVisibility}
        defaultPinnedColumns={pinnedColumns}
      />

      <TenderDetailsDrawer
        tender={selectedTender}
        open={drawerOpen && Boolean(selectedTender)}
        onOpenChange={setDrawerOpen}
        locale={locale}
        direction={direction}
        onAddSpecification={handleAddSpecificationBook}
        onUpdateProposal={handleProposalsUpdate}
        onUploadAttachments={(files) =>
          selectedTender ? attachmentMutation.mutate({ tenderId: selectedTender.id, files }) : undefined
        }
        canManage={can(["admin", "procurement"])}
        userName={user.name}
      />

    </div>
  );
}
