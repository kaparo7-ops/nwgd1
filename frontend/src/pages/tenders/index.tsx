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
import { Tabs } from "@/components/ui/tabs";
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

type CreateTenderStep =
  | "basics"
  | "dates"
  | "siteVisit"
  | "attachments"
  | "specification"
  | "quote";

type SpecificationDraft = {
  number: string;
  purchased: boolean;
  purchaseDate: string;
  method: string;
  cost: string;
  currency: string;
  responsible: string;
  file: File | null;
};

type CreateTenderState = {
  reference: string;
  nameEn: string;
  nameAr: string;
  tenderType: TenderType;
  agency: string;
  owner: string;
  status: TenderStatus;
  statusReason: string;
  dueDate: string;
  submissionDate: string;
  amount: string;
  currency: string;
  tagsText: string;
  description: string;
  technicalUrl: string;
  financialUrl: string;
  siteVisit: {
    required: boolean;
    completed: boolean;
    date: string;
    assignee: string;
    notes: string;
    photos: Attachment[];
  };
  attachments: Attachment[];
  specificationBooks: SpecificationBook[];
  specDraft: SpecificationDraft;
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

const createStepOrder: CreateTenderStep[] = [
  "basics",
  "dates",
  "siteVisit",
  "attachments",
  "specification",
  "quote"
];

const createStepFieldMap: Record<CreateTenderStep, (keyof TenderFormValues)[]> = {
  basics: ["reference", "agency", "nameEn", "nameAr", "tenderType", "owner", "status", "statusReason", "tags"],
  dates: ["dueDate", "submissionDate"],
  siteVisit: [],
  attachments: [],
  specification: [],
  quote: ["amount", "currency", "description", "technicalUrl", "financialUrl"]
};

const createInitialState = (userName: string): CreateTenderState => ({
  reference: "",
  nameEn: "",
  nameAr: "",
  tenderType: "RFP",
  agency: "",
  owner: "",
  status: "preparing",
  statusReason: "",
  dueDate: "",
  submissionDate: "",
  amount: "",
  currency: "USD",
  tagsText: "",
  description: "",
  technicalUrl: "",
  financialUrl: "",
  siteVisit: {
    required: false,
    completed: false,
    date: "",
    assignee: "",
    notes: "",
    photos: []
  },
  attachments: [],
  specificationBooks: [],
  specDraft: {
    number: "",
    purchased: false,
    purchaseDate: "",
    method: "",
    cost: "",
    currency: "USD",
    responsible: userName,
    file: null
  }
});

const stateToFormValues = (state: CreateTenderState): TenderFormValues => {
  const amountValue = Number(state.amount);
  return {
    reference: state.reference,
    nameEn: state.nameEn,
    nameAr: state.nameAr,
    tenderType: state.tenderType,
    agency: state.agency,
    owner: state.owner,
    status: state.status,
    statusReason: state.statusReason,
    dueDate: state.dueDate,
    submissionDate: state.submissionDate,
    amount: Number.isNaN(amountValue) ? 0 : amountValue,
    currency: state.currency,
    tags: parseTags(state.tagsText, []),
    description: state.description,
    technicalUrl: state.technicalUrl.trim() || undefined,
    financialUrl: state.financialUrl.trim() || undefined
  };
};

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
  const [newSpecificationPurchased, setNewSpecificationPurchased] = useState(false);

  useEffect(() => {
    if (!tender) return;
    setNewSpecificationPurchased(false);
  }, [tender?.id]);
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
                {tender.specificationBooks.filter((book) => book.purchased).length}/
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
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">{t("siteVisit")}</h3>
                  {tender.siteVisit ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={tender.siteVisit.required ? "info" : "default"}>
                        {tender.siteVisit.required
                          ? locale === "ar"
                            ? "مطلوبة"
                            : "Required"
                          : locale === "ar"
                            ? "اختيارية"
                            : "Optional"}
                      </Badge>
                      <Badge variant={tender.siteVisit.completed ? "success" : "warning"}>
                        {tender.siteVisit.completed
                          ? locale === "ar"
                            ? "مكتملة"
                            : "Completed"
                          : locale === "ar"
                            ? "قيد التنفيذ"
                            : "Pending"}
                      </Badge>
                    </div>
                  ) : null}
                </div>
                {tender.siteVisit ? (
                  <>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>{formatDate(tender.siteVisit.date, locale) ?? t("notAvailable")}</p>
                      <p>
                        {t("siteVisitAssignee")} : {tender.siteVisit.assignee ?? t("notAvailable")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {tender.siteVisit.notes ?? t("siteVisitNotes")}
                      </p>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-slate-600">
                        {locale === "ar" ? "صور الزيارة" : "Site visit photos"}
                      </h4>
                      {tender.siteVisit.photos.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {tender.siteVisit.photos.map((photo) => (
                            <div
                              key={photo.id}
                              className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-700">{photo.fileName}</p>
                                <p className="text-xs text-slate-400">
                                  {(photo.fileSize / 1024 / 1024).toFixed(1)} MB · {photo.uploader}
                                </p>
                              </div>
                              <Badge variant="info">{formatDate(photo.uploadedAt, locale) ?? ""}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-slate-400">
                          {locale === "ar" ? "لا توجد صور مرفوعة" : "No photos uploaded"}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">{t("siteVisitPending")}</p>
                )}
              </div>

              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">{t("specificationBooks")}</h3>
                  {canManage ? (
                    <ModalForm
                      title={t("addSpecificationBook")}
                      trigger={
                        <Button size="sm" onClick={() => setNewSpecificationPurchased(false)}>{t("addSpecificationBook")}</Button>
                      }
                      onSubmit={() => onAddSpecification(`spec-book-${tender.id}`)}
                    >
                      <form id={`spec-book-${tender.id}`} className="space-y-4">
                        <section className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700">
                            {locale === "ar" ? "تفاصيل الكراسة" : "Booklet details"}
                          </h4>
                          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {t("specificationBookPurchasedQuestion")}
                              </p>
                              <p className="text-xs text-slate-500">
                                {t("specificationBookPurchaseHint")}
                              </p>
                            </div>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="purchased"
                                checked={newSpecificationPurchased}
                                onChange={(event) => setNewSpecificationPurchased(event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-slate-700">
                                {newSpecificationPurchased
                                  ? t("specificationBookStatusPurchased")
                                  : t("specificationBookStatusMissing")}
                              </span>
                            </label>
                          </div>
                          <Input name="number" placeholder={t("specificationBookNumber")} required />
                          {newSpecificationPurchased ? (
                            <>
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
                            </>
                          ) : null}
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
                          <Badge variant={book.purchased ? "success" : "danger"}>
                            {book.purchased
                              ? t("specificationBookStatusPurchased")
                              : t("specificationBookStatusMissing")}
                          </Badge>
                        </div>
                        {book.purchased ? (
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
                        ) : null}
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
  const [createValues, setCreateValues] = useState<CreateTenderState>(() => createInitialState(user.name));
  const [activeCreateStep, setActiveCreateStep] = useState<CreateTenderStep>("basics");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const clearFieldError = useCallback((field: keyof TenderFormValues) => {
    setCreateErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const runStepValidation = useCallback(
    (step: CreateTenderStep) => {
      if (createStepFieldMap[step].length === 0) return;
      const values = stateToFormValues(createValues);
      const errors = validateForm(values, locale);
      setCreateErrors((prev) => {
        const next = { ...prev } as TenderFormErrors;
        createStepFieldMap[step].forEach((field) => {
          if (errors[field]) {
            next[field] = errors[field] as string;
          } else {
            delete next[field];
          }
        });
        return next;
      });
    },
    [createValues, locale]
  );

  const handleCreateStepChange = useCallback(
    (stepId: string) => {
      const step = stepId as CreateTenderStep;
      if (step === activeCreateStep) return;
      runStepValidation(activeCreateStep);
      setActiveCreateStep(step);
    },
    [activeCreateStep, runStepValidation]
  );

  const handleAttachmentsSelected = useCallback(
    (files: FileList) => {
      const newAttachments = Array.from(files).map((file) => createAttachmentFromFile(file, user.name));
      setCreateValues((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments]
      }));
      resetSubmissionAttempt();
    },
    [resetSubmissionAttempt, user.name]
  );

  const handleSiteVisitPhotosSelected = useCallback(
    (files: FileList) => {
      const newPhotos = Array.from(files).map((file) => createAttachmentFromFile(file, user.name));
      setCreateValues((prev) => ({
        ...prev,
        siteVisit: {
          ...prev.siteVisit,
          photos: [...prev.siteVisit.photos, ...newPhotos]
        }
      }));
      resetSubmissionAttempt();
    },
    [resetSubmissionAttempt, user.name]
  );

  const handleSiteVisitRequiredChange = useCallback(
    (checked: boolean) => {
      setCreateValues((prev) => ({
        ...prev,
        siteVisit: checked
          ? {
              ...prev.siteVisit,
              required: true,
              assignee: prev.siteVisit.assignee || user.name
            }
          : {
              required: false,
              completed: false,
              date: "",
              assignee: "",
              notes: "",
              photos: []
            }
      }));
      resetSubmissionAttempt();
    },
    [resetSubmissionAttempt, user.name]
  );

  const handleAddSpecificationDraft = useCallback(() => {
    setCreateValues((prev) => {
      const draft = prev.specDraft;
      if (!draft.number.trim()) return prev;
      const costValue = Number(draft.cost);
      const newBook: SpecificationBook = {
        id: `book-${crypto.randomUUID()}`,
        number: draft.number.trim(),
        purchased: draft.purchased,
        purchaseDate:
          draft.purchased && draft.purchaseDate
            ? new Date(draft.purchaseDate).toISOString()
            : null,
        cost: draft.purchased && !Number.isNaN(costValue) ? costValue : 0,
        currency: draft.currency || prev.currency,
        purchaseMethod: draft.purchased ? draft.method : "",
        responsible: draft.purchased ? draft.responsible.trim() || user.name : "",
        attachment:
          draft.purchased && draft.file
            ? createAttachmentFromFile(draft.file, user.name)
            : null
      };
      return {
        ...prev,
        specificationBooks: [...prev.specificationBooks, newBook],
        specDraft: {
          number: "",
          purchased: false,
          purchaseDate: "",
          method: "",
          cost: "",
          currency: prev.currency,
          responsible: draft.responsible.trim() || user.name,
          file: null
        }
      };
    });
    resetSubmissionAttempt();
  }, [resetSubmissionAttempt, user.name]);

  const displayedErrors = useMemo(() => {
    if (submitAttempted) return createErrors;
    const stepFields = new Set(createStepFieldMap[activeCreateStep]);
    const filtered: Partial<Record<keyof TenderFormValues, string>> = {};
    Object.entries(createErrors).forEach(([key, value]) => {
      if (stepFields.has(key as keyof TenderFormValues)) {
        filtered[key as keyof TenderFormValues] = value;
      }
    });
    return filtered;
  }, [submitAttempted, createErrors, activeCreateStep]);

  const resetSubmissionAttempt = useCallback(() => {
    if (submitAttempted) {
      setSubmitAttempted(false);
    }
  }, [submitAttempted]);

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
    const values = stateToFormValues(createValues);
    const errors = validateForm(values, locale);
    setCreateErrors(errors);
    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0) {
      const firstInvalidStep = createStepOrder.find((step) =>
        createStepFieldMap[step].some((field) => errors[field])
      );
      if (firstInvalidStep) {
        setActiveCreateStep(firstInvalidStep);
      }
      return;
    }
    const dueDate = values.dueDate ? new Date(values.dueDate).toISOString() : new Date().toISOString();
    const submissionDate = values.submissionDate
      ? new Date(values.submissionDate).toISOString()
      : dueDate;

    const siteVisitState = createValues.siteVisit;
    const hasSiteVisitDetails =
      siteVisitState.required ||
      siteVisitState.photos.length > 0 ||
      siteVisitState.completed ||
      Boolean(siteVisitState.date) ||
      Boolean(siteVisitState.assignee.trim()) ||
      Boolean(siteVisitState.notes.trim());
    const siteVisit = hasSiteVisitDetails
      ? {
          required: siteVisitState.required,
          completed: siteVisitState.completed,
          photos: siteVisitState.photos,
          date: siteVisitState.date ? new Date(siteVisitState.date).toISOString() : null,
          assignee: siteVisitState.assignee.trim() || undefined,
          notes: siteVisitState.notes.trim() || undefined
        }
      : undefined;

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
      siteVisit,
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
        needsSpecificationPurchase: createValues.specificationBooks.every((book) => !book.purchased),
        siteVisitOverdue: false,
        guaranteeAlert: null
      },
      specificationBooks: createValues.specificationBooks,
      proposals: {
        technicalUrl: values.technicalUrl,
        financialUrl: values.financialUrl,
        submittedBy: user.name,
        submittedAt: new Date().toISOString()
      },
      attachments: createValues.attachments,
      links: []
    });

    setCreateValues(createInitialState(user.name));
    setCreateErrors({});
    setActiveCreateStep("basics");
    setSubmitAttempted(false);
  }, [createValues, locale, saveMutation, user.name]);

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
    const purchased = formData.get("purchased") === "on";
    const costValue = Number(formData.get("cost") ?? 0);
    const currency = String(formData.get("currency") ?? selectedTender.currency);
    const purchaseDateValue = formData.get("purchaseDate");
    const purchaseDate =
      purchased && typeof purchaseDateValue === "string" && purchaseDateValue
        ? new Date(purchaseDateValue).toISOString()
        : null;
    const purchaseMethod = purchased ? String(formData.get("method") ?? "") : "";
    const responsibleValue = String(formData.get("responsible") ?? user.name).trim();
    const responsible = purchased ? responsibleValue || user.name : "";
    const fileInput = form.elements.namedItem("receipt") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    const attachment =
      purchased && file ? createAttachmentFromFile(file, user.name) : null;

    const newBook: SpecificationBook = {
      id: `book-${crypto.randomUUID()}`,
      number,
      purchased,
      purchaseDate,
      cost: purchased && !Number.isNaN(costValue) ? costValue : 0,
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
        needsSpecificationPurchase: nextBooks.every((book) => !book.purchased)
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
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant={visit.required ? "info" : "default"}>
                  {visit.required
                    ? locale === "ar"
                      ? "مطلوبة"
                      : "Required"
                    : locale === "ar"
                      ? "اختيارية"
                      : "Optional"}
                </Badge>
                <Badge variant={visit.completed ? "success" : "warning"}>
                  {visit.completed
                    ? locale === "ar"
                      ? "مكتملة"
                      : "Completed"
                    : locale === "ar"
                      ? "قيد التنفيذ"
                      : "Pending"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {formatDate(visit.date ?? undefined, locale) ?? t("notAvailable")}
              </p>
              <p className="text-xs text-slate-500">{visit.assignee ?? t("siteVisitAssignee")}</p>
              {visit.photos.length > 0 ? (
                <p className="text-xs text-slate-400">
                  {locale === "ar"
                    ? `${visit.photos.length} ${visit.photos.length === 1 ? "صورة" : "صور"}`
                    : `${visit.photos.length} photo${visit.photos.length === 1 ? "" : "s"}`}
                </p>
              ) : null}
            </div>
          );
        },
        meta: { label: columnLabels.siteVisit }
      },
      {
        id: "specification",
        header: columnLabels.specification,
        cell: ({ row }) => (
          <Badge variant={row.original.specificationBooks.some((book) => book.purchased) ? "success" : "danger"}>
            {row.original.specificationBooks.some((book) => book.purchased)
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

  const stepLabels = useMemo(
    () => ({
      basics: locale === "ar" ? "الأساسيات" : "Basics",
      dates: locale === "ar" ? "التواريخ" : "Dates",
      siteVisit: locale === "ar" ? "الزيارة الميدانية" : "Site Visit",
      attachments: locale === "ar" ? "المرفقات" : "Attachments",
      specification: locale === "ar" ? "كراسة المواصفات" : "Specification Book",
      quote: locale === "ar" ? "نموذج التسعير" : "Quote Template"
    }),
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
            <form
              id="tender-form"
              className="flex h-full flex-col"
              onSubmit={(event) => event.preventDefault()}
            >
              <Tabs
                value={activeCreateStep}
                onValueChange={handleCreateStepChange}
                tabs={[
                  {
                    id: "basics",
                    label: stepLabels.basics,
                    content: (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {t("reference")} *
                          </label>
                          <Input
                            value={createValues.reference}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, reference: event.target.value }));
                              clearFieldError("reference");
                              resetSubmissionAttempt();
                            }}
                          />
                          {displayedErrors.reference ? (
                            <p className="text-xs text-red-500">{displayedErrors.reference}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {locale === "ar" ? "الجهة" : "Agency"} *
                          </label>
                          <Input
                            value={createValues.agency}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, agency: event.target.value }));
                              clearFieldError("agency");
                              resetSubmissionAttempt();
                            }}
                          />
                          {displayedErrors.agency ? (
                            <p className="text-xs text-red-500">{displayedErrors.agency}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {locale === "ar" ? "الاسم (En)" : "Name (En)"} *
                          </label>
                          <Input
                            value={createValues.nameEn}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, nameEn: event.target.value }));
                              clearFieldError("nameEn");
                              resetSubmissionAttempt();
                            }}
                          />
                          {displayedErrors.nameEn ? (
                            <p className="text-xs text-red-500">{displayedErrors.nameEn}</p>
                          ) : (
                            <p className="text-xs text-slate-400">
                              {locale === "ar"
                                ? "أدخل الاسم بالإنجليزية وسيتم دمجه مع العربية"
                                : "Provide the English title to pair with Arabic."}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {locale === "ar" ? "الاسم (ع)" : "Name (Ar)"}
                          </label>
                          <Input
                            value={createValues.nameAr}
                            dir="rtl"
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, nameAr: event.target.value }));
                              clearFieldError("nameAr");
                              clearFieldError("nameEn");
                              resetSubmissionAttempt();
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {t("tenderType")}
                          </label>
                          <select
                            value={createValues.tenderType}
                            onChange={(event) => {
                              setCreateValues((prev) => ({
                                ...prev,
                                tenderType: event.target.value as TenderType
                              }));
                              clearFieldError("tenderType");
                              resetSubmissionAttempt();
                            }}
                            className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                          >
                            {tenderTypeOptions.map((type) => (
                              <option key={type} value={type}>
                                {typeLabels[locale][type]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">{t("owner")}</label>
                          <Input
                            value={createValues.owner}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, owner: event.target.value }));
                              clearFieldError("owner");
                              resetSubmissionAttempt();
                            }}
                          />
                          {displayedErrors.owner ? (
                            <p className="text-xs text-red-500">{displayedErrors.owner}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">{t("status")}</label>
                          <select
                            value={createValues.status}
                            onChange={(event) => {
                              const nextStatus = event.target.value as TenderStatus;
                              setCreateValues((prev) => ({ ...prev, status: nextStatus }));
                              clearFieldError("status");
                              if (nextStatus !== "lost" && nextStatus !== "cancelled") {
                                clearFieldError("statusReason");
                              }
                              resetSubmissionAttempt();
                            }}
                            className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[locale][status]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-full space-y-2">
                          <label className="text-xs font-semibold text-slate-600">{t("statusReason")}</label>
                          <Textarea
                            rows={2}
                            value={createValues.statusReason}
                            onChange={(event) => {
                              const value = event.target.value;
                              setCreateValues((prev) => ({ ...prev, statusReason: value }));
                              clearFieldError("statusReason");
                              resetSubmissionAttempt();
                            }}
                          />
                          {displayedErrors.statusReason ? (
                            <p className="text-xs text-red-500">{displayedErrors.statusReason}</p>
                          ) : (
                            <p className="text-xs text-slate-400">
                              {locale === "ar"
                                ? "سبب الحالة إلزامي عند تحديد خسارة أو إلغاء"
                                : "Required when status is Lost or Cancelled."}
                            </p>
                          )}
                        </div>
                        <div className="col-span-full space-y-2">
                          <label className="text-xs font-semibold text-slate-600">{t("tags")}</label>
                          <Input
                            value={createValues.tagsText}
                            placeholder={t("tagsPlaceholder")}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, tagsText: event.target.value }));
                              resetSubmissionAttempt();
                            }}
                          />
                        </div>
                      </div>
                    )
                  },
                  {
                    id: "dates",
                    label: stepLabels.dates,
                    content: (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {t("dueDate")} *
                          </label>
                          <Input
                            type="date"
                            value={createValues.dueDate}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, dueDate: event.target.value }));
                              clearFieldError("dueDate");
                              resetSubmissionAttempt();
                            }}
                          />
                          {displayedErrors.dueDate ? (
                            <p className="text-xs text-red-500">{displayedErrors.dueDate}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {t("submissionDate")} *
                          </label>
                          <Input
                            type="date"
                            value={createValues.submissionDate}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, submissionDate: event.target.value }));
                              clearFieldError("submissionDate");
                              resetSubmissionAttempt();
                            }}
                          />
                          {displayedErrors.submissionDate ? (
                            <p className="text-xs text-red-500">{displayedErrors.submissionDate}</p>
                          ) : null}
                        </div>
                      </div>
                    )
                  },
                  {
                    id: "siteVisit",
                    label: stepLabels.siteVisit,
                    content: (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {locale === "ar" ? "هل الزيارة الميدانية مطلوبة؟" : "Is a site visit required?"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {locale === "ar"
                                ? "فعّل التتبع لإضافة الموعد والمكلف ورفع الصور الداعمة."
                                : "Enable tracking to capture the schedule, assignee, and supporting photos."}
                            </p>
                          </div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={createValues.siteVisit.required}
                              onChange={(event) => handleSiteVisitRequiredChange(event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-slate-700">
                              {createValues.siteVisit.required
                                ? locale === "ar"
                                  ? "مفعّل"
                                  : "Enabled"
                                : locale === "ar"
                                  ? "غير مفعّل"
                                  : "Disabled"}
                            </span>
                          </label>
                        </div>
                        {createValues.siteVisit.required ? (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600">{t("siteVisit")}</label>
                              <Input
                                type="date"
                                value={createValues.siteVisit.date}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    siteVisit: { ...prev.siteVisit, date: value }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600">{t("siteVisitAssignee")}</label>
                              <Input
                                value={createValues.siteVisit.assignee}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    siteVisit: { ...prev.siteVisit, assignee: value }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                            <div className="col-span-full space-y-2">
                              <label className="text-xs font-semibold text-slate-600">{t("siteVisitNotes")}</label>
                              <Textarea
                                rows={3}
                                value={createValues.siteVisit.notes}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    siteVisit: { ...prev.siteVisit, notes: value }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                            <div className="col-span-full flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={createValues.siteVisit.completed}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    siteVisit: { ...prev.siteVisit, completed: checked }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-slate-700">
                                {locale === "ar" ? "تمت الزيارة" : "Visit completed"}
                              </span>
                            </div>
                            <div className="col-span-full">
                              <FileUploader
                                attachments={createValues.siteVisit.photos}
                                onFilesSelected={handleSiteVisitPhotosSelected}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">
                            {locale === "ar"
                              ? "اترك هذا القسم مغلقاً إذا لم تكن هناك زيارة ميدانية مطلوبة."
                              : "Leave this section disabled if no site visit is required."}
                          </p>
                        )}
                      </div>
                    )
                  },
                  {
                    id: "attachments",
                    label: stepLabels.attachments,
                    content: (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="col-span-full">
                          <FileUploader
                            attachments={createValues.attachments}
                            onFilesSelected={handleAttachmentsSelected}
                          />
                        </div>
                      </div>
                    )
                  },
                  {
                    id: "specification",
                    label: stepLabels.specification,
                    content: (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="col-span-full flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {t("specificationBookPurchasedQuestion")}
                            </p>
                            <p className="text-xs text-slate-500">
                              {t("specificationBookPurchaseHint")}
                            </p>
                          </div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="purchased"
                              checked={createValues.specDraft.purchased}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                setCreateValues((prev) => ({
                                  ...prev,
                                  specDraft: checked
                                    ? {
                                        ...prev.specDraft,
                                        purchased: true,
                                        responsible: prev.specDraft.responsible || user.name
                                      }
                                    : {
                                        ...prev.specDraft,
                                        purchased: false,
                                        purchaseDate: "",
                                        method: "",
                                        cost: "",
                                        file: null
                                      }
                                }));
                                resetSubmissionAttempt();
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-slate-700">
                              {createValues.specDraft.purchased
                                ? t("specificationBookStatusPurchased")
                                : t("specificationBookStatusMissing")}
                            </span>
                          </label>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {t("specificationBookNumber")}
                          </label>
                          <Input
                            value={createValues.specDraft.number}
                            onChange={(event) => {
                              const value = event.target.value;
                              setCreateValues((prev) => ({
                                ...prev,
                                specDraft: { ...prev.specDraft, number: value }
                              }));
                              resetSubmissionAttempt();
                            }}
                          />
                        </div>
                        {createValues.specDraft.purchased ? (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600">
                                {locale === "ar" ? "تاريخ الشراء" : "Purchase date"}
                              </label>
                              <Input
                                type="date"
                                value={createValues.specDraft.purchaseDate}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    specDraft: { ...prev.specDraft, purchaseDate: value }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600">
                                {t("specificationBookMethod")}
                              </label>
                              <Input
                                value={createValues.specDraft.method}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    specDraft: { ...prev.specDraft, method: value }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600">
                                {t("specificationBookCost")}
                              </label>
                              <Input
                                type="number"
                                value={createValues.specDraft.cost}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    specDraft: { ...prev.specDraft, cost: value }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600">
                                {locale === "ar" ? "العملة" : "Currency"}
                              </label>
                              <Input
                                value={createValues.specDraft.currency}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    specDraft: { ...prev.specDraft, currency: value }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-slate-600">
                                {t("specificationBookResponsible")}
                              </label>
                              <Input
                                value={createValues.specDraft.responsible}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    specDraft: { ...prev.specDraft, responsible: value }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                            <div className="col-span-full space-y-2">
                              <label className="text-xs font-semibold text-slate-600">
                                {t("specificationBookReceipt")}
                              </label>
                              <Input
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={(event) => {
                                  const file = event.target.files?.[0] ?? null;
                                  setCreateValues((prev) => ({
                                    ...prev,
                                    specDraft: { ...prev.specDraft, file }
                                  }));
                                  resetSubmissionAttempt();
                                }}
                              />
                            </div>
                          </>
                        ) : null}
                        <div className="col-span-full flex justify-end">
                          <Button type="button" onClick={handleAddSpecificationDraft}>
                            {t("addSpecificationBook")}
                          </Button>
                        </div>
                        <div className="col-span-full space-y-3">
                          {createValues.specificationBooks.length === 0 ? (
                            <p className="text-xs text-slate-500">{t("specificationBookStatusMissing")}</p>
                          ) : (
                            createValues.specificationBooks.map((book) => (
                              <div key={book.id} className="rounded-2xl border border-dashed border-border p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">{book.number}</p>
                                    <p className="text-xs text-slate-500">
                                      {formatDate(book.purchaseDate ?? undefined, locale) ?? t("notAvailable")}
                                    </p>
                                  </div>
                                  <Badge variant={book.purchased ? "success" : "danger"}>
                                    {book.purchased
                                      ? t("specificationBookStatusPurchased")
                                      : t("specificationBookStatusMissing")}
                                  </Badge>
                                </div>
                                {book.purchased ? (
                                  <div className="mt-2 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                                    <span>
                                      {t("specificationBookCost")}: {formatCurrency(book.cost, book.currency, locale)}
                                    </span>
                                    <span>
                                      {t("specificationBookResponsible")}: {book.responsible}
                                    </span>
                                    <span>{t("specificationBookMethod")}: {book.purchaseMethod}</span>
                                    {book.attachment ? (
                                      <span>{book.attachment.fileName}</span>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  },
                  {
                    id: "quote",
                    label: stepLabels.quote,
                    content: (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">{t("offerValue")}</label>
                          <Input
                            type="number"
                            value={createValues.amount}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, amount: event.target.value }));
                              clearFieldError("amount");
                              resetSubmissionAttempt();
                            }}
                          />
                          {displayedErrors.amount ? (
                            <p className="text-xs text-red-500">{displayedErrors.amount}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-600">
                            {locale === "ar" ? "العملة" : "Currency"}
                          </label>
                          <Input
                            value={createValues.currency}
                            onChange={(event) => {
                              const value = event.target.value;
                              setCreateValues((prev) => ({
                                ...prev,
                                currency: value,
                                specDraft: { ...prev.specDraft, currency: value }
                              }));
                              clearFieldError("currency");
                              resetSubmissionAttempt();
                            }}
                          />
                        </div>
                        <div className="col-span-full space-y-2">
                          <Input
                            value={createValues.technicalUrl}
                            placeholder={locale === "ar" ? "رابط العرض الفني" : "Technical offer link"}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, technicalUrl: event.target.value }));
                              clearFieldError("technicalUrl");
                              resetSubmissionAttempt();
                            }}
                          />
                        </div>
                        <div className="col-span-full space-y-2">
                          <Input
                            value={createValues.financialUrl}
                            placeholder={locale === "ar" ? "رابط العرض المالي" : "Financial offer link"}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, financialUrl: event.target.value }));
                              clearFieldError("financialUrl");
                              resetSubmissionAttempt();
                            }}
                          />
                        </div>
                        <div className="col-span-full space-y-2">
                          <label className="text-xs font-semibold text-slate-600">{t("notes")}</label>
                          <Textarea
                            rows={3}
                            value={createValues.description}
                            onChange={(event) => {
                              setCreateValues((prev) => ({ ...prev, description: event.target.value }));
                              clearFieldError("description");
                              resetSubmissionAttempt();
                            }}
                          />
                        </div>
                      </div>
                    )
                  }
                ]}
              />
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
